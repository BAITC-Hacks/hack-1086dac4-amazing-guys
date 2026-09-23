import { readFileSync } from "node:fs";
import { evidenceSchema, reportSchema } from "../../src/contracts";
const data = JSON.parse(
  readFileSync(new URL("./report.json", import.meta.url), "utf8"),
);
export type ReportScenario = "complete" | "partial" | "failed" | "empty";
export const fixtureEvidence = Object.fromEntries(
  Object.entries(data.evidence).map(([id, e]) => [id, evidenceSchema.parse(e)]),
);
export function fixtureReport(scenario: ReportScenario) {
  const report = reportSchema.parse(structuredClone(data.report));
  if (scenario === "partial") {
    report.analysis_id = "test-partial";
    report.documents.push({
      document_id: "unread-appendix",
      version: "after",
      name: "Приложение_скан.pdf",
      extraction_status: "failed",
      warnings: [
        "Демонстрация: текст скана не распознан. Нужна текстовая версия.",
      ],
    });
    report.coverage = {
      status: "partial",
      document_ids_checked: ["before", "after"],
      unread_document_ids: ["unread-appendix"],
      limitations: [
        "Приложение не прочитано. Отсутствие назначения нельзя считать потерей функции.",
        "Это демонстрация неполного покрытия, не анализ реального PDF.",
      ],
    };
    report.findings[0].type = "insufficient_evidence";
    report.findings[0].title = "Недостаточно данных об архивной функции";
    report.findings[0].explanation =
      "В доступном тексте назначение не найдено, но приложение не прочитано. Сначала восстановите покрытие.";
    report.conclusion.summary =
      "Анализ примера неполон: приложение не прочитано. Замечания предварительные. Уточните данные перед оценкой сохранности функций.";
  }
  if (scenario === "empty") {
    report.analysis_id = "test-empty";
    report.unit_changes = [];
    report.functions = [];
    report.function_matches = [];
    report.findings = [];
    report.conclusion = {
      summary:
        "Демонстрация пустого ответа: структурированные данные не получены.",
      limitations: [
        "Отсутствие замечаний само по себе не подтверждает отсутствие рисков.",
      ],
      recommendations: [],
    };
    report.coverage = {
      status: "partial",
      document_ids_checked: [],
      unread_document_ids: ["before", "after"],
      limitations: [
        "Извлечение функций не выполнено в этом демонстрационном сценарии.",
      ],
    };
    report.documents.forEach((d) => {
      d.extraction_status = "failed";
      d.warnings = ["Демо: данные не извлечены."];
    });
  }
  return report;
}
