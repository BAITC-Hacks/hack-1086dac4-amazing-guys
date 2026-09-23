import { labels, locationLabel } from "./contracts";
import type { Evidence, Report } from "./contracts";
import "./change-comparison.css";

type FunctionMatch = Report["function_matches"][number];

export type ChangeComparisonProps = {
  /** Evidence is normally fetched by the parent inspector and passed through unchanged. */
  evidences?: Evidence[];
  match?: Pick<FunctionMatch, "explanation" | "status"> | null;
  explanation?: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  /** Opens the existing source/context view for the selected evidence. */
  onShowContext?: (evidence: Evidence) => void;
};

type DiffKind = "same" | "removed" | "added";
export type DiffPart = { kind: DiffKind; text: string };
type Token = { text: string; whitespace: boolean };
export type DiffResult = { before: DiffPart[]; after: DiffPart[]; note?: string };

const MAX_DIFF_CELLS = 320_000;
const MAX_TOKENS = 1_600;

function tokenize(value: string): Token[] {
  // Keeping whitespace as a token means the rendered text remains byte-for-byte
  // equivalent in textContent, including Cyrillic and line breaks.
  return value.match(/\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu)?.map((text) => ({
    text,
    whitespace: /^\s+$/u.test(text),
  })) ?? [];
}

function append(parts: DiffPart[], kind: DiffKind, text: string) {
  if (!text) return;
  const previous = parts.at(-1);
  if (previous?.kind === kind) previous.text += text;
  else parts.push({ kind, text });
}

/** A small LCS diff keeps this UI deterministic and avoids a heavyweight diff dependency. */
export function diffText(before: string, after: string): DiffResult {
  if (before === after) return { before: [{ kind: "same", text: before }], after: [{ kind: "same", text: after }] };
  const left = tokenize(before);
  const right = tokenize(after);
  if (left.length > MAX_TOKENS || right.length > MAX_TOKENS || left.length * right.length > MAX_DIFF_CELLS) {
    return {
      before: before ? [{ kind: "same", text: before }] : [],
      after: after ? [{ kind: "same", text: after }] : [],
      note: "Цитаты слишком большие для автоматической подсветки; показан точный текст без выравнивания.",
    };
  }
  const table = Array.from({ length: left.length + 1 }, () => new Uint16Array(right.length + 1));
  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      table[i][j] = left[i].text === right[j].text ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const beforeParts: DiffPart[] = [];
  const afterParts: DiffPart[] = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (left[i].text === right[j].text) {
      append(beforeParts, "same", left[i].text);
      append(afterParts, "same", right[j].text);
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      append(beforeParts, left[i].whitespace ? "same" : "removed", left[i].text);
      i += 1;
    } else {
      append(afterParts, right[j].whitespace ? "same" : "added", right[j].text);
      j += 1;
    }
  }
  while (i < left.length) {
    append(beforeParts, left[i].whitespace ? "same" : "removed", left[i].text);
    i += 1;
  }
  while (j < right.length) {
    append(afterParts, right[j].whitespace ? "same" : "added", right[j].text);
    j += 1;
  }
  return { before: beforeParts, after: afterParts };
}

function Parts({ parts }: { parts: DiffPart[] }) {
  return (
    <>
      {parts.map((part, index) =>
        part.kind === "same" ? (
          <span key={`${part.kind}-${index}`}>{part.text}</span>
        ) : (
          <mark className={`change-diff-${part.kind}`} key={`${part.kind}-${index}`}>
            {part.text}
          </mark>
        ),
      )}
    </>
  );
}

function EvidenceStack({
  evidence,
  side,
  parts,
  onShowContext,
}: {
  evidence: Evidence[];
  side: "before" | "after";
  parts: Map<string, DiffPart[]>;
  onShowContext?: (evidence: Evidence) => void;
}) {
  if (!evidence.length) {
    return <p className="change-comparison-empty">Нет цитаты для этой стороны.</p>;
  }
  return (
    <div className="change-comparison-evidence-list">
      {evidence.map((item) => (
        <article className="change-comparison-evidence" key={item.evidence_id}>
          <header>
            <span className="change-comparison-source">{item.document_name}</span>
            <span className="change-comparison-locator">{locationLabel(item)}</span>
          </header>
          <blockquote aria-label={`Точная цитата ${side === "before" ? "до" : "после"} изменений`}>
            <Parts parts={parts.get(item.evidence_id) || [{ kind: "same", text: item.quote }]} />
          </blockquote>
          {item.extraction_warning && <p className="change-comparison-note">{item.extraction_warning}</p>}
          <details className="change-comparison-context">
            <summary>Показать полный контекст</summary>
            <p>{item.context || "Дополнительный контекст не предоставлен."}</p>
          </details>
          {onShowContext && (
            <button type="button" className="change-comparison-context-button" onClick={() => onShowContext(item)}>
              Открыть источник и контекст
            </button>
          )}
        </article>
      ))}
    </div>
  );
}

export default function ChangeComparison({
  evidences = [],
  match,
  explanation,
  loading = false,
  error = null,
  onRetry,
  onShowContext,
}: ChangeComparisonProps) {
  const before = evidences.filter((item) => item.version === "before");
  const after = evidences.filter((item) => item.version === "after");
  const beforeParts = new Map<string, DiffPart[]>();
  const afterParts = new Map<string, DiffPart[]>();
  let diffNote: string | undefined;
  if (before.length === 1 && after.length === 1) {
    const result = diffText(before[0].quote, after[0].quote);
    beforeParts.set(before[0].evidence_id, result.before);
    afterParts.set(after[0].evidence_id, result.after);
    diffNote = result.note;
  } else {
    diffNote = before.length > 1 || after.length > 1
      ? "Для нескольких источников автоматическое выравнивание слов не показывается; цитаты оставлены без подсветки."
      : "Автоматическое выравнивание возможно только для одной цитаты с каждой стороны; показан точный текст без подсветки.";
    for (const item of [...before, ...after]) {
      const parts = [{ kind: "same" as const, text: item.quote }];
      if (item.version === "before") beforeParts.set(item.evidence_id, parts);
      else afterParts.set(item.evidence_id, parts);
    }
  }
  const detail = explanation ?? match?.explanation;
  const status = match?.status;
  return (
    <section className="change-comparison" aria-labelledby="change-comparison-title">
      <div className="change-comparison-heading">
        <div>
          <p className="change-comparison-kicker">Карточка изменения</p>
          <h2 id="change-comparison-title">До и после по источникам</h2>
        </div>
        {status && <span className={`change-comparison-status status-${status}`}>{labels[status] || status}</span>}
      </div>
      {detail && <p className="change-comparison-explanation">{detail}</p>}
      {!diffNote && <p className="change-comparison-note">Подсветка показывает различия текста. Смысловой вывод выше требует проверки по контексту.</p>}
      {diffNote && <p className="change-comparison-note" role="note">{diffNote}</p>}
      {loading && <p className="change-comparison-state" role="status" aria-live="polite">Загрузка источников…</p>}
      {!loading && error && (
        <div className="change-comparison-error" role="alert">
          <p>{error}</p>
          {onRetry && <button type="button" onClick={onRetry}>Повторить загрузку</button>}
        </div>
      )}
      {!loading && !error && (
        <div className="change-comparison-columns">
          <div className="change-comparison-column change-comparison-before">
            <h3>До изменений <span>{before.length}</span></h3>
            <EvidenceStack evidence={before} side="before" parts={beforeParts} onShowContext={onShowContext} />
          </div>
          <div className="change-comparison-column change-comparison-after">
            <h3>После изменений <span>{after.length}</span></h3>
            <EvidenceStack evidence={after} side="after" parts={afterParts} onShowContext={onShowContext} />
          </div>
        </div>
      )}
    </section>
  );
}
