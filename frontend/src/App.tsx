import { useCallback, useEffect, useRef, useState } from "react";
import type { DragEvent, ReactNode, RefObject } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Clock3,
  Copy,
  FileCheck2,
  FileSearch,
  FileText,
  Files,
  FlaskConical,
  GitCompareArrows,
  Layers3,
  LayoutDashboard,
  Link2,
  ListFilter,
  LoaderCircle,
  Menu,
  Network,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { ACCEPT, API_BASE, ApiError, api, delay, validateFiles } from "./api";
import type {
  AnalysisStatus,
  Evidence,
  Report,
  Selection,
  Version,
} from "./contracts";
import { labels, locationLabel, tone } from "./contracts";
import { demoEvidence, demoReport } from "./demo";
import type { DemoScenario } from "./demo";

type View =
  "new" | "overview" | "documents" | "comparison" | "findings" | "conclusion";
type Tab = "functions" | "units" | "registry";
const stages = ["extracting", "matching", "verifying", "reporting"] as const;
const stageNames = {
  extracting: "Чтение документов",
  matching: "Сопоставление функций",
  verifying: "Проверка источников",
  reporting: "Подготовка заключения",
};
const viewNames: Record<View, string> = {
  new: "Новое сравнение",
  overview: "Обзор анализа",
  documents: "Документы",
  comparison: "Матрица соответствий",
  findings: "Замечания",
  conclusion: "Заключение",
};
const nav = [
  { id: "overview", label: "Обзор", icon: LayoutDashboard },
  { id: "documents", label: "Документы", icon: Files },
  { id: "comparison", label: "Сравнение", icon: GitCompareArrows },
  { id: "findings", label: "Замечания", icon: CircleAlert },
  { id: "conclusion", label: "Заключение", icon: FileCheck2 },
] as const;
const unique = (values: string[]) => [...new Set(values)];
const size = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.ceil(bytes / 1024)} КБ`
    : `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
function Badge({ status, children }: { status: string; children?: ReactNode }) {
  return (
    <span className={`badge ${tone(status)}`}>
      <span className="status-dot" />
      {children || labels[status] || status}
    </span>
  );
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <FileSearch size={38} strokeWidth={1.3} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function Alert({
  children,
  danger = false,
}: {
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      className={`alert ${danger ? "danger" : ""}`}
      role={danger ? "alert" : "status"}
    >
      <CircleAlert size={19} />
      <div>{children}</div>
    </div>
  );
}
function download(name: string, text: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function UploadBox({
  version,
  files,
  onChange,
  disabled,
}: {
  version: Version;
  files: File[];
  onChange: (files: File[]) => void;
  disabled: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  function add(incoming: File[]) {
    const next = [...files];
    for (const f of incoming)
      if (
        !next.some(
          (x) =>
            x.name === f.name &&
            x.size === f.size &&
            x.lastModified === f.lastModified,
        )
      )
        next.push(f);
    const message = validateFiles(next);
    setError(message);
    if (!message) onChange(next);
  }
  function drop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (!disabled) add([...e.dataTransfer.files]);
  }
  return (
    <section
      className={`upload-box ${dragging ? "dragging" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={drop}
      aria-label={
        version === "before"
          ? "Комплект до изменений"
          : "Комплект после изменений"
      }
    >
      <div className="upload-heading">
        <span className={`version-mark ${version}`}>
          {version === "before" ? "01" : "02"}
        </span>
        <div>
          <h3>{version === "before" ? "До изменений" : "После изменений"}</h3>
          <p>
            {version === "before"
              ? "Действующая структура и обязанности"
              : "Новая редакция документов"}
          </p>
        </div>
      </div>
      <input
        ref={input}
        type="file"
        multiple
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-label={`Файлы ${version === "before" ? "до" : "после"} изменений`}
        disabled={disabled}
        onChange={(e) => {
          add([...(e.target.files || [])]);
          e.target.value = "";
        }}
      />
      <button
        className="dropzone"
        disabled={disabled}
        onClick={() => input.current?.click()}
      >
        <span className="upload-icon">
          <UploadCloud size={25} />
        </span>
        <strong>
          {files.length
            ? "Добавить документы"
            : "Выберите или перетащите файлы"}
        </strong>
        <span>PDF, DOCX, XLSX, TXT, MD</span>
        <small>До 5 файлов · до 5 МиБ каждый</small>
      </button>
      {files.length > 0 && (
        <ul className="file-list">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`}>
              <FileText size={19} />
              <div>
                <strong title={f.name}>{f.name}</strong>
                <small>{size(f.size)} · Готов к отправке</small>
              </div>
              <button
                className="icon-button"
                disabled={disabled}
                aria-label={`Удалить ${f.name}`}
                onClick={() => {
                  onChange(files.filter((_, n) => n !== i));
                  setError("");
                }}
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

function Inspector({
  selection,
  report,
  isDemo,
  onClose,
  returnFocusTo,
}: {
  selection: Selection;
  report: Report;
  isDemo: boolean;
  onClose: () => void;
  returnFocusTo: RefObject<HTMLElement | null>;
}) {
  const [evidences, setEvidences] = useState<Evidence[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [copied, setCopied] = useState("");
  const [loadedKey, setLoadedKey] = useState("");
  const [closing, setClosing] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const exitAnimation = useRef<Animation | null>(null);
  const sourceKey = JSON.stringify([
    report.analysis_id,
    isDemo,
    selection.id,
    selection.evidence_ids,
    retry,
  ]);
  const waiting = loading || loadedKey !== sourceKey;
  const dismiss = useCallback(() => {
    if (exitAnimation.current) return;
    if (
      !ref.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      onClose();
      return;
    }
    setClosing(true);
    const style = getComputedStyle(ref.current);
    const animation = ref.current.animate(
      [
        { opacity: style.opacity, transform: style.transform },
        { opacity: 0, transform: "translateX(20px)" },
      ],
      { duration: 160, easing: "ease-in", fill: "forwards" },
    );
    exitAnimation.current = animation;
    void animation.finished
      .then(() => {
        if (exitAnimation.current === animation) onClose();
      })
      .catch(() => {
        /* A new selection or navigation cancels the exit. */
      });
  }, [onClose]);
  useEffect(() => {
    exitAnimation.current?.cancel();
    exitAnimation.current = null;
    setClosing(false);
    ref.current?.focus();
    ref.current?.querySelector(".inspector-body")?.scrollTo(0, 0);
  }, [selection]);
  useEffect(() => {
    const panel = ref.current;
    return () => {
      exitAnimation.current?.cancel();
      const active = document.activeElement;
      if (
        (active === document.body || panel?.contains(active)) &&
        returnFocusTo.current?.isConnected
      ) {
        returnFocusTo.current.focus({ preventScroll: true });
      }
    };
  }, [returnFocusTo]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
      if (e.key === "Tab" && window.innerWidth <= 1100) {
        const items = [
          ...(ref.current?.querySelectorAll<HTMLElement>(
            "button, a[href], summary",
          ) || []),
        ].filter((x) => x.getClientRects().length);
        const first = items[0],
          last = items.at(-1);
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dismiss]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setEvidences([]);
    setCopied("");
    (async () => {
      try {
        const values = await Promise.all(
          unique(selection.evidence_ids).map((id) =>
            isDemo
              ? Promise.resolve(demoEvidence[id])
              : api.evidence(report.analysis_id, id, controller.signal),
          ),
        );
        if (values.some((x) => !x))
          throw new Error("Источник не найден в демонстрационном комплекте.");
        if (!controller.signal.aborted) setEvidences(values);
      } catch (e) {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : "Не удалось загрузить источник.",
          );
      } finally {
        if (!controller.signal.aborted) {
          setLoadedKey(sourceKey);
          setLoading(false);
        }
      }
    })();
    return () => controller.abort();
  }, [
    selection.id,
    selection.evidence_ids,
    report.analysis_id,
    isDemo,
    retry,
    sourceKey,
  ]);
  async function copy(e: Evidence) {
    try {
      await navigator.clipboard.writeText(
        `${e.document_name} · ${locationLabel(e)}\n${e.quote}`,
      );
      setCopied(e.evidence_id);
    } catch {
      setError("Копирование недоступно. Выделите и скопируйте цитату вручную.");
    }
  }
  return (
    <>
      <button
        className={`inspector-backdrop${closing ? " is-closing" : ""}`}
        tabIndex={-1}
        aria-label="Закрыть панель источников"
        onClick={dismiss}
      />
      <aside
        ref={ref}
        id="source-inspector"
        tabIndex={-1}
        className="inspector"
        aria-label="Проверка по источнику"
      >
        <div className="inspector-top">
          <span>
            <Link2 size={17} /> Проверка по источнику
          </span>
          <button
            className="icon-button"
            aria-label="Закрыть источники"
            onClick={dismiss}
          >
            <X size={19} />
          </button>
        </div>
        <div className="inspector-body">
          <Badge status={selection.status} />
          <h2>{selection.title}</h2>
          <p className="explanation">{selection.explanation}</p>
          {selection.human_review && (
            <div className="review-label">
              <Clock3 size={14} />
              Не проверено сотрудником
            </div>
          )}
          {isDemo && (
            <div className="source-demo">
              <FlaskConical size={14} />
              Цитаты авторского примера. Не результат AI.
            </div>
          )}
          {waiting && (
            <p className="source-loading-label" role="status">
              Загрузка источников…
            </p>
          )}
          <div className="source-content" aria-busy={waiting}>
            {waiting && (
              <div className="source-loading">
                <div aria-hidden="true">
                  {Array.from(
                    {
                      length: Math.min(
                        3,
                        Math.max(1, unique(selection.evidence_ids).length),
                      ),
                    },
                    (_, i) => (
                      <div className="evidence-skeleton" key={i}>
                        <div className="skeleton-heading">
                          <span className="skeleton-block skeleton-icon" />
                          <div>
                            <span className="skeleton-block skeleton-title" />
                            <span className="skeleton-block skeleton-subtitle" />
                          </div>
                        </div>
                        <div className="skeleton-quote">
                          <span className="skeleton-block skeleton-location" />
                          <span className="skeleton-block" />
                          <span className="skeleton-block" />
                          <span className="skeleton-block skeleton-short" />
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
            {!waiting && error && (
              <Alert danger>
                {error}
                <button
                  className="text-button"
                  onClick={() => setRetry((x) => x + 1)}
                >
                  Повторить загрузку
                </button>
              </Alert>
            )}
            {!waiting && !error && !evidences.length && (
              <Empty
                title="Источники не указаны"
                text="Для этого вывода сервер не предоставил ссылки. Требуется уточнение."
              />
            )}
            {!waiting && (
              <div className="source-quotes" key={sourceKey}>
                {evidences.map((e) => (
                  <article
                    className={`evidence ${e.version}`}
                    key={e.evidence_id}
                  >
                    <div className="evidence-head">
                      <FileText size={19} />
                      <div>
                        <strong>
                          {e.version === "before"
                            ? "До изменений"
                            : "После изменений"}
                        </strong>
                        <small>{e.document_name}</small>
                      </div>
                      <button
                        className="icon-button"
                        aria-label={`Копировать цитату ${e.evidence_id}`}
                        onClick={() => copy(e)}
                      >
                        {copied === e.evidence_id ? (
                          <Check size={16} />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                    </div>
                    <div className="evidence-location">{locationLabel(e)}</div>
                    <blockquote>{e.quote}</blockquote>
                    {e.extraction_warning && (
                      <Alert>{e.extraction_warning}</Alert>
                    )}
                    <details>
                      <summary>
                        Показать контекст <ChevronDown size={14} />
                      </summary>
                      <p className="context">
                        {e.context ||
                          "Дополнительный контекст не предоставлен."}
                      </p>
                    </details>
                    {isDemo && (
                      <a
                        className="source-link"
                        href={`/demo/${e.version}.md`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Открыть исходный текст <ArrowUpRight size={14} />
                      </a>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
          {!!selection.checked_after_document_ids?.length && (
            <div className="scope-note">
              <strong>Проверенный комплект «после»</strong>
              <p>
                {selection.checked_after_document_ids
                  .map(
                    (id) =>
                      report.documents.find((d) => d.document_id === id)
                        ?.name || id,
                  )
                  .join(", ")}
              </p>
            </div>
          )}
          {selection.limitations?.map((s, i) => (
            <p className="limitation" key={i}>
              {s}
            </p>
          ))}
        </div>
        <div className="inspector-foot">
          <ShieldCheck size={15} />
          Проверьте смысл вывода по первоисточнику
        </div>
      </aside>
    </>
  );
}

export default function App() {
  const [mode, setMode] = useState<"demo" | "api">("demo");
  const [view, setView] = useState<View>("new");
  const [tab, setTab] = useState<Tab>("functions");
  const [report, setReport] = useState<Report | null>(null);
  const [reportMode, setReportMode] = useState<"demo" | "api">("demo");
  const [files, setFiles] = useState<Record<Version, File[]>>({
    before: [],
    after: [],
  });
  const [selection, setSelection] = useState<Selection | null>(null);
  const sourceTrigger = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<keyof typeof stageNames>("extracting");
  const [progress, setProgress] = useState<AnalysisStatus | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [scenario, setScenario] = useState<DemoScenario>("complete");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [toast, setToast] = useState("");
  const controller = useRef<AbortController | null>(null);
  const requestKey = useRef<string | null>(null);
  const analysisId = useRef<string | null>(null);
  const busyRef = useRef(false);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(timer);
  }, [toast]);
  function navigate(next: View) {
    setView(next);
    setSelection(null);
    setQuery("");
    setFilter("all");
    setMobileMenu(false);
  }
  function openSection(next: Exclude<View, "new">) {
    if (!report && mode === "demo") {
      setReport(demoReport("complete"));
      setReportMode("demo");
    }
    setError(null);
    navigate(next);
  }
  function showDemoInSection() {
    setMode("demo");
    setReport(demoReport("complete"));
    setReportMode("demo");
    setError(null);
  }
  function changeFiles(v: Version, values: File[]) {
    setFiles((old) => ({ ...old, [v]: values }));
    requestKey.current = null;
    analysisId.current = null;
    setError(null);
  }
  function changeMode(next: "demo" | "api") {
    if (busy) return;
    setMode(next);
    setError(null);
    requestKey.current = null;
    analysisId.current = null;
    navigate("new");
  }
  function cancel() {
    controller.current?.abort();
    busyRef.current = false;
    setBusy(false);
    setToast(
      mode === "api"
        ? "Ожидание остановлено. Сервер может продолжать обработку; повтор продолжит ожидание."
        : "Демонстрация остановлена.",
    );
  }
  async function runDemo() {
    setMode("demo");
    if (busyRef.current) return;
    busyRef.current = true;
    const ac = new AbortController();
    controller.current = ac;
    setBusy(true);
    setError(null);
    setProgress(null);
    setSelection(null);
    try {
      for (const current of stages) {
        setStage(current);
        await delay(480, ac.signal);
      }
      if (scenario === "failed")
        throw new ApiError(
          "Демонстрация сбоя: сервис анализа недоступен. Реальные файлы не отправлялись.",
          true,
        );
      const next = demoReport(scenario);
      setReport(next);
      setReportMode("demo");
      navigate("overview");
    } catch (e) {
      if (!ac.signal.aborted)
        setError(
          e instanceof ApiError
            ? e
            : new ApiError("Не удалось открыть демонстрацию."),
        );
    } finally {
      if (controller.current === ac) {
        setBusy(false);
        busyRef.current = false;
      }
    }
  }
  async function runApi() {
    if (busyRef.current) return;
    const validation =
      validateFiles(files.before) ||
      validateFiles(files.after) ||
      (!files.before.length || !files.after.length
        ? "Добавьте хотя бы один файл в каждый комплект."
        : "");
    if (validation) {
      setError(new ApiError(validation));
      return;
    }
    busyRef.current = true;
    const ac = new AbortController();
    controller.current = ac;
    setBusy(true);
    setError(null);
    setProgress(null);
    setStage("extracting");
    setSelection(null);
    try {
      requestKey.current ||= crypto.randomUUID();
      if (!analysisId.current) {
        const accepted = await api.start(
          files.before,
          files.after,
          requestKey.current,
          ac.signal,
        );
        analysisId.current = accepted.analysis_id;
      }
      const deadline = Date.now() + 10 * 60_000;
      while (Date.now() < deadline) {
        const status = await api.status(analysisId.current, ac.signal);
        setProgress(status);
        setStage(status.stage);
        if (status.status === "failed") {
          const detail = status.error;
          analysisId.current = null;
          requestKey.current = null;
          throw new ApiError(
            detail?.message ||
              "Анализ не завершён. Проверьте документы и настройки сервера.",
            detail?.retryable ?? false,
          );
        }
        if (status.status === "completed") {
          try {
            const next = await api.report(analysisId.current, ac.signal);
            setReport(next);
            setReportMode("api");
            navigate("overview");
            return;
          } catch (e) {
            if (!(e instanceof ApiError) || e.status !== 409) throw e;
          }
        }
        await delay(1400, ac.signal);
      }
      throw new ApiError(
        "Ожидание заняло более десяти минут. Можно продолжить проверку состояния без повторной отправки файлов.",
        true,
      );
    } catch (e) {
      if (!ac.signal.aborted)
        setError(
          e instanceof ApiError
            ? e
            : new ApiError(
                "Не удалось завершить запрос. Проверьте соединение.",
                true,
              ),
        );
    } finally {
      if (controller.current === ac) {
        setBusy(false);
        busyRef.current = false;
      }
    }
  }
  function newComparison() {
    navigate("new");
    setError(null);
    requestKey.current = null;
    analysisId.current = null;
  }
  function open(s: Selection) {
    sourceTrigger.current = document.activeElement as HTMLElement | null;
    setSelection(s);
  }
  function exportReport() {
    if (!report) return;
    download(
      `${reportMode === "demo" ? "DEMO-" : ""}org-review-${report.analysis_id}.json`,
      JSON.stringify(
        {
          provenance:
            reportMode === "demo"
              ? "Авторская демонстрация. Не результат AI."
              : "Ответ backend. Требует проверки сотрудником.",
          ...report,
        },
        null,
        2,
      ),
    );
    setToast("Отчёт JSON сохранён.");
  }
  const isDemo = reportMode === "demo";
  const search = (value: unknown) =>
    JSON.stringify(value)
      .toLocaleLowerCase("ru")
      .includes(query.toLocaleLowerCase("ru").trim());
  const functionById = (ids: string[]) =>
    report?.functions.filter((f) => ids.includes(f.id)) || [];
  const functionTitle = (ids: string[]) =>
    functionById(ids)
      .map((f) => `${f.action} ${f.object}`.trim())
      .join("; ");
  const functionUnits = (ids: string[]) =>
    unique(functionById(ids).map((f) => f.unit_id)).join(", ") ||
    "Не установлено";
  const matchSelection = (
    m: Report["function_matches"][number],
  ): Selection => ({
    ...m,
    title:
      functionTitle(m.before_function_ids) ||
      functionTitle(m.after_function_ids) ||
      "Соответствие функций",
  });
  const findings =
    report?.findings.filter(
      (f) => search(f) && (filter === "all" || f.type === filter),
    ) || [];
  const matches =
    report?.function_matches.filter(
      (m) =>
        search([
          m,
          functionById([...m.before_function_ids, ...m.after_function_ids]),
        ]) &&
        (filter === "all" || m.status === filter),
    ) || [];
  const units =
    report?.unit_changes.filter(
      (u) => search(u) && (filter === "all" || u.kind === filter),
    ) || [];
  const registry =
    report?.functions.filter(
      (f) => search(f) && (filter === "all" || f.version === filter),
    ) || [];
  const isResult = report && view !== "new";
  const visibleStages = stages.filter(
    (s) => mode === "demo" || s !== "matching" || stage === "matching",
  );
  return (
    <div className={`app ${selection && isResult ? "has-inspector" : ""}`}>
      {mobileMenu && (
        <button
          className="menu-backdrop"
          aria-label="Закрыть меню"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <aside inert={busy} className={`sidebar ${mobileMenu ? "open" : ""}`}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate(report ? "overview" : "new");
          }}
        >
          <span className="brand-mark">
            <Files size={27} />
          </span>
          <span>
            Контур<small>Организационные изменения</small>
          </span>
        </a>
        <div className="workspace-label">
          <span className="workspace-avatar">AG</span>
          <div>
            Amazing Guys<small>Рабочее пространство</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <button className="new-button" onClick={newComparison} disabled={busy}>
          <Plus size={18} />
          Новое сравнение
        </button>
        <div className="nav-label">Рабочее пространство</div>
        <nav aria-label="Основная навигация">
          {nav.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${view === item.id ? "active" : ""}`}
              disabled={busy}
              onClick={() => openSection(item.id)}
              aria-current={view === item.id ? "page" : undefined}
            >
              <item.icon size={19} />
              <span>{item.label}</span>
              {item.id === "findings" && !!report?.findings.length && (
                <span className="nav-count">{report.findings.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="mode-box">
            <span>
              <span className={`live-dot ${mode}`} />
              {mode === "demo" ? "Демонстрационный режим" : "Режим сервера"}
            </span>
            <p>
              {mode === "demo"
                ? "Исследуйте интерфейс на открытом авторском примере."
                : "Файлы отправляются на настроенный backend."}
            </p>
            <div className="mode-switch" aria-label="Режим работы">
              <button
                disabled={busy}
                className={mode === "demo" ? "selected" : ""}
                onClick={() => changeMode("demo")}
              >
                Демо
              </button>
              <button
                disabled={busy}
                className={mode === "api" ? "selected" : ""}
                onClick={() => changeMode("api")}
              >
                Сервер
              </button>
            </div>
          </div>
          <div className="sidebar-footer">
            <ShieldCheck size={16} />
            <span>Каждый вывод — с источником</span>
          </div>
        </div>
      </aside>
      <div className="workspace" inert={busy}>
        <header className="topbar">
          <div>
            <button
              className="icon-button mobile-menu"
              aria-label="Открыть меню"
              onClick={() => setMobileMenu(true)}
            >
              <Menu size={21} />
            </button>
            <span className="breadcrumb">Рабочее пространство</span>
            <ChevronRight size={14} />
            <span>{viewNames[view]}</span>
          </div>
          <div>
            <span
              className={`environment ${(!isResult ? mode === "demo" : isDemo) ? "" : "server"}`}
            >
              <FlaskConical size={14} />
              {(!isResult ? mode === "demo" : isDemo)
                ? "Демонстрация"
                : "Backend"}
            </span>
            <span className="avatar">AG</span>
          </div>
        </header>
        <main id="main-content" className="main">
          <a className="skip-link" href="#page-content">
            К содержимому
          </a>
          {!report && view !== "new" ? (
            <section id="page-content" className="section-placeholder">
              <div className="page-heading">
                <div>
                  <div className="eyebrow">Работа со своими документами</div>
                  <h1>{viewNames[view]}</h1>
                  <p>Раздел доступен. Осталось выбрать данные для просмотра.</p>
                </div>
              </div>
              <div className="panel no-report-panel">
                <span className="summary-icon">
                  <FileSearch size={26} />
                </span>
                <h2>Отчёт ещё не получен</h2>
                <p>
                  {view === "documents"
                    ? "Загрузите документы до и после изменений. После обработки здесь появятся состав комплектов и качество чтения."
                    : view === "comparison"
                      ? "После анализа здесь появятся соответствия подразделений и функций со ссылками на источники."
                      : view === "findings"
                        ? "После анализа здесь появятся замечания, их основания и ограничения проверки."
                        : view === "conclusion"
                          ? "После анализа здесь появятся итоговые выводы и рекомендации с источниками."
                          : "После анализа здесь появятся обзор изменений, сведения о документах и замечания для проверки."}
                </p>
                <div className="section-actions">
                  <button className="primary" onClick={newComparison}>
                    <UploadCloud size={18} />
                    Загрузить документы
                  </button>
                  <button className="secondary" onClick={showDemoInSection}>
                    <FlaskConical size={18} />
                    Посмотреть демопример
                  </button>
                </div>
                <div className="source-demo">
                  Демопример работает без сервера. Для анализа своих файлов
                  нужен запущенный backend.
                </div>
              </div>
            </section>
          ) : !isResult ? (
            <div id="page-content" className="start-page">
              <div className="intro">
                <span className="eyebrow">
                  <span />
                  Ответственность под контролем
                </span>
                <h1>
                  Изменения видны.
                  <br />
                  <span>Основания — рядом.</span>
                </h1>
                <p>
                  Сопоставьте документы до и после реорганизации.
                  <br className="desktop-break" /> Проследите каждую функцию до
                  её источника.
                </p>
              </div>
              <div className="start-layout">
                <div className="upload-main">
                  <div className="section-heading">
                    <h2>Создайте новое сравнение</h2>
                    <span>Два комплекта документов</span>
                  </div>
                  <div className="upload-grid">
                    <UploadBox
                      version="before"
                      files={files.before}
                      onChange={(f) => changeFiles("before", f)}
                      disabled={busy}
                    />
                    <UploadBox
                      version="after"
                      files={files.after}
                      onChange={(f) => changeFiles("after", f)}
                      disabled={busy}
                    />
                  </div>
                  <div className="upload-footer">
                    <p>
                      <ShieldCheck size={17} />
                      {mode === "demo"
                        ? "Файлы остаются в браузере. Демо их не анализирует."
                        : "Файлы отправятся на ваш сервер для анализа."}
                    </p>
                    <button
                      className="primary"
                      disabled={
                        busy ||
                        mode === "demo" ||
                        !files.before.length ||
                        !files.after.length
                      }
                      onClick={runApi}
                    >
                      {busy ? (
                        <LoaderCircle className="spin" size={17} />
                      ) : (
                        <GitCompareArrows size={18} />
                      )}
                      Сравнить документы
                    </button>
                  </div>
                  {mode === "demo" ? (
                    <p className="upload-hint">
                      Для своих документов переключитесь в режим «Сервер». Пока
                      можно открыть готовый пример справа.
                    </p>
                  ) : (
                    <p className="upload-hint">
                      Адрес подключения: <code>{API_BASE}</code>. Ключ модели
                      хранится только на сервере.
                    </p>
                  )}
                </div>
                <aside className="demo-card">
                  <span className="demo-icon">
                    <Sparkles size={23} />
                  </span>
                  <span className="mini-label">Попробуйте без загрузки</span>
                  <h2>
                    От документов
                    <br />к ясной картине
                  </h2>
                  <p>
                    Вымышленная компания «Контур»: переименование отдела,
                    передача функций и три замечания для проверки.
                  </p>
                  <div className="demo-visual" aria-hidden="true">
                    <div>
                      <FileText size={20} />
                      <span>До</span>
                      <i />
                    </div>
                    <span className="connector">
                      <ArrowRight size={20} />
                    </span>
                    <div>
                      <FileCheck2 size={20} />
                      <span>После</span>
                      <i />
                    </div>
                  </div>
                  <button
                    className="demo-button"
                    disabled={busy}
                    onClick={runDemo}
                  >
                    Открыть пример <ArrowUpRight size={18} />
                  </button>
                  <small>Авторские данные · без вызова AI</small>
                  <details className="demo-options">
                    <summary>
                      Сценарий демонстрации <ChevronDown size={13} />
                    </summary>
                    <label htmlFor="scenario">
                      Проверить состояние интерфейса
                    </label>
                    <select
                      id="scenario"
                      value={scenario}
                      disabled={busy}
                      onChange={(e) =>
                        setScenario(e.target.value as DemoScenario)
                      }
                    >
                      <option value="complete">Полный пример</option>
                      <option value="partial">Неполное покрытие</option>
                      <option value="failed">Ошибка обработки</option>
                      <option value="empty">Пустой результат</option>
                    </select>
                  </details>
                </aside>
              </div>
              <div className="value-row">
                <div>
                  <Network />
                  <span>
                    <strong>Смысловые связи</strong>
                    <small>Функции и подразделения до / после</small>
                  </span>
                </div>
                <div>
                  <FileSearch />
                  <span>
                    <strong>Проверяемые выводы</strong>
                    <small>Точная цитата, версия и контекст</small>
                  </span>
                </div>
                <div>
                  <ShieldCheck />
                  <span>
                    <strong>Прозрачные ограничения</strong>
                    <small>Неполные данные всегда видны</small>
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div id="page-content" className="results" key={view}>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    {isDemo
                      ? "Компания «Контур» · авторский пример"
                      : "Анализ загруженных документов"}
                  </div>
                  <h1>
                    {view === "overview"
                      ? "Вся картина изменений"
                      : view === "comparison"
                        ? "От функции к ответственности"
                        : view === "findings"
                          ? "Что требует внимания"
                          : view === "documents"
                            ? "Основание вашего анализа"
                            : "Аналитическое заключение"}
                  </h1>
                  <p>
                    {view === "comparison"
                      ? "Сопоставляйте обязанности. Проверяйте основания."
                      : view === "findings"
                        ? "Рекомендательные замечания с документальными основаниями."
                        : view === "documents"
                          ? "Состав комплектов, качество чтения и ограничения."
                          : "Изменения, которые можно проследить до источника."}
                  </p>
                </div>
                <button
                  className="secondary export-button"
                  aria-label="Скачать JSON"
                  onClick={exportReport}
                >
                  <ArrowDownToLine size={17} />
                  <span>Скачать JSON</span>
                </button>
              </div>
              <div className="demo-ribbon">
                <FlaskConical size={16} />
                <span>
                  {isDemo
                    ? "Демонстрация интерфейса на авторском комплекте. Результат подготовлен заранее, модель не вызывалась."
                    : "Выводы сервера носят рекомендательный характер и требуют проверки сотрудником."}
                </span>
                {isDemo && (
                  <button onClick={newComparison}>
                    Свой комплект <ArrowRight size={14} />
                  </button>
                )}
              </div>
              {report.coverage.status === "partial" && (
                <Alert>
                  <strong>Анализ неполный</strong>
                  <p>{report.coverage.limitations.join(" ")}</p>
                </Alert>
              )}
              <div className="document-strip">
                {(["before", "after"] as Version[]).map((v, i) => (
                  <div className="document-strip-side" key={v}>
                    {i === 1 && <ArrowRight className="doc-arrow" size={20} />}
                    <span className={`doc-symbol ${v}`}>
                      <FileText size={22} />
                    </span>
                    <div>
                      <strong>
                        {v === "before" ? "До изменений" : "После изменений"}
                      </strong>
                      <span>
                        {report.documents
                          .filter((d) => d.version === v)
                          .map((d) => d.name)
                          .join(", ") || "Нет документов"}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="coverage-status">
                  <ShieldCheck size={19} />
                  <span>
                    {report.coverage.status === "complete"
                      ? "Комплект прочитан"
                      : "Неполное покрытие"}
                    <small>
                      {report.coverage.document_ids_checked.length} из{" "}
                      {report.documents.length} документов проверено
                    </small>
                  </span>
                </div>
              </div>
              {view === "overview" && (
                <>
                  <div className="stat-grid">
                    <button
                      onClick={() => {
                        navigate("comparison");
                        setTab("units");
                      }}
                    >
                      <span>Подразделения</span>
                      <strong>
                        {report.unit_changes.length}
                        <Network size={25} />
                      </strong>
                      <small>
                        Соответствия до и после <ArrowUpRight size={15} />
                      </small>
                    </button>
                    <button
                      onClick={() => {
                        navigate("comparison");
                        setTab("registry");
                      }}
                    >
                      <span>Функции в комплекте</span>
                      <strong>
                        {report.functions.length}
                        <Layers3 size={25} />
                      </strong>
                      <small>
                        Полный реестр извлечения <ArrowUpRight size={15} />
                      </small>
                    </button>
                    <button
                      className="attention-stat"
                      onClick={() => navigate("findings")}
                    >
                      <span>Требуют проверки</span>
                      <strong>
                        {report.findings.length}
                        <CircleAlert size={25} />
                      </strong>
                      <small>
                        Рекомендательные замечания <ArrowUpRight size={15} />
                      </small>
                    </button>
                  </div>
                  <div className="overview-grid">
                    <section className="panel">
                      <div className="panel-heading">
                        <h2>В фокусе внимания</h2>
                        <button
                          className="text-button"
                          onClick={() => navigate("findings")}
                        >
                          Все замечания <ArrowRight size={15} />
                        </button>
                      </div>
                      {report.findings.length ? (
                        report.findings.map((f, i) => (
                          <button
                            className={`focus-row${selection?.id === f.id ? " selected-row" : ""}`}
                            key={f.id}
                            onClick={() => open({ ...f, status: f.type })}
                          >
                            <span className={`finding-number ${tone(f.type)}`}>
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <span>
                              <Badge status={f.type} />
                              <strong>{f.title}</strong>
                              <small>
                                {f.evidence_ids.length} источника · Не проверено
                                сотрудником
                              </small>
                            </span>
                            <ChevronRight size={18} />
                          </button>
                        ))
                      ) : (
                        <Empty
                          title="Замечаний нет"
                          text="Это не доказывает отсутствие рисков. Проверьте реестр функций и покрытие."
                        />
                      )}
                    </section>
                    <section className="summary-card">
                      <span className="summary-icon">
                        <FileCheck2 size={24} />
                      </span>
                      <h2>Суть изменений</h2>
                      <p>{report.conclusion.summary}</p>
                      <button
                        className="text-button"
                        onClick={() => navigate("conclusion")}
                      >
                        Читать заключение <ArrowRight size={16} />
                      </button>
                      <div className="summary-note">
                        <ShieldCheck size={17} />
                        <span>
                          Каждое существенное замечание можно проверить по
                          исходному тексту.
                        </span>
                      </div>
                    </section>
                  </div>
                  <button
                    className="matrix-cta"
                    onClick={() => {
                      navigate("comparison");
                      setTab("functions");
                    }}
                  >
                    <span className="matrix-icon">
                      <GitCompareArrows size={26} />
                    </span>
                    <span>
                      <strong>Проследите путь каждой функции</strong>
                      <small>
                        Сохранённые, переданные и неустановленные обязанности в
                        одной матрице.
                      </small>
                    </span>
                    <ArrowRight size={24} />
                  </button>
                </>
              )}
              {view === "comparison" && (
                <>
                  <div
                    className="tabs"
                    role="tablist"
                    aria-label="Вид сравнения"
                  >
                    {(
                      [
                        ["functions", "Матрица функций"],
                        ["units", "Подразделения"],
                        ["registry", "Реестр функций"],
                      ] as [Tab, string][]
                    ).map(([id, label]) => (
                      <button
                        role="tab"
                        aria-selected={tab === id}
                        key={id}
                        className={tab === id ? "selected" : ""}
                        onClick={() => {
                          setTab(id);
                          setFilter("all");
                          setQuery("");
                          setSelection(null);
                        }}
                      >
                        {label}
                        <span>
                          {id === "functions"
                            ? report.function_matches.length
                            : id === "units"
                              ? report.unit_changes.length
                              : report.functions.length}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="table-toolbar">
                    <label className="search">
                      <Search size={18} />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Найти функцию или подразделение"
                        aria-label="Поиск в сравнении"
                      />
                      {query && (
                        <button
                          className="icon-button"
                          onClick={() => setQuery("")}
                          aria-label="Очистить поиск"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </label>
                    <label className="filter">
                      <ListFilter size={16} />
                      <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        aria-label="Фильтр сравнения"
                      >
                        <option value="all">Все статусы</option>
                        {(tab === "functions"
                          ? [
                              "preserved",
                              "transferred",
                              "changed",
                              "unresolved",
                            ]
                          : tab === "units"
                            ? [
                                "preserved",
                                "renamed",
                                "merged",
                                "split",
                                "created",
                                "removed",
                                "unresolved",
                              ]
                            : ["before", "after"]
                        ).map((s) => (
                          <option key={s} value={s}>
                            {s === "before"
                              ? "До изменений"
                              : s === "after"
                                ? "После изменений"
                                : labels[s]}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <section className="panel table-panel" key={tab}>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            {(tab === "functions"
                              ? [
                                  "Функция",
                                  "До изменений",
                                  "После изменений",
                                  "Статус",
                                  "",
                                ]
                              : tab === "units"
                                ? [
                                    "До изменений",
                                    "После изменений",
                                    "Изменение",
                                    "",
                                  ]
                                : ["Функция", "Подразделение", "Версия", ""]
                            ).map((t, i) => (
                              <th key={i}>{t}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tab === "functions" &&
                            matches.map((m) => (
                              <tr
                                key={m.id}
                                className={
                                  selection?.id === m.id ? "selected-row" : ""
                                }
                              >
                                <td>
                                  <button
                                    className="table-link"
                                    onClick={() => open(matchSelection(m))}
                                  >
                                    {functionTitle(m.before_function_ids) ||
                                      functionTitle(m.after_function_ids)}
                                    <small>
                                      {m.evidence_ids.length} источника
                                    </small>
                                  </button>
                                </td>
                                <td>{functionUnits(m.before_function_ids)}</td>
                                <td>{functionUnits(m.after_function_ids)}</td>
                                <td>
                                  <Badge status={m.status} />
                                </td>
                                <td>
                                  <button
                                    className="icon-button"
                                    aria-label={`Источники ${m.id}`}
                                    onClick={() => open(matchSelection(m))}
                                  >
                                    <ChevronRight size={17} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          {tab === "units" &&
                            units.map((u) => (
                              <tr
                                key={u.id}
                                className={
                                  selection?.id === u.id ? "selected-row" : ""
                                }
                              >
                                <td>
                                  <button
                                    className="table-link"
                                    onClick={() =>
                                      open({
                                        ...u,
                                        title:
                                          u.before_unit_ids.join(", ") ||
                                          u.after_unit_ids.join(", "),
                                        status: u.kind,
                                      })
                                    }
                                  >
                                    {u.before_unit_ids.join(", ") || "—"}
                                  </button>
                                </td>
                                <td>{u.after_unit_ids.join(", ") || "—"}</td>
                                <td>
                                  <Badge status={u.kind} />
                                </td>
                                <td>
                                  <button
                                    className="icon-button"
                                    aria-label={`Источники подразделения ${u.id}`}
                                    onClick={() =>
                                      open({
                                        ...u,
                                        title:
                                          u.before_unit_ids.join(", ") ||
                                          u.after_unit_ids.join(", "),
                                        status: u.kind,
                                      })
                                    }
                                  >
                                    <ChevronRight size={17} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          {tab === "registry" &&
                            registry.map((f) => (
                              <tr
                                key={f.id}
                                className={
                                  selection?.id === f.id ? "selected-row" : ""
                                }
                              >
                                <td>
                                  <button
                                    className="table-link"
                                    onClick={() =>
                                      open({
                                        id: f.id,
                                        title: `${f.action} ${f.object}`,
                                        explanation:
                                          [f.scope, f.role]
                                            .filter(Boolean)
                                            .join(" · ") ||
                                          "Функция из реестра извлечения. Наличие соответствия проверяется отдельно в матрице.",
                                        evidence_ids: f.evidence_ids,
                                        status: "read",
                                      })
                                    }
                                  >
                                    {f.action} {f.object}
                                    <small>
                                      {f.scope || "Область не уточнена"}
                                    </small>
                                  </button>
                                </td>
                                <td>{f.unit_id}</td>
                                <td>
                                  <span className={`version-chip ${f.version}`}>
                                    {f.version === "before" ? "До" : "После"}
                                  </span>
                                </td>
                                <td>
                                  <FileText size={17} />
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                    {!(
                      tab === "functions"
                        ? matches
                        : tab === "units"
                          ? units
                          : registry
                    ).length && (
                      <Empty
                        title="Совпадений нет"
                        text="Измените запрос или фильтр. Если данные отсутствуют, проверьте покрытие анализа."
                      />
                    )}
                    <div className="table-footer">
                      <span>
                        Показано{" "}
                        {
                          (tab === "functions"
                            ? matches
                            : tab === "units"
                              ? units
                              : registry
                          ).length
                        }{" "}
                        записей
                      </span>
                      <span>
                        <Link2 size={13} />
                        Выберите запись, чтобы проверить источник
                      </span>
                    </div>
                  </section>
                </>
              )}
              {view === "findings" && (
                <>
                  <div className="table-toolbar">
                    <label className="search">
                      <Search size={18} />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Найти замечание"
                        aria-label="Поиск замечаний"
                      />
                    </label>
                    <label className="filter">
                      <ListFilter size={16} />
                      <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        aria-label="Тип замечания"
                      >
                        <option value="all">Все замечания</option>
                        {[
                          "possible_loss",
                          "possible_duplication",
                          "potential_conflict",
                          "insufficient_evidence",
                        ].map((s) => (
                          <option key={s} value={s}>
                            {labels[s]}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="findings-list">
                    {findings.map((f) => (
                      <article
                        className={`finding-card ${selection?.id === f.id ? "chosen" : ""}`}
                        key={f.id}
                      >
                        <div className="finding-meta">
                          <Badge status={f.type} />
                          <span>
                            <Clock3 size={13} />
                            Не проверено сотрудником
                          </span>
                        </div>
                        <h2>{f.title}</h2>
                        <p>{f.explanation}</p>
                        <div className="finding-bottom">
                          <span>
                            <Link2 size={15} />
                            {f.evidence_ids.length} источника
                          </span>
                          <button
                            className="text-button"
                            onClick={() => open({ ...f, status: f.type })}
                          >
                            Проверить основания <ArrowUpRight size={16} />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                  {!findings.length && (
                    <Empty
                      title="Замечаний не найдено"
                      text="Проверьте фильтр и покрытие. Отсутствие замечаний не гарантирует отсутствие рисков."
                    />
                  )}
                </>
              )}
              {view === "documents" && (
                <>
                  <div className="documents-grid">
                    {(["before", "after"] as Version[]).map((v) => (
                      <section className="panel" key={v}>
                        <div className="panel-heading">
                          <h2>
                            {v === "before"
                              ? "До изменений"
                              : "После изменений"}
                          </h2>
                          <span>
                            {
                              report.documents.filter((d) => d.version === v)
                                .length
                            }{" "}
                            файл(а)
                          </span>
                        </div>
                        {report.documents
                          .filter((d) => d.version === v)
                          .map((d) => (
                            <article
                              className="document-row"
                              key={d.document_id}
                            >
                              <FileText size={26} />
                              <div>
                                <h3>{d.name}</h3>
                                <Badge status={d.extraction_status} />
                                {d.warnings.map((w, i) => (
                                  <p className="field-error" key={i}>
                                    {w}
                                  </p>
                                ))}
                                {isDemo &&
                                  ["before", "after"].includes(
                                    d.document_id,
                                  ) && (
                                    <a
                                      className="source-link"
                                      href={`/demo/${v}.md`}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      Исходный текст <ArrowUpRight size={14} />
                                    </a>
                                  )}
                              </div>
                            </article>
                          ))}
                      </section>
                    ))}
                  </div>
                  <section className="panel coverage-panel">
                    <h2>Что означает покрытие</h2>
                    <p>
                      «Прочитан» относится к извлечению текста. Полный комплект
                      не гарантирует правильность смысловых выводов.
                    </p>
                    {report.coverage.limitations.map((s, i) => (
                      <p className="limitation" key={i}>
                        {s}
                      </p>
                    ))}
                  </section>
                </>
              )}
              {view === "conclusion" && (
                <div className="conclusion-layout">
                  <article className="report-paper">
                    <div className="report-paper-top">
                      <span className="brand-mark">
                        <Files size={22} />
                      </span>
                      <span>
                        Аналитическое заключение
                        <small>
                          {isDemo
                            ? "Авторский пример · не результат AI"
                            : `Анализ ${report.analysis_id}`}
                        </small>
                      </span>
                    </div>
                    <h2>
                      Изменения в структуре
                      <br />и распределении функций
                    </h2>
                    <p className="report-lead">{report.conclusion.summary}</p>
                    <h3>Рекомендуемые действия</h3>
                    {report.conclusion.recommendations.length ? (
                      report.conclusion.recommendations.map((r, i) => (
                        <div className="recommendation" key={i}>
                          <span>{String(i + 1).padStart(2, "0")}</span>
                          <div>
                            <p>{r.text}</p>
                            {r.evidence_ids.length > 0 && (
                              <button
                                className="text-button"
                                onClick={() =>
                                  open({
                                    id: `rec-${i}`,
                                    title: r.text,
                                    explanation:
                                      "Рекомендация связана с указанными источниками. Проверьте её перед применением.",
                                    evidence_ids: r.evidence_ids,
                                    status: "unresolved",
                                  })
                                }
                              >
                                Проверить основания <ArrowUpRight size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p>Рекомендации не сформированы.</p>
                    )}
                    <h3>Ограничения заключения</h3>
                    <ul>
                      {unique([
                        ...report.conclusion.limitations,
                        ...report.coverage.limitations,
                      ]).map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                    <footer>
                      <ShieldCheck size={18} />
                      Окончательная оценка остаётся за ответственным
                      сотрудником.
                    </footer>
                  </article>
                  <aside className="report-side">
                    <h3>Состав отчёта</h3>
                    <p>{report.documents.length} документа</p>
                    <p>{report.function_matches.length} соответствий функций</p>
                    <p>{report.findings.length} замечания для проверки</p>
                    <button className="secondary" onClick={exportReport}>
                      <ArrowDownToLine size={16} />
                      Скачать JSON
                    </button>
                    <details className="activity">
                      <summary>
                        Действия системы <ChevronDown size={14} />
                      </summary>
                      {report.activity.length ? (
                        report.activity.map((a, i) => (
                          <p key={i}>
                            <strong>{a.operation}</strong>
                            <br />
                            {a.status}
                          </p>
                        ))
                      ) : (
                        <p>
                          {isDemo
                            ? "В деморежиме инструменты и модель не вызываются."
                            : "Сервер не предоставил журнал операций."}
                        </p>
                      )}
                    </details>
                  </aside>
                </div>
              )}
              <footer className="page-footer">
                <span>
                  <ShieldCheck size={14} />
                  Основания открыты для проверки
                </span>
                <span>Amazing Guys · HackAlem</span>
              </footer>
            </div>
          )}
          {error && !busy && (
            <div className="error-panel">
              <Alert danger>
                <strong>Не удалось завершить обработку</strong>
                <p>{error.message}</p>
                <div className="error-actions">
                  {error.retryable && (
                    <button
                      className="secondary"
                      onClick={mode === "demo" ? runDemo : runApi}
                    >
                      Повторить
                    </button>
                  )}
                  <button
                    className="text-button"
                    onClick={() => setError(null)}
                  >
                    Закрыть
                  </button>
                </div>
              </Alert>
            </div>
          )}
        </main>
      </div>
      {selection && report && isResult && (
        <Inspector
          selection={selection}
          report={report}
          isDemo={isDemo}
          onClose={() => setSelection(null)}
          returnFocusTo={sourceTrigger}
        />
      )}
      {busy && (
        <div className="processing-overlay">
          <section
            className="processing-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="processing-title"
          >
            <div className="processing-orbit">
              <div />
              <FileSearch size={35} />
            </div>
            <span className="mini-label">
              {mode === "demo" ? "Демонстрация этапов" : "Обработка документов"}
            </span>
            <h2 id="processing-title">{stageNames[stage]}</h2>
            <p>
              {mode === "demo"
                ? "Показываем подготовленный пример. AI не вызывается."
                : "Проверяем статус на сервере. Это может занять несколько минут."}
            </p>
            <ol className="stage-list">
              {visibleStages.map((s, i) => (
                <li
                  key={s}
                  className={
                    i < visibleStages.indexOf(stage)
                      ? "done"
                      : stage === s
                        ? "current"
                        : ""
                  }
                >
                  {i < visibleStages.indexOf(stage) ? (
                    <Check size={16} />
                  ) : stage === s ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : (
                    <span className="stage-dot" />
                  )}
                  {stageNames[s]}
                </li>
              ))}
            </ol>
            {progress?.warnings.map((w, i) => (
              <Alert key={i}>{w}</Alert>
            ))}
            {progress?.documents
              .filter((d) => d.extraction_status !== "read")
              .map((d) => (
                <p className="field-error" key={d.document_id}>
                  {d.name}: {labels[d.extraction_status]} {d.warnings.join(" ")}
                </p>
              ))}
            <button autoFocus className="text-button" onClick={cancel}>
              {mode === "demo"
                ? "Остановить демонстрацию"
                : "Остановить ожидание"}
            </button>
          </section>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <CircleCheck size={18} />
          {toast}
          <button
            className="icon-button"
            onClick={() => setToast("")}
            aria-label="Закрыть уведомление"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
