import { test, expect } from "@playwright/test";
import { openAnalysis } from "./helpers/analysis";
import type { Page } from "@playwright/test";

async function openFindingReview(page: Page) {
  await openAnalysis(page);
  await page.locator(".nav-item").nth(3).click();
  await expect(page.locator(".finding-card").first()).toBeVisible();
  await page.locator(".finding-card .text-button").first().click();
  await expect(page.locator(".human-review")).toBeVisible();
  return page.locator(".human-review").first();
}

test("saves a decision and restores it after close and browser reload", async ({
  page,
}) => {
  const review = await openFindingReview(page);
  await review.locator('input[type="radio"][value="confirmed"]').check();
  await review
    .locator("textarea")
    .fill("Подтверждено по приведённому основанию");
  await review.locator(".human-review__save").click();
  await expect(review.locator(".human-review__local-note")).toContainText(
    "сохранено в этом браузере",
  );
  await expect(review.locator(".human-review__status")).toContainText(
    "Подтверждено",
  );

  await page.keyboard.press("Escape");
  await expect(page.locator(".human-review")).toHaveCount(0);
  await page.locator(".finding-card .text-button").first().click();
  await expect(
    page.locator('.human-review input[value="confirmed"]'),
  ).toBeChecked();
  await expect(page.locator(".human-review textarea")).toHaveValue(
    "Подтверждено по приведённому основанию",
  );

  await page.reload();
  await openAnalysis(page);
  await page.locator(".nav-item").nth(3).click();
  await expect(page.locator(".finding-card").first()).toBeVisible();
  await page.locator(".finding-card .text-button").first().click();
  await expect(
    page.locator('.human-review input[value="confirmed"]'),
  ).toBeChecked();
});

test("shows a dirty draft and does not claim it was saved", async ({
  page,
}) => {
  const review = await openFindingReview(page);
  await review.locator('input[type="radio"][value="rejected"]').check();
  await expect(review.locator(".human-review__local-note")).toContainText(
    "Есть несохранённые изменения",
  );
  await expect(review.locator(".human-review__status")).toContainText(
    "Есть несохранённые изменения",
  );
  await expect(review.locator(".human-review__local-note")).not.toContainText(
    "сохранено в этом браузере",
  );
});

test("keeps the same finding id isolated between analysis keys", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    const key = ["kontur:human-review:v1", "another-analysis", "C2", "current"]
      .map(encodeURIComponent)
      .join(":");
    localStorage.setItem(
      key,
      JSON.stringify({
        decision: "confirmed",
        comment: "Другой анализ",
        updatedAt: new Date().toISOString(),
      }),
    );
  });
  const review = await openFindingReview(page);
  await expect(review.locator('input[value="unreviewed"]')).toBeChecked();
  await expect(review.locator(".human-review__status")).toContainText(
    "не сохранено",
  );
});

test("reports quota failure without claiming a save, then reset removes a saved result", async ({
  page,
}) => {
  const review = await openFindingReview(page);
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("quota", "QuotaExceededError");
    };
  });
  await review.locator('input[value="confirmed"]').check();
  await review.locator(".human-review__save").click();
  await expect(review.locator(".human-review__error")).toContainText(
    "Не удалось сохранить",
  );
  await expect(review.locator(".human-review__local-note")).not.toContainText(
    "сохранено в этом браузере",
  );

  await page.reload();
  const freshReview = await openFindingReview(page);
  await freshReview.locator('input[value="confirmed"]').check();
  await freshReview.locator(".human-review__save").click();
  await expect(freshReview.locator(".human-review__reset")).toBeVisible();
  await freshReview.locator(".human-review__reset").click();
  await expect(freshReview.locator(".human-review__local-note")).toContainText(
    "пока не сохранено",
  );
});
