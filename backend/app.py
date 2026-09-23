"""Run from the repository root: uv run --project backend uvicorn backend.app:app."""
import asyncio
import hashlib
import logging
import re
import uuid
from contextlib import asynccontextmanager
from pathlib import Path, PureWindowsPath
from typing import Annotated

from fastapi import BackgroundTasks, FastAPI, File, Header, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from starlette.exceptions import HTTPException

from backend.agent import AgentFailure, run_agent
from backend.config import Settings
from backend.context import source_characters
from backend.extraction import SUPPORTED_EXTENSIONS, extract_document
from backend.models import (AnalysisAccepted, AnalysisStatus, Document, ErrorResponse,
                            Evidence, HealthResponse, Report)
from backend.storage import Store

logger = logging.getLogger(__name__)


def error_responses(*codes: int):
    descriptions = {
        400: "Malformed request.",
        404: "Analysis or evidence not found.",
        409: "Idempotency conflict or report not ready.",
        413: "Uploaded file exceeds the size limit.",
        422: "Invalid request fields or uploaded files.",
        429: "Analysis queue is full; retry later.",
        503: "Model is not configured.",
    }
    return {code: {"model": ErrorResponse, "description": descriptions[code]} for code in codes}


class ApiProblem(Exception):
    def __init__(self, status: int, code: str, message: str, retryable: bool = False):
        self.status, self.code, self.message, self.retryable = status, code, message, retryable

    def body(self):
        return {"error": {"code": self.code, "message": self.message, "retryable": self.retryable}}


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings.from_env()
    store = Store(settings.data_dir)
    model_lock = asyncio.Lock()

    @asynccontextmanager
    async def lifespan(app):
        store.recover_interrupted()
        yield

    app = FastAPI(title="Анализ функций до/после", version="0.1.0", lifespan=lifespan)
    app.state.store = store
    app.state.settings = settings
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins,
                       allow_credentials=False, allow_methods=["GET", "POST"],
                       allow_headers=["Content-Type", "Idempotency-Key"])

    @app.exception_handler(ApiProblem)
    async def api_problem(request, error):
        return JSONResponse(status_code=error.status, content=error.body())

    @app.exception_handler(RequestValidationError)
    async def invalid_input(request, error):
        return JSONResponse(status_code=422, content={"error": {
            "code": "invalid_input", "message": "Загрузите непустые комплекты «до» и «после».", "retryable": False}})

    @app.exception_handler(HTTPException)
    async def http_error(request, error):
        return JSONResponse(status_code=error.status_code, content={"error": {
            "code": "request_error", "message": "Запрос не может быть обработан.", "retryable": False}})

    def get_record(analysis_id):
        try:
            return store.get(analysis_id)
        except KeyError:
            raise ApiProblem(404, "analysis_not_found", "Анализ не найден.")

    async def process(analysis_id: str, files: list[tuple[str, str, bytes]]):
        async with model_lock:
            store.update(analysis_id, status="running", stage="extracting")
            documents: list[Document] = []
            evidence: list[Evidence] = []
            try:
                for index, (version, name, content) in enumerate(files, 1):
                    document, fragments = await asyncio.to_thread(
                        extract_document, content, name, version, f"doc-{index:03}")
                    documents.append(document)
                    evidence.extend(fragments)
                doc_json = [d.model_dump() for d in documents]
                source_json = {e.evidence_id: e.model_dump() for e in evidence}
                store.update(analysis_id, documents=doc_json, evidence=source_json,
                             warnings=[warning for d in documents for warning in d.warnings])
                if any(not any(e.version == side for e in evidence) for side in ("before", "after")):
                    raise ApiProblem(422, "no_readable_text", "Не удалось прочитать текст хотя бы в одном из комплектов. Проверьте файлы; OCR пока не подключён.")
                if source_characters(evidence) > settings.max_total_chars:
                    raise ApiProblem(413, "text_limit", "Комплект превышает лимит текста первой версии. Уменьшите число или размер документов.")
                store.update(analysis_id, stage="verifying")
                result = await asyncio.wait_for(run_agent(documents, evidence, settings), timeout=settings.analysis_timeout_seconds)
                limitations = [warning for d in documents for warning in d.warnings]
                coverage = {
                    "status": "partial" if any(d.extraction_status != "read" for d in documents) else "complete",
                    "document_ids_checked": [d.document_id for d in documents if d.extraction_status != "failed"],
                    "unread_document_ids": [d.document_id for d in documents if d.extraction_status == "failed"],
                    "limitations": limitations + ["Полнота указана только для предоставленных документов. Семантические выводы требуют проверки сотрудником."],
                }
                report = {"contract_version": "r1", "analysis_id": analysis_id,
                          "coverage": coverage, "documents": doc_json,
                          **result.payload.model_dump(),
                          "activity": [a.model_dump() for a in result.activity],
                          "usage": result.usage.model_dump()}
                store.update(analysis_id, stage="reporting", report=report, usage=result.usage.model_dump())
                store.update(analysis_id, status="completed", stage="reporting")
            except ApiProblem as error:
                store.update(analysis_id, status="failed", error=error.body()["error"])
            except AgentFailure as error:
                usage = getattr(error, "usage", None)
                store.update(analysis_id, status="failed", error={"code": error.code, "message": error.message, "retryable": error.retryable},
                             usage=usage.model_dump() if hasattr(usage, "model_dump") else usage)
            except TimeoutError:
                store.update(analysis_id, status="failed", error={"code": "analysis_timeout", "message": "Превышено время анализа. Попробуйте меньший комплект.", "retryable": True})
            except Exception as error:
                # Do not serialize provider messages, input text, keys or stack traces into responses.
                logger.error("Analysis failed (%s)", type(error).__name__)
                store.update(analysis_id, status="failed", error={"code": "analysis_failed", "message": "Анализ не завершён. Попробуйте повторить обработку.", "retryable": True})

    @app.get("/api/health", response_model=HealthResponse)
    def health():
        return {"status": "ok", "contract_version": "r1", "model": settings.model,
                "model_configured": bool(settings.api_key), "supported_extensions": sorted(SUPPORTED_EXTENSIONS)}

    @app.post("/api/analyses", status_code=202, response_model=AnalysisAccepted,
              responses=error_responses(400, 409, 413, 422, 429, 503))
    async def create_analysis(background_tasks: BackgroundTasks,
                              before_files: Annotated[list[UploadFile], File()],
                              after_files: Annotated[list[UploadFile], File()],
                              idempotency_key: Annotated[str | None, Header()] = None):
        if any(not group or len(group) > settings.max_files_per_side for group in (before_files, after_files)):
            raise ApiProblem(422, "file_count", f"Нужно от 1 до {settings.max_files_per_side} файлов в каждом комплекте.")
        if idempotency_key and not re.fullmatch(r"[A-Za-z0-9_-]{1,100}", idempotency_key):
            raise ApiProblem(422, "invalid_idempotency_key", "Неверный Idempotency-Key.")
        files = []
        digest = hashlib.sha256()
        try:
            for version, group in (("before", before_files), ("after", after_files)):
                for upload in group:
                    name = PureWindowsPath(upload.filename or "").name
                    if not name or len(name) > 200 or Path(name).suffix.lower() not in SUPPORTED_EXTENSIONS:
                        raise ApiProblem(422, "unsupported_file", "Поддерживаются DOCX, XLSX, PDF, TXT и MD. Старые DOC/XLS и изображения пока не поддерживаются.")
                    content = await upload.read(settings.max_file_bytes + 1)
                    if not content:
                        raise ApiProblem(422, "empty_file", "Один из файлов пуст.")
                    if len(content) > settings.max_file_bytes:
                        raise ApiProblem(413, "file_too_large", "Файл превышает лимит 5 МБ.")
                    files.append((version, name, content))
                    for part in (version.encode(), name.encode(), content):
                        digest.update(len(part).to_bytes(8, "big"))
                        digest.update(part)
        finally:
            for upload in before_files + after_files:
                await upload.close()
        fingerprint = digest.hexdigest()
        with store.lock:
            records = store.records()
            for record in records:
                if idempotency_key and record.get("idempotency_key") == idempotency_key:
                    if record["fingerprint"] != fingerprint:
                        raise ApiProblem(409, "idempotency_conflict", "Этот ключ уже использован с другим комплектом.")
                    return {"analysis_id": record["analysis_id"], "status": record["status"], "contract_version": "r1"}
            if not settings.api_key:
                raise ApiProblem(503, "model_not_configured", "Добавьте OPENAI_API_KEY в локальный .env проекта и перезапустите сервер.", True)
            if sum(r["status"] in {"queued", "running"} for r in records) >= 2:
                raise ApiProblem(429, "queue_full", "Дождитесь завершения текущего анализа.", True)
            analysis_id = uuid.uuid4().hex
            store.put({"analysis_id": analysis_id, "contract_version": "r1", "status": "queued",
                       "stage": "extracting", "documents": [], "warnings": [], "error": None,
                       "evidence": {}, "idempotency_key": idempotency_key, "fingerprint": fingerprint})
        background_tasks.add_task(process, analysis_id, files)
        return {"analysis_id": analysis_id, "status": "queued", "contract_version": "r1"}

    @app.get("/api/analyses/{analysis_id}", response_model=AnalysisStatus,
             responses=error_responses(404, 422))
    def analysis_status(analysis_id: str):
        record = get_record(analysis_id)
        return {key: record.get(key) for key in ("analysis_id", "contract_version", "status", "stage", "documents", "warnings", "error", "usage")}

    @app.get("/api/analyses/{analysis_id}/report", response_model=Report,
             responses=error_responses(404, 409, 422))
    def analysis_report(analysis_id: str):
        record = get_record(analysis_id)
        if record["status"] != "completed":
            raise ApiProblem(409, "report_not_ready", "Отчёт ещё не готов. Проверьте состояние анализа.")
        return record["report"]

    @app.get("/api/analyses/{analysis_id}/evidence/{evidence_id}", response_model=Evidence,
             responses=error_responses(404, 422))
    def get_evidence(analysis_id: str, evidence_id: str):
        record = get_record(analysis_id)
        evidence = record["evidence"].get(evidence_id)
        if evidence is None:
            raise ApiProblem(404, "evidence_not_found", "Источник не найден в этом анализе.")
        return evidence

    @app.get("/", include_in_schema=False)
    def demo():
        return FileResponse(Path(__file__).parent / "static" / "demo.html")

    return app


app = create_app()
