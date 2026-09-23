import { test, expect } from "@playwright/test";
import type { Page, Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { openAnalysis, mockAnalysis } from "./helpers/analysis";
const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/report.json", import.meta.url), "utf8"),
);
const report = JSON.parse(
  readFileSync(
    new URL("../../fixtures/api/report.json", import.meta.url),
    "utf8",
  ),
);
const accepted = JSON.parse(
  readFileSync(
    new URL("../../fixtures/api/accepted.json", import.meta.url),
    "utf8",
  ),
);
const completed = JSON.parse(
  readFileSync(
    new URL("../../fixtures/api/completed.json", import.meta.url),
    "utf8",
  ),
);
const failed = JSON.parse(
  readFileSync(
    new URL("../../fixtures/api/failed.json", import.meta.url),
    "utf8",
  ),
);
const evidenceBefore = JSON.parse(
  readFileSync(
    new URL("../../fixtures/api/evidence-before.json", import.meta.url),
    "utf8",
  ),
);
const evidenceAfter = JSON.parse(
  readFileSync(
    new URL("../../fixtures/api/evidence-after.json", import.meta.url),
    "utf8",
  ),
);

const nav = (page: Page, name: string) =>
  page
    .getByRole("navigation", { name: "Основная навигация" })
    .getByRole("button", { name, exact: true });
const activeSources = (pending: Route[]) =>
  pending.filter((route) => !route.request().failure());
async function settleMotion(page: Page) {
  await page.evaluate(async () => {
    await Promise.allSettled(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished),
    );
  });
}
async function upload(page: Page) {
  await page.goto("/");
  await page.getByLabel("Файлы до изменений", { exact: true }).setInputFiles({
    name: "before.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Отдел А готовит отчёт."),
  });
  await page
    .getByLabel("Файлы после изменений", { exact: true })
    .setInputFiles({
      name: "after.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Отдел Б готовит отчёт."),
    });
}

async function reportWithPendingSources(page: Page, pending: Route[]) {
  await page.route("http://127.0.0.1:8000/**", (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === "POST")
      return route.fulfill({ status: 202, json: accepted });
    if (path.endsWith("/report")) return route.fulfill({ json: report });
    if (path.includes("/evidence/")) {
      pending.push(route);
      return;
    }
    return route.fulfill({ json: completed });
  });
  await upload(page);
  await page
    .getByRole("button", { name: "Сравнить документы", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Вся картина изменений" }),
  ).toBeVisible();
  await nav(page, "Сравнение").click();
}

test("slow sources show skeletons, failure clears them and retry recovers", async ({
  page,
}) => {
  const pending: Route[] = [];
  await reportWithPendingSources(page, pending);
  await page.getByRole("button", { name: "Источники m1", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Загрузка источников…");
  await expect(page.locator(".evidence-skeleton")).toHaveCount(2);
  await expect(page.locator(".source-content")).toHaveAttribute(
    "aria-busy",
    "true",
  );
  await expect(page.locator(".inspector blockquote")).toHaveCount(0);
  await expect.poll(() => activeSources(pending).length).toBe(2);
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page
      .locator(".skeleton-block")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  for (const route of pending.splice(0)) await route.abort("failed");
  await expect(page.locator(".inspector").getByRole("alert")).toContainText(
    "Сервер не ответил",
  );
  await expect(page.locator(".evidence-skeleton")).toHaveCount(0);
  await expect(page.locator(".source-content")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await page.getByRole("button", { name: "Повторить загрузку" }).click();
  await expect(page.locator(".evidence-skeleton")).toHaveCount(2);
  await expect.poll(() => activeSources(pending).length).toBe(2);
  for (const route of pending.splice(0)) {
    await route.fulfill({
      json: route.request().url().includes("doc-001")
        ? evidenceBefore
        : evidenceAfter,
    });
  }
  await expect(page.locator(".inspector blockquote")).toHaveText([
    evidenceBefore.quote,
    evidenceAfter.quote,
  ]);
  await expect(page.locator(".evidence-skeleton")).toHaveCount(0);
  await expect(page.locator(".source-content")).toHaveAttribute(
    "aria-busy",
    "false",
  );
});

test("switching sources ignores late responses and returns focus to the latest row", async ({
  page,
}) => {
  const pending: Route[] = [];
  await reportWithPendingSources(page, pending);
  await page.getByRole("tab", { name: /Реестр функций/ }).click();
  const first = page.locator("tbody .table-link").nth(0);
  const second = page.locator("tbody .table-link").nth(1);
  await first.click();
  await expect.poll(() => activeSources(pending).length).toBe(1);
  const oldSource = activeSources(pending)[0];
  await second.click();
  await expect
    .poll(() =>
      activeSources(pending).some((r) => r.request().url().includes("doc-002")),
    )
    .toBe(true);
  await expect(page.locator("tbody tr").nth(1)).toHaveClass("selected-row");
  await expect(page.locator("tbody tr").nth(0)).not.toHaveClass("selected-row");
  await expect(page.locator(".inspector blockquote")).toHaveCount(0);
  const newSource = activeSources(pending).find((r) =>
    r.request().url().includes("doc-002"),
  )!;
  await newSource.fulfill({ json: evidenceAfter });
  await expect(page.locator(".inspector blockquote")).toHaveText([
    evidenceAfter.quote,
  ]);
  await oldSource.fulfill({ json: evidenceBefore });
  await expect(page.locator(".inspector blockquote")).toHaveText([
    evidenceAfter.quote,
  ]);
  await page.keyboard.press("Escape");
  await expect(page.locator(".inspector")).toHaveCount(0);
  await expect(second).toBeFocused();
});

test("new selection cancels an unfinished close and selected states follow each view", async ({
  page,
}) => {
  await openAnalysis(page);
  await nav(page, "Сравнение").click();
  await page.getByRole("button", { name: "Источники m1", exact: true }).click();
  await expect(page.locator(".inspector blockquote")).not.toHaveCount(0);
  // Two actions in consecutive tasks, before the 160 ms exit can complete.
  await page.evaluate(() => {
    document
      .querySelector<HTMLButtonElement>('[aria-label="Закрыть источники"]')!
      .click();
    setTimeout(() => {
      const next = document.querySelector<HTMLButtonElement>(
        '[aria-label="Источники m2"]',
      )!;
      next.focus();
      next.click();
    }, 0);
  });
  await expect(page.locator(".inspector blockquote").first()).toHaveText(
    fixture.evidence["B-FUN-02"].quote,
  );
  // Finish pending motion before checking that the old close did not remove the new selection.
  await page.locator(".inspector").evaluate(async (el) => {
    await Promise.allSettled(el.getAnimations().map((a) => a.finished));
  });
  await expect(page.locator("tbody .selected-row")).toContainText("Архивный");
  await expect(page.locator(".inspector")).toBeVisible();
  await page
    .getByRole("button", { name: "Закрыть источники", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Источники m2", exact: true }),
  ).toBeFocused();
  await page.getByRole("tab", { name: /Подразделения/ }).click();
  await page.locator("tbody .table-link").first().click();
  await expect(page.locator("tbody tr").first()).toHaveClass("selected-row");
  await nav(page, "Обзор").click();
  await page.locator(".focus-row").first().click();
  await expect(page.locator(".focus-row").first()).toHaveClass(/selected-row/);
  await nav(page, "Замечания 3").click();
  await page
    .getByRole("button", { name: "Проверить основания" })
    .first()
    .click();
  await expect(page.locator(".finding-card").first()).toHaveClass(/chosen/);
});

test("reduced motion disables transitions and mobile drawer keeps keyboard focus", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await openAnalysis(page);
  await page.getByRole("button", { name: "Открыть меню" }).click();
  await nav(page, "Сравнение").click();
  const trigger = page.getByRole("button", {
    name: "Источники m1",
    exact: true,
  });
  await trigger.click();
  const panel = page.locator(".inspector");
  await expect(panel).toBeFocused();
  await expect(panel.locator("blockquote")).not.toHaveCount(0);
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  await page.keyboard.press("Shift+Tab");
  await expect(panel.locator("button, summary").last()).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Закрыть источники", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("server journey, exact evidence, search, registry, units and JSON download", async ({
  page,
}) => {
  const apiCalls: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/")) apiCalls.push(r.url());
  });
  await openAnalysis(page);
  await nav(page, "Сравнение").click();
  await expect(page.locator("tbody tr")).toHaveCount(7);
  await page.getByLabel("Фильтр сравнения").selectOption("preserved");
  await expect(page.locator("tbody tr")).toHaveCount(4);
  await page.getByLabel("Фильтр сравнения").selectOption("all");
  await page.getByLabel("Поиск в сравнении").fill("Архивный");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Источники m2", exact: true }).click();
  await expect(page.locator(".inspector blockquote").first()).toHaveText(
    fixture.evidence["B-FUN-02"].quote,
  );
  await page.locator(".inspector summary").first().click();
  await expect(page.locator(".inspector .context").first()).toContainText(
    "[B-FUN-02]",
  );
  await page.keyboard.press("Escape");
  await expect(page.locator(".inspector")).toHaveCount(0);
  await page.getByRole("tab", { name: /Подразделения/ }).click();
  await expect(page.locator("tbody tr")).toHaveCount(6);
  await page.getByRole("tab", { name: /Реестр функций/ }).click();
  await expect(page.locator("tbody tr")).toHaveCount(15);
  await page.getByLabel("Фильтр сравнения").selectOption("after");
  await expect(page.locator("tbody tr")).toHaveCount(8);
  await nav(page, "Замечания 3").click();
  await page.getByLabel("Тип замечания").selectOption("possible_duplication");
  await expect(page.locator(".finding-card")).toHaveCount(1);
  await nav(page, "Заключение").click();
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Скачать отчёт JSON" })
    .first()
    .click();
  const file = await downloaded;
  expect(file.suggestedFilename()).toBe(
    "org-review-11111111111111111111111111111111.json",
  );
  const json = JSON.parse(readFileSync((await file.path())!, "utf8"));
  expect(json.provenance).toContain("Ответ backend");
  expect(json.findings).toHaveLength(3);
  expect(apiCalls.some((url) => url.endsWith("/report"))).toBe(true);
  expect(apiCalls.some((url) => url.includes("/evidence/"))).toBe(true);
});

test("uploads validate type, empty file, size and count; valid files enable analysis directly", async ({
  page,
}) => {
  await page.goto("/");
  const before = page.getByLabel("Файлы до изменений", { exact: true });
  await before.setInputFiles({
    name: "bad.exe",
    mimeType: "application/octet-stream",
    buffer: Buffer.from("bad"),
  });
  await expect(page.getByRole("alert")).toContainText("используйте PDF");
  await before.setInputFiles({
    name: "empty.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.alloc(0),
  });
  await expect(page.getByRole("alert")).toContainText("файл пуст");
  await before.setInputFiles({
    name: "large.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
  });
  await expect(page.getByRole("alert")).toContainText("превышает");
  await before.setInputFiles(
    Array.from({ length: 6 }, (_, i) => ({
      name: `${i}.txt`,
      mimeType: "text/plain",
      buffer: Buffer.from("test"),
    })),
  );
  await expect(page.getByRole("alert")).toContainText("не более 5");
  await before.setInputFiles({
    name: "valid.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("test"),
  });
  await page
    .getByLabel("Файлы после изменений", { exact: true })
    .setInputFiles({
      name: "after.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("test"),
    });
  await expect(
    page.getByRole("button", { name: "Сравнить документы", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Удалить valid.txt" }).click();
  await expect(page.getByText("valid.txt", { exact: true })).toHaveCount(0);
});

test("partial coverage is visible and downgrades loss to insufficient evidence", async ({
  page,
}) => {
  await openAnalysis(page, "partial");
  await expect(
    page.getByText("Анализ неполный", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".focus-row")).toContainText([
    "Недостаточно данных",
    "Возможный дубль",
    "Потенциальный конфликт",
  ]);
  await nav(page, "Документы").click();
  await expect(
    page.getByRole("heading", { name: "Приложение_скан.pdf" }),
  ).toBeVisible();
  await expect(page.getByText("Не прочитан", { exact: true })).toBeVisible();
});

test("server failure can recover without showing a fabricated successful report", async ({
  page,
}) => {
  await openAnalysis(page, "failed");
  await expect(page.getByRole("alert")).toContainText(
    "Сервис анализа недоступен",
  );
  await expect(
    page.getByRole("heading", { name: "Вся картина изменений" }),
  ).toHaveCount(0);
  await mockAnalysis(page);
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Вся картина изменений" }),
  ).toBeVisible();
});

test("empty result and unmatched search have actionable states", async ({
  page,
}) => {
  await openAnalysis(page, "empty");
  await nav(page, "Сравнение").click();
  await expect(
    page.getByRole("heading", { name: "Совпадений нет" }),
  ).toBeVisible();
  await nav(page, "Заключение").click();
  await expect(page.getByText("Рекомендации не сформированы.")).toBeVisible();
});

test("HTTP r1 adapter: multipart, polling, report, encoded evidence and safe text", async ({
  page,
}) => {
  let posts = 0;
  const keys: string[] = [];
  let polls = 0;
  const sources: string[] = [];
  await page.route("http://127.0.0.1:8000/**", async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname;
    if (req.method() === "POST") {
      posts++;
      keys.push(req.headers()["idempotency-key"]);
      expect(req.postDataBuffer()?.toString()).toContain('name="before_files"');
      expect(req.postDataBuffer()?.toString()).toContain('name="after_files"');
      return route.fulfill({ status: 202, json: accepted });
    }
    if (path.endsWith("/report")) return route.fulfill({ json: report });
    if (path.includes("/evidence/")) {
      sources.push(path);
      return route.fulfill({
        json: path.includes("doc-001")
          ? { ...evidenceBefore, quote: '<script>alert("unsafe")</script>' }
          : evidenceAfter,
      });
    }
    polls++;
    return route.fulfill({
      json: {
        ...completed,
        status: polls > 1 ? "completed" : "running",
        stage: polls > 1 ? "reporting" : "extracting",
      },
    });
  });
  await upload(page);
  await page
    .getByRole("button", { name: "Сравнить документы", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Вся картина изменений" }),
  ).toBeVisible();
  expect(posts).toBe(1);
  expect(keys[0]).toMatch(/^[\da-f-]{36}$/);
  await page
    .getByRole("button", { name: /Уточнить назначение отчёта/ })
    .click();
  await expect(page.locator(".inspector blockquote").first()).toHaveText(
    '<script>alert("unsafe")</script>',
  );
  expect(sources.every((s) => s.includes("%3A"))).toBeTruthy();
  await expect(page.locator(".inspector script")).toHaveCount(0);
});

test("network retry reuses key and preserves selected files", async ({
  page,
}) => {
  const keys: string[] = [];
  await page.route("http://127.0.0.1:8000/**", async (route) => {
    if (route.request().method() === "POST") {
      keys.push(route.request().headers()["idempotency-key"]);
      return route.abort("failed");
    }
    return route.abort();
  });
  await upload(page);
  await page
    .getByRole("button", { name: "Сравнить документы", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Сервер не ответил");
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Сервер не ответил");
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);
  await expect(
    page.getByRole("button", { name: "Удалить before.txt" }),
  ).toBeVisible();
});

test("background failure is shown and a deliberate rerun creates a new key", async ({
  page,
}) => {
  const keys: string[] = [];
  await page.route("http://127.0.0.1:8000/**", async (route) => {
    if (route.request().method() === "POST") {
      keys.push(route.request().headers()["idempotency-key"]);
      return route.fulfill({ status: 202, json: accepted });
    }
    return route.fulfill({ json: failed });
  });
  await upload(page);
  await page
    .getByRole("button", { name: "Сравнить документы", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Время анализа истекло");
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Время анализа истекло");
  expect(keys).toHaveLength(2);
  expect(keys[0]).not.toBe(keys[1]);
});

test("malformed server response never renders as success", async ({ page }) => {
  await page.route("http://127.0.0.1:8000/**", (r) =>
    r.fulfill({ json: { invalid: true } }),
  );
  await upload(page);
  await page
    .getByRole("button", { name: "Сравнить документы", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("контракту r1");
  await expect(
    page.getByRole("heading", { name: "Вся картина изменений" }),
  ).toHaveCount(0);
});

test("mobile layout, menu and source drawer", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openAnalysis(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Открыть меню" }).click();
  await nav(page, "Сравнение").click();
  await page.getByRole("button", { name: "Источники m1", exact: true }).click();
  await expect(
    page.getByRole("complementary", { name: "Проверка по источнику" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page
    .getByRole("button", { name: "Закрыть источники", exact: true })
    .click();
  await expect(page.locator(".inspector")).toHaveCount(0);
});

test("test fixture quotes match source files exactly", async () => {
  for (const e of Object.values(fixture.evidence) as Array<{
    version: string;
    evidence_id: string;
    quote: string;
  }>) {
    const original = readFileSync(
      `tests/fixtures/documents/${e.version}.md`,
      "utf8",
    );
    expect(original).toContain(`[${e.evidence_id}] ${e.quote}`);
  }
  for (const finding of fixture.report.findings)
    for (const id of finding.evidence_ids)
      expect(fixture.evidence).toHaveProperty(id);
});

test("accessibility: start and comparison with inspector", async ({ page }) => {
  await page.goto("/");
  await settleMotion(page);
  const start = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    start.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  ).toEqual([]);
  await openAnalysis(page);
  await expect(
    page.getByRole("heading", { name: "Вся картина изменений" }),
  ).toBeVisible();
  for (const screen of ["Обзор", "Документы", "Замечания 3", "Заключение"]) {
    await nav(page, screen).click();
    await settleMotion(page);
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect
      .soft(
        audit.violations.map((v) => ({
          screen,
          id: v.id,
          nodes: v.nodes.map((n) => ({
            target: n.target,
            summary: n.failureSummary,
          })),
        })),
      )
      .toEqual([]);
  }
  await nav(page, "Сравнение").click();
  await page.getByRole("button", { name: "Источники m1", exact: true }).click();
  await expect(page.locator(".inspector blockquote")).not.toHaveCount(0);
  await settleMotion(page);
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  ).toEqual([]);
});

for (const [section, heading] of [
  ["Обзор", "Обзор анализа"],
  ["Документы", "Документы"],
  ["Сравнение", "Матрица соответствий"],
  ["Замечания", "Замечания"],
  ["Заключение", "Заключение"],
]) {
  test(`first visit: ${section} opens directly without starting analysis`, async ({
    page,
  }) => {
    const apiCalls: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/api/")) apiCalls.push(r.url());
    });
    await page.goto("/");
    await expect(nav(page, section)).toBeEnabled();
    await nav(page, section).click();
    await expect(
      page.getByRole("heading", { name: heading, level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Отчёт ещё не получен" }),
    ).toBeVisible();
    await expect(page.locator(".document-strip, .export-button")).toHaveCount(
      0,
    );
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(apiCalls).toEqual([]);
  });
}

test("only real analysis is available and navigation returns to the selected documents", async ({
  page,
}) => {
  const calls: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/")) calls.push(r.url());
  });
  await upload(page);
  await expect(
    page.getByRole("button", {
      name: /^(Демо|Сервер|Открыть пример|Посмотреть демопример)$/,
    }),
  ).toHaveCount(0);
  await expect(page.locator("#scenario, .demo-card, .mode-switch")).toHaveCount(
    0,
  );
  for (const section of [
    "Обзор",
    "Документы",
    "Сравнение",
    "Замечания",
    "Заключение",
  ]) {
    await nav(page, section).click();
    await expect(
      page.getByRole("heading", { name: "Отчёт ещё не получен" }),
    ).toBeVisible();
    await expect(page.locator(".document-strip, .export-button")).toHaveCount(
      0,
    );
  }
  await page
    .getByRole("button", { name: "Загрузить документы", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Удалить before.txt" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Удалить after.txt" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Сравнить документы", exact: true }),
  ).toBeEnabled();
  expect(calls).toEqual([]);
});
