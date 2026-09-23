import { expect, type Page } from "@playwright/test";
import { fileURLToPath } from "node:url";
import {
  fixtureEvidence,
  fixtureReport,
  type ReportScenario,
} from "../fixtures/reports";

// Test-only HTTP responses: every UI result goes through the production API client.
export async function mockAnalysis(
  page: Page,
  scenario: ReportScenario = "complete",
) {
  const report = fixtureReport(scenario);
  report.analysis_id =
    scenario === "partial"
      ? "11111111111111111111111111111112"
      : scenario === "empty"
        ? "11111111111111111111111111111113"
        : "11111111111111111111111111111111";
  await page.route("http://127.0.0.1:8000/**", (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === "POST")
      return route.fulfill({
        status: 202,
        json: {
          analysis_id: report.analysis_id,
          contract_version: "r1",
          status: "queued",
        },
      });
    if (path.endsWith("/report")) return route.fulfill({ json: report });
    if (path.includes("/evidence/")) {
      const id = decodeURIComponent(path.split("/evidence/")[1]);
      const evidence = fixtureEvidence[id];
      return evidence
        ? route.fulfill({ json: evidence })
        : route.fulfill({
            status: 404,
            json: {
              error: {
                code: "not_found",
                message: "Источник не найден.",
                retryable: false,
              },
            },
          });
    }
    return route.fulfill({
      json: {
        analysis_id: report.analysis_id,
        contract_version: "r1",
        status: scenario === "failed" ? "failed" : "completed",
        stage: "reporting",
        documents: report.documents,
        warnings: [],
        usage: report.usage,
        error:
          scenario === "failed"
            ? {
                code: "model_unavailable",
                message: "Сервис анализа недоступен.",
                retryable: true,
              }
            : null,
      },
    });
  });
}

export async function openAnalysis(
  page: Page,
  scenario: ReportScenario = "complete",
) {
  await mockAnalysis(page, scenario);
  await page.goto("/");
  for (const [label, name] of [
    ["до", "before"],
    ["после", "after"],
  ]) {
    await page
      .getByLabel(`Файлы ${label} изменений`, { exact: true })
      .setInputFiles(
        fileURLToPath(
          new URL(`../fixtures/documents/${name}.pdf`, import.meta.url),
        ),
      );
  }
  await page
    .getByRole("button", { name: "Сравнить документы", exact: true })
    .click();
  if (scenario !== "failed")
    await expect(
      page.getByRole("heading", { name: "Вся картина изменений" }),
    ).toBeVisible();
}
