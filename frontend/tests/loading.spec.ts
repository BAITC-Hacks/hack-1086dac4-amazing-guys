import { test, expect } from "@playwright/test";
import type { Page, Route } from "@playwright/test";
import { openAnalysis } from "./helpers/analysis";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";

const fixture = (name: string) =>
  JSON.parse(
    readFileSync(
      new URL(`../../fixtures/api/${name}.json`, import.meta.url),
      "utf8",
    ),
  );
const accepted = fixture("accepted");
const completed = fixture("completed");
const report = fixture("report");

async function selectFiles(page: Page) {
  for (const [label, name] of [
    ["до", "before"],
    ["после", "after"],
  ]) {
    await page
      .getByLabel(`Файлы ${label} изменений`, { exact: true })
      .setInputFiles({
        name: `${name}.txt`,
        mimeType: "text/plain",
        buffer: Buffer.from("Отдел готовит отчёт."),
      });
  }
}

test("file preparation prevents early submission, stays local and respects reduced motion", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/")) requests.push(r.url());
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 100));
  await selectFiles(page);
  await expect(page.locator('.upload-box[aria-busy="true"]')).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: "Готовим файлы…" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Удалить before.txt" }),
  ).toBeDisabled();
  await expect(page.locator(".file-list")).not.toContainText([
    "Готов к отправке",
    "Готов к отправке",
  ]);
  expect(
    await page
      .locator(".upload-icon .spin")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  await page.screenshot({
    path: "/private/tmp/kontur-file-loading.png",
    fullPage: true,
  });
  expect(requests).toEqual([]);
  await page.clock.runFor(600);
  await expect(page.locator('.upload-box[aria-busy="true"]')).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Сравнить документы", exact: true }),
  ).toBeEnabled();
  await expect(page.locator(".file-list")).toContainText([
    "Готов к отправке",
    "Готов к отправке",
  ]);
  await page.getByRole("button", { name: "Удалить before.txt" }).click();
  await expect(
    page.getByRole("button", { name: "Сравнить документы", exact: true }),
  ).toBeDisabled();
  expect(requests).toEqual([]);
});

test("loading follows upload and server result; cancellation preserves files and reuses the analysis", async ({
  page,
}) => {
  const uploads: Route[] = [];
  const reports: Route[] = [];
  let postCount = 0;
  await page.route("http://127.0.0.1:8000/**", (route) => {
    if (route.request().method() === "POST") {
      postCount++;
      uploads.push(route);
      return;
    }
    if (route.request().url().endsWith("/report")) {
      reports.push(route);
      return;
    }
    return route.fulfill({ json: completed });
  });
  await page.goto("/");
  await selectFiles(page);
  await page
    .getByRole("button", { name: "Сравнить документы", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAccessibleName("Отправляем документы");
  await expect.poll(() => uploads.length).toBe(1);
  await expect(dialog.locator(".stage-list .done")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.screenshot({
    path: "/private/tmp/kontur-processing-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations.map((v) => v.id)).toEqual([]);
  await uploads[0].fulfill({ status: 202, json: accepted });
  await expect(dialog).toHaveAccessibleName("Открываем результат");
  await expect.poll(() => reports.length).toBe(1);
  await expect(
    page.getByRole("heading", { name: "Вся картина изменений" }),
  ).toHaveCount(0);
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 100));
  await reports[0].fulfill({ json: report });
  await page.getByRole("button", { name: "Остановить ожидание" }).click();
  await page.clock.runFor(1000);
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Вся картина изменений" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Удалить before.txt" }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Сравнить документы", exact: true })
    .click();
  await expect.poll(() => reports.length).toBe(2);
  await reports[1].fulfill({ json: report });
  // The finishing transition remains abortable after the report arrives.
  await page.clock.resume();
  await expect(
    page.getByRole("heading", { name: "Вся картина изменений" }),
  ).toBeVisible();
  await expect(dialog).toHaveCount(0);
  expect(postCount).toBe(1);
});

test("both export buttons share loading and rapid clicks produce one complete download", async ({
  page,
}) => {
  const downloads: string[] = [];
  page.on("download", (d) => downloads.push(d.suggestedFilename()));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openAnalysis(page);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Заключение", exact: true })
    .click();
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 100));
  // Two clicks in the same turn also exercise the guard before React rerenders.
  await page
    .locator(".export-button")
    .evaluateAll((buttons) =>
      buttons.forEach((button) => (button as HTMLButtonElement).click()),
    );
  const pending = page.getByRole("button", { name: "Готовим отчёт…" });
  await expect(pending).toHaveCount(2);
  for (const button of await pending.all()) {
    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute("aria-busy", "true");
  }
  expect(downloads).toEqual([]);
  const downloaded = page.waitForEvent("download");
  await page.clock.runFor(400);
  const file = await downloaded;
  const data = JSON.parse(readFileSync((await file.path())!, "utf8"));
  expect(data.provenance).toContain("Ответ backend");
  expect(data.function_matches).toHaveLength(7);
  await expect(
    page.getByRole("button", { name: "Скачать отчёт JSON" }).first(),
  ).toBeEnabled();
  await page.clock.runFor(1000);
  expect(downloads).toHaveLength(1);
});
