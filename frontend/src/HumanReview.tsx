import { useCallback, useEffect, useMemo, useState } from "react";
import "./human-review.css";

export const HUMAN_REVIEW_DECISIONS = [
  "unreviewed",
  "confirmed",
  "rejected",
  "needs_clarification",
] as const;

export type HumanReviewDecision = (typeof HUMAN_REVIEW_DECISIONS)[number];

export type HumanReviewRecord = {
  decision: HumanReviewDecision;
  comment: string;
  updatedAt: string;
};

export type HumanReviewSummary = Record<HumanReviewDecision, number>;

const STORAGE_PREFIX = "kontur:human-review:v1";
const EVENT_NAME = "kontur:human-review-changed";
const MAX_COMMENT_LENGTH = 1000;

const decisionLabels: Record<HumanReviewDecision, string> = {
  unreviewed: "Не проверено",
  confirmed: "Подтверждено",
  rejected: "Отклонено",
  needs_clarification: "Нужно уточнение",
};

function storageKey(
  analysisId: string,
  findingId: string,
  reportFingerprint?: string,
) {
  return [STORAGE_PREFIX, analysisId, findingId, reportFingerprint || "current"]
    .map((part) => encodeURIComponent(part))
    .join(":");
}

function emptySummary(): HumanReviewSummary {
  return {
    unreviewed: 0,
    confirmed: 0,
    rejected: 0,
    needs_clarification: 0,
  };
}

function isDecision(value: unknown): value is HumanReviewDecision {
  return (
    typeof value === "string" &&
    (HUMAN_REVIEW_DECISIONS as readonly string[]).includes(value)
  );
}

function isRecord(value: unknown): value is HumanReviewRecord {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<HumanReviewRecord>;
  return (
    isDecision(candidate.decision) &&
    typeof candidate.comment === "string" &&
    candidate.comment.length <= MAX_COMMENT_LENGTH &&
    typeof candidate.updatedAt === "string" &&
    Number.isFinite(Date.parse(candidate.updatedAt))
  );
}

function readRecord(key: string): {
  record: HumanReviewRecord | null;
  error: string;
} {
  if (typeof window === "undefined") return { record: null, error: "" };
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return { record: null, error: "" };
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return {
        record: null,
        error:
          "Не удалось прочитать сохранённую проверку: данные повреждены. Новое решение можно сохранить заново.",
      };
    }
    return { record: parsed, error: "" };
  } catch {
    return {
      record: null,
      error:
        "Локальные сохранения недоступны в этом браузере. Проверка останется только на экране.",
    };
  }
}

function notifyChanged(key: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { key } }));
  }
}

export function getHumanReview(
  analysisId: string,
  findingId: string,
  reportFingerprint?: string,
): HumanReviewRecord | null {
  return readRecord(storageKey(analysisId, findingId, reportFingerprint)).record;
}

export function getHumanReviewSummary(
  analysisId: string,
  findingIds: readonly string[],
  reportFingerprint?: string,
): HumanReviewSummary {
  return findingIds.reduce((summary, findingId) => {
    const decision =
      getHumanReview(analysisId, findingId, reportFingerprint)?.decision ||
      "unreviewed";
    summary[decision] += 1;
    return summary;
  }, emptySummary());
}

export function HumanReviewSummaryView({
  analysisId,
  findingIds,
  reportFingerprint,
}: {
  analysisId: string;
  findingIds: readonly string[];
  reportFingerprint?: string;
}) {
  const idsKey = useMemo(() => findingIds.join("\u0001"), [findingIds]);
  const [summary, setSummary] = useState<HumanReviewSummary>(() =>
    getHumanReviewSummary(analysisId, findingIds, reportFingerprint),
  );

  useEffect(() => {
    const refresh = () =>
      setSummary(
        getHumanReviewSummary(
          analysisId,
          idsKey ? idsKey.split("\u0001") : [],
          reportFingerprint,
        ),
      );
    refresh();
    const onChanged = () => refresh();
    window.addEventListener(EVENT_NAME, onChanged);
    window.addEventListener("storage", onChanged);
    return () => {
      window.removeEventListener(EVENT_NAME, onChanged);
      window.removeEventListener("storage", onChanged);
    };
  }, [analysisId, idsKey, reportFingerprint]);

  return (
    <div className="human-review-summary" aria-label="Сводка проверки сотрудником">
      {HUMAN_REVIEW_DECISIONS.map((decision) => (
        <span key={decision} className={`human-review-summary__item ${decision}`}>
          <strong>{summary[decision]}</strong> {decisionLabels[decision]}
        </span>
      ))}
    </div>
  );
}

export function useHumanReview({
  analysisId,
  findingId,
  reportFingerprint,
}: {
  analysisId: string;
  findingId: string;
  reportFingerprint?: string;
}) {
  const key = useMemo(
    () => storageKey(analysisId, findingId, reportFingerprint),
    [analysisId, findingId, reportFingerprint],
  );
  const [record, setRecord] = useState<HumanReviewRecord | null>(() =>
    readRecord(key).record,
  );
  const [storageError, setStorageError] = useState(() => readRecord(key).error);

  const reload = useCallback(() => {
    const result = readRecord(key);
    setRecord(result.record);
    setStorageError(result.error);
  }, [key]);

  useEffect(() => {
    reload();
    const onChanged = (event: Event) => {
      const changedKey = (event as CustomEvent<{ key?: string }>).detail?.key;
      if (!changedKey || changedKey === key) reload();
    };
    window.addEventListener(EVENT_NAME, onChanged);
    window.addEventListener("storage", onChanged);
    return () => {
      window.removeEventListener(EVENT_NAME, onChanged);
      window.removeEventListener("storage", onChanged);
    };
  }, [key, reload]);

  const save = useCallback(
    (decision: HumanReviewDecision, comment: string) => {
      const next: HumanReviewRecord = {
        decision,
        comment: comment.trim().slice(0, MAX_COMMENT_LENGTH),
        updatedAt: new Date().toISOString(),
      };
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
        setRecord(next);
        setStorageError("");
        notifyChanged(key);
        return true;
      } catch {
        setStorageError(
          "Не удалось сохранить проверку в этом браузере (возможно, хранилище переполнено или запрещено). Решение не сохранено.",
        );
        return false;
      }
    },
    [key],
  );

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setRecord(null);
      setStorageError("");
      notifyChanged(key);
      return true;
    } catch {
      setStorageError("Не удалось удалить локальную проверку из этого браузера.");
      return false;
    }
  }, [key]);

  return { record, save, reset, storageError, maxCommentLength: MAX_COMMENT_LENGTH };
}

export type HumanReviewProps = {
  analysisId: string;
  findingId: string;
  reportFingerprint?: string;
  findingTitle?: string;
  className?: string;
};

export function HumanReview({
  analysisId,
  findingId,
  reportFingerprint,
  findingTitle,
  className = "",
}: HumanReviewProps) {
  const { record, save, reset, storageError, maxCommentLength } = useHumanReview({
    analysisId,
    findingId,
    reportFingerprint,
  });
  const [decision, setDecision] = useState<HumanReviewDecision>(
    record?.decision || "unreviewed",
  );
  const [comment, setComment] = useState(record?.comment || "");

  useEffect(() => {
    setDecision(record?.decision || "unreviewed");
    setComment(record?.comment || "");
  }, [record]);

  const normalizedComment = comment.trim().slice(0, maxCommentLength);
  const isDirty = record
    ? decision !== record.decision || normalizedComment !== record.comment
    : decision !== "unreviewed" || normalizedComment.length > 0;
  const hasSavedRecord = Boolean(record);
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    save(decision, comment);
  };

  return (
    <section className={`human-review ${className}`} aria-labelledby={`review-${findingId}`}>
      <div className="human-review__heading">
        <div>
          <p className="human-review__eyebrow">Проверка сотрудником</p>
          <h3 id={`review-${findingId}`}>{findingTitle || "Решение по замечанию"}</h3>
        </div>
        <span className="human-review__local-note">
          {isDirty
            ? "Есть несохранённые изменения"
            : hasSavedRecord
            ? "Проверка сотрудником · сохранено в этом браузере"
            : "Проверка сотрудником · пока не сохранено"}
        </span>
      </div>
      <form onSubmit={onSubmit}>
        <fieldset className="human-review__choices">
          <legend>Решение</legend>
          {HUMAN_REVIEW_DECISIONS.map((option) => (
            <label key={option} className="human-review__choice">
              <input
                type="radio"
                name={`human-review-${analysisId}-${findingId}`}
                value={option}
                checked={decision === option}
                onChange={() => setDecision(option)}
              />
              <span>{decisionLabels[option]}</span>
            </label>
          ))}
        </fieldset>
        <label className="human-review__comment">
          <span>Комментарий сотрудника</span>
          <textarea
            value={comment}
            maxLength={maxCommentLength}
            onChange={(event) => setComment(event.target.value)}
            placeholder="На каком основании принято решение"
            rows={3}
          />
          <small>{comment.length}/{maxCommentLength}</small>
        </label>
        <div className="human-review__actions">
          <button type="submit" className="human-review__save">
            Сохранить решение
          </button>
          {hasSavedRecord && (
            <button type="button" className="human-review__reset" onClick={reset}>
              Сбросить
            </button>
          )}
        </div>
      </form>
      {storageError && <p className="human-review__error" role="alert">{storageError}</p>}
      <p className="human-review__status" aria-live="polite">
        {isDirty
          ? "Есть несохранённые изменения. Сохраните решение, чтобы обновить локальный результат."
          : record
          ? `Локальное решение: ${decisionLabels[record.decision]}`
          : "Решение пока не сохранено; модельное значение остаётся «Не проверено»."}
      </p>
    </section>
  );
}

export { decisionLabels };
