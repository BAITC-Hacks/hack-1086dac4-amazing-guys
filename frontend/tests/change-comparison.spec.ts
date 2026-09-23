import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const reportFixture = JSON.parse(
  readFileSync(new URL("../../fixtures/api/report.json", import.meta.url), "utf8"),
);
const accepted = JSON.parse(
  readFileSync(new URL("../../fixtures/api/accepted.json", import.meta.url), "utf8"),
);
const completed = JSON.parse(
  readFileSync(new URL("../../fixtures/api/completed.json", import.meta.url), "utf8"),
);

type Evidence = {
  evidence_id: string;
  document_id: string;
  version: "before" | "after";
  document_name: string;
  locator: { kind: "paragraph"; section: string | null; paragraph_index: number; page: null; sheet: null; cell_range: null };
  quote: string;
  context: string;
  extraction_warning: null;
};

const evidence = (
  id: string,
  version: Evidence["version"],
  quote: string,
  context = "Проверяемый контекст документа.",
): Evidence => ({
  evidence_id: id,
  document_id: version === "before" ? `${id}-before` : `${id}-after`,
  version,
  document_name: `${version}.txt`,
  locator: { kind: "paragraph", section: "Раздел 1", paragraph_index: 1, page: null, sheet: null, cell_range: null },
  quote,
  context,
  extraction_warning: null,
});

async function prepare(page: Page, evidences: Evidence[]) {
  const report = structuredClone(reportFixture);
  report.function_matches[0].evidence_ids = evidences.map((item) => item.evidence_id);
  report.functions[0].evidence_ids = evidences.filter((item) => item.version === "before").map((item) => item.evidence_id);
  report.functions[1].evidence_ids = evidences.filter((item) => item.version === "after").map((item) => item.evidence_id);
  const byId = new Map(evidences.map((item) => [item.evidence_id, item]));
  await page.route("http://127.0.0.1:8000/**", (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === "POST") return route.fulfill({ status: 202, json: accepted });
    if (path.endsWith("/report")) return route.fulfill({ json: report });
    if (path.includes("/evidence/")) {
      const id = decodeURIComponent(path.split("/evidence/")[1]);
      return route.fulfill({ json: byId.get(id) });
    }
    return route.fulfill({ json: completed });
  });
  await page.goto("/");
  if (await page.getByRole("button", { name: "Открыть меню", exact: true }).isVisible()) {
    await page.getByRole("button", { name: "Открыть меню", exact: true }).click();
  }
  await page.getByRole("button", { name: "Сервер", exact: true }).click();
  await page.getByLabel("Файлы до изменений", { exact: true }).setInputFiles({
    name: "before.txt", mimeType: "text/plain", buffer: Buffer.from("до"),
  });
  await page.getByLabel("Файлы после изменений", { exact: true }).setInputFiles({
    name: "after.txt", mimeType: "text/plain", buffer: Buffer.from("после"),
  });
  await page.getByRole("button", { name: "Сравнить документы", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Вся картина изменений" })).toBeVisible();
  if (await page.getByRole("button", { name: "Открыть меню", exact: true }).isVisible()) {
    await page.getByRole("button", { name: "Открыть меню", exact: true }).click();
  }
  await page.getByRole("navigation", { name: "Основная навигация" }).getByRole("button", { name: "Сравнение", exact: true }).click();
  await page.getByRole("button", { name: /Источники m1/ }).click();
  await expect(page.locator(".inspector blockquote").first()).toBeVisible();
  await page.getByRole("button", { name: "Сравнить цитаты рядом", exact: true }).click();
  await expect(page.locator(".change-comparison")).toBeVisible();
}

test("one-to-one card preserves Cyrillic whitespace and highlights only the added word", async ({ page }) => {
  const before = "Обязанность:\n  подготовить отчёт";
  const after = "Обязанность:\n  подготовить итоговый отчёт";
  await prepare(page, [evidence("one-before", "before", before), evidence("one-after", "after", after)]);
  const card = page.locator(".change-comparison");
  await expect(card.locator("blockquote").nth(0)).toHaveText(before);
  await expect(card.locator("blockquote").nth(1)).toHaveText(after);
  await expect(card.locator("mark.change-diff-added")).toHaveText("итоговый");
  await expect(card.locator("mark.change-diff-removed")).toHaveCount(0);
  await card.locator("summary").first().click();
  await expect(card.locator(".change-comparison-context p").first()).toContainText("Проверяемый контекст");
});

test("multiple sources remain neutral and the card has no horizontal mobile overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const items = [
    evidence("multi-before-a", "before", "Первая цитата"),
    evidence("multi-before-b", "before", "Вторая цитата"),
    evidence("multi-after-a", "after", "Первая новая цитата"),
    evidence("multi-after-b", "after", "Вторая новая цитата"),
  ];
  await prepare(page, items);
  const card = page.locator(".change-comparison");
  await expect(card.locator(".change-comparison-note")).toContainText("нескольких источников");
  await expect(card.locator("mark")).toHaveCount(0);
  await expect(card.locator("blockquote")).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("oversized quotes stay exact and neutral instead of marking the whole text", async ({ page }) => {
  const before = "слово ".repeat(1_700).trim();
  const after = `${before} добавлено`;
  await prepare(page, [evidence("long-before", "before", before), evidence("long-after", "after", after)]);
  const card = page.locator(".change-comparison");
  await expect(card.locator(".change-comparison-note")).toContainText("слишком большие");
  await expect(card.locator("mark")).toHaveCount(0);
  await expect(card.locator("blockquote").nth(0)).toHaveText(before);
  await expect(card.locator("blockquote").nth(1)).toHaveText(after);
});
