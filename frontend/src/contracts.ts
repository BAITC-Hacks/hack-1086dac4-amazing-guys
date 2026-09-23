import { z } from "zod";

const strings = z.array(z.string());
const version = z.enum(["before", "after"]);
export const documentSchema = z.object({
  document_id: z.string(),
  version,
  name: z.string(),
  extraction_status: z.enum(["read", "partial", "failed"]),
  warnings: strings,
});
export const evidenceSchema = z.object({
  evidence_id: z.string(),
  document_id: z.string(),
  version,
  document_name: z.string(),
  locator: z.object({
    kind: z.enum(["paragraph", "table_cell", "pdf_page", "sheet_range"]),
    section: z.string().nullable(),
    paragraph_index: z.number().nullable(),
    page: z.number().nullable(),
    sheet: z.string().nullable(),
    cell_range: z.string().nullable(),
  }),
  quote: z.string(),
  context: z.string(),
  extraction_warning: z.string().nullable(),
});
const unitSchema = z.object({
  id: z.string(),
  before_unit_ids: strings,
  after_unit_ids: strings,
  kind: z.enum([
    "preserved",
    "renamed",
    "merged",
    "split",
    "created",
    "removed",
    "unresolved",
  ]),
  evidence_ids: strings,
  explanation: z.string(),
});
const functionSchema = z.object({
  id: z.string(),
  version,
  unit_id: z.string(),
  action: z.string(),
  object: z.string(),
  scope: z.string().nullable(),
  role: z.string().nullable(),
  evidence_ids: strings,
});
const matchSchema = z.object({
  id: z.string(),
  before_function_ids: strings,
  after_function_ids: strings,
  status: z.enum(["preserved", "transferred", "changed", "unresolved"]),
  evidence_ids: strings,
  explanation: z.string(),
});
const findingSchema = z.object({
  id: z.string(),
  type: z.enum([
    "possible_loss",
    "possible_duplication",
    "potential_conflict",
    "insufficient_evidence",
  ]),
  title: z.string(),
  explanation: z.string(),
  before_function_ids: strings,
  after_function_ids: strings,
  evidence_ids: strings,
  checked_after_document_ids: strings,
  limitations: strings,
  human_review: z.literal("unreviewed"),
});
const usageSchema = z.object({
  model: z.string(),
  calls: z.number(),
  input_tokens: z.number(),
  output_tokens: z.number(),
  estimated_cost_usd: z.number().nullable(),
});
export const reportSchema = z.object({
  contract_version: z.literal("r1"),
  analysis_id: z.string(),
  coverage: z.object({
    status: z.enum(["complete", "partial"]),
    document_ids_checked: strings,
    unread_document_ids: strings,
    limitations: strings,
  }),
  documents: z.array(documentSchema),
  unit_changes: z.array(unitSchema),
  functions: z.array(functionSchema),
  function_matches: z.array(matchSchema),
  findings: z.array(findingSchema),
  conclusion: z.object({
    summary: z.string(),
    limitations: strings,
    recommendations: z.array(
      z.object({
        text: z.string(),
        finding_ids: strings,
        evidence_ids: strings,
      }),
    ),
  }),
  activity: z.array(
    z.object({
      operation: z.string(),
      status: z.string(),
      referenced_ids: strings,
    }),
  ),
  usage: usageSchema,
});
const state = z.enum(["queued", "running", "completed", "failed"]);
export const acceptedSchema = z.object({
  analysis_id: z.string(),
  contract_version: z.literal("r1"),
  status: state,
});
export const errorSchema = z.object({
  code: z.string(),
  message: z.string(),
  retryable: z.boolean(),
});
export const statusSchema = acceptedSchema.extend({
  stage: z.enum(["extracting", "matching", "verifying", "reporting"]),
  documents: z.array(documentSchema),
  warnings: strings,
  error: errorSchema.nullable(),
  usage: usageSchema.nullable(),
});
export type Report = z.infer<typeof reportSchema>;
export type Evidence = z.infer<typeof evidenceSchema>;
export type AnalysisStatus = z.infer<typeof statusSchema>;
export type Finding = Report["findings"][number];
export type Version = "before" | "after";
export type Selection = {
  id: string;
  title: string;
  explanation: string;
  evidence_ids: string[];
  status: string;
  limitations?: string[];
  checked_after_document_ids?: string[];
  human_review?: string;
};

export const labels: Record<string, string> = {
  preserved: "Сохранено",
  transferred: "Передано",
  changed: "Изменено",
  unresolved: "Не установлено",
  renamed: "Переименовано",
  merged: "Объединено",
  split: "Разделено",
  created: "Создано",
  removed: "Упразднено",
  possible_loss: "Возможная потеря",
  possible_duplication: "Возможный дубль",
  potential_conflict: "Потенциальный конфликт",
  insufficient_evidence: "Недостаточно данных",
  read: "Прочитан",
  partial: "Прочитан частично",
  failed: "Не прочитан",
  unreviewed: "Не проверено сотрудником",
};
export function tone(status: string) {
  return ["preserved", "read"].includes(status)
    ? "green"
    : ["possible_loss", "potential_conflict", "failed"].includes(status)
      ? "red"
      : [
            "unresolved",
            "possible_duplication",
            "insufficient_evidence",
            "partial",
            "removed",
          ].includes(status)
        ? "amber"
        : "blue";
}
export function locationLabel(e: Evidence) {
  const l = e.locator;
  return (
    [
      l.section,
      l.page !== null ? `Страница ${l.page}` : null,
      l.paragraph_index !== null ? `Абзац ${l.paragraph_index}` : null,
      l.sheet ? `Лист «${l.sheet}»` : null,
      l.cell_range,
    ]
      .filter(Boolean)
      .join(" · ") || "Фрагмент документа"
  );
}
