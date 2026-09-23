import { z } from "zod";
import {
  acceptedSchema,
  errorSchema,
  evidenceSchema,
  reportSchema,
  statusSchema,
} from "./contracts";
export const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");
export class ApiError extends Error {
  constructor(
    message: string,
    public retryable = false,
    public status = 0,
  ) {
    super(message);
  }
}
async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: init.signal
        ? AbortSignal.any([init.signal, AbortSignal.timeout(30_000)])
        : AbortSignal.timeout(30_000),
    });
  } catch (error) {
    if (init.signal?.aborted) throw error;
    throw new ApiError(
      "Сервер не ответил. Проверьте его запуск и адрес подключения. Выбранные файлы сохранены в этой вкладке.",
      true,
    );
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = errorSchema.safeParse(body?.error);
    throw new ApiError(
      parsed.success
        ? parsed.data.message
        : `Сервер вернул ошибку ${response.status}.`,
      parsed.success ? parsed.data.retryable : response.status >= 500,
      response.status,
    );
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    throw new ApiError(
      "Формат ответа сервера не соответствует контракту r1. Нужна проверка интеграции.",
    );
  return parsed.data;
}
export const api = {
  start(before: File[], after: File[], key: string, signal: AbortSignal) {
    const data = new FormData();
    before.forEach((f) => data.append("before_files", f));
    after.forEach((f) => data.append("after_files", f));
    return request("/api/analyses", acceptedSchema, {
      method: "POST",
      headers: { "Idempotency-Key": key },
      body: data,
      signal,
    });
  },
  status(id: string, signal: AbortSignal) {
    return request(`/api/analyses/${encodeURIComponent(id)}`, statusSchema, {
      signal,
    });
  },
  report(id: string, signal: AbortSignal) {
    return request(
      `/api/analyses/${encodeURIComponent(id)}/report`,
      reportSchema,
      { signal },
    );
  },
  evidence(id: string, evidenceId: string, signal: AbortSignal) {
    return request(
      `/api/analyses/${encodeURIComponent(id)}/evidence/${encodeURIComponent(evidenceId)}`,
      evidenceSchema,
      { signal },
    );
  },
};
export function delay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted)
      return reject(new DOMException("Aborted", "AbortError"));
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal.addEventListener("abort", abort, { once: true });
  });
}
export const MAX_SIZE = 5 * 1024 * 1024;
export const ACCEPT = ".pdf,.docx,.xlsx,.txt,.md";
export function validateFiles(files: File[]) {
  if (files.length > 5)
    return "Можно выбрать не более 5 файлов в каждом комплекте.";
  for (const f of files) {
    if (!/\.(pdf|docx|xlsx|txt|md)$/i.test(f.name))
      return `«${f.name}»: используйте PDF, DOCX, XLSX, TXT или MD. Старые DOC и XLS нужно преобразовать.`;
    if (!f.size) return `«${f.name}»: файл пуст.`;
    if (f.size > MAX_SIZE) return `«${f.name}»: размер превышает 5 МиБ.`;
  }
  return "";
}
