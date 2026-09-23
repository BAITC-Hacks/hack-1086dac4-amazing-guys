import { expect, test } from "@playwright/test";
import { openAnalysis } from "./helpers/analysis";
import AxeBuilder from "@axe-core/playwright";

test("guest entry preserves files, makes no API calls and survives reload", async ({
  page,
}) => {
  const apiCalls: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/")) apiCalls.push(request.url());
  });
  await page.goto("/");
  await expect(page).toHaveTitle("Kontur — organizational intelligence");
  await expect(page.locator(".brand")).toContainText("Kontur");
  await expect(page.locator(".brand small")).toHaveText(
    "organizational intelligence",
  );
  await page.getByLabel("Файлы до изменений", { exact: true }).setInputFiles({
    name: "before.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Документ до изменений"),
  });
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Войти в Kontur" });
  const enter = dialog.getByRole("button", { name: "Войти как гость" });
  await expect(enter).toBeFocused();
  await enter.click();
  await expect(dialog.getByRole("status")).toHaveText(
    "Подготовка гостевого режима…",
  );
  await expect(
    dialog.getByRole("button", { name: "Открываем пространство…" }),
  ).toBeDisabled();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Гость", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Удалить before.txt" }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Основная навигация" })
    .getByRole("button", { name: "Сравнение", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Отчёт ещё не получен" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Гость", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Гость", exact: true }).click();
  await page
    .getByRole("button", { name: "Продолжить работу", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(apiCalls).toEqual([]);
});

test("closing entry cancels loading and Escape does not dismiss underlying sources", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await page.getByRole("button", { name: "Войти как гость" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  // Wait past the entry transition to detect an uncancelled timer.
  await page.waitForTimeout(800);
  await expect(
    page.getByRole("button", { name: "Войти", exact: true }),
  ).toBeFocused();
  expect(
    await page.evaluate(() => sessionStorage.getItem("kontur.guest")),
  ).toBeNull();
  await openAnalysis(page);
  await page
    .getByRole("navigation", { name: "Основная навигация" })
    .getByRole("button", { name: "Сравнение", exact: true })
    .click();
  await page.getByRole("button", { name: "Источники m1", exact: true }).click();
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".inspector")).toBeVisible();
});

test("mobile guest dialog is accessible with reduced motion and blocked storage", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    Object.defineProperty(window, "sessionStorage", {
      get() {
        throw new DOMException("Storage unavailable", "SecurityError");
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  expect(
    await dialog.evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Закрыть окно входа" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Войти как гость" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Войти как гость" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Гость", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
