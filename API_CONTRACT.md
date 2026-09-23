# Контракт r1

Маршруты реализованы в FastAPI. Схемы: /openapi.json и fixtures/api/openapi.json; источник — backend/models.py. Общие HTTP-примеры — fixtures/api/ (авторские, с подменой модели). expected.json — эталон случаев, не HTTP-ответ. Живые проверки модели и ограничения текущей версии описаны в docs/INTEGRATION_RESULTS.md.

| Действие | HTTP | Ответ |
| --- | --- | --- |
| Проверить сервер | GET /api/health | status, contract_version, model, model_configured, supported_extensions |
| Начать анализ | POST /api/analyses | multipart before_files/after_files; оба списка непустые; 202: analysis_id, status, contract_version |
| Ход обработки | GET /api/analyses/{id} | status, stage, documents, warnings |
| Отчёт | GET /api/analyses/{id}/report | результат или 409, пока не завершён |
| Открыть источник | GET /api/analyses/{id}/evidence/{evidence_id} | точный фрагмент внутри этого анализа |

Статусы: queued/running/completed/failed. Этапы: extracting/matching/verifying/reporting. Не показывать выдуманный процент готовности. completed означает конец процесса; coverage отдельно обозначает complete/partial относительно загруженного комплекта.

POST с прежним Idempotency-Key и тем же содержимым возвращает прежний анализ; с другим содержимым — 409. Новый осознанный прогон — новый ключ. GET не запускает модель.

HTTP-ошибки API имеют конверт `{"error":{"code":"invalid_input","message":"…","retryable":false}}`; OpenAPI описывает его моделью ErrorResponse, включая ошибки валидации 422. Стандартный формат FastAPI `detail` не используется. Не возвращать ключи/трассировки пользователю.

| Маршрут | HTTP-ошибки |
| --- | --- |
| POST /api/analyses | 400 некорректный multipart; 409 ключ использован с другим комплектом; 413 размер файла; 422 неверный ввод; 429 очередь заполнена; 503 ключ модели не настроен |
| GET /api/analyses/{id} | 404 анализ не найден; 422 неверные параметры |
| GET /api/analyses/{id}/report | 404 анализ не найден; 409 отчёт не готов; 422 неверные параметры |
| GET /api/analyses/{id}/evidence/{evidence_id} | 404 анализ или источник не найден; 422 неверные параметры |

Ошибка фонового анализа находится в `error` статуса `failed`; GET статуса возвращает 200. Это объект ApiError с полями code, message, retryable, без дополнительного вложенного error. Ошибки модели и лимит извлечённого текста относятся к фоновому анализу после принятия POST с 202.

## Отчёт

- contract_version, analysis_id.
- coverage: status, document_ids_checked, unread_document_ids, limitations.
- documents: document_id, version (before/after), name, extraction_status (read/partial/failed), warnings.
- unit_changes: id, before_unit_ids, after_unit_ids, kind (preserved/renamed/merged/split/created/removed/unresolved), evidence_ids, explanation.
- functions: id, version, unit_id, action, object, scope, role, evidence_ids. Неизвестное — null.
- function_matches: id, before_function_ids, after_function_ids, status (preserved/transferred/changed/unresolved), evidence_ids, explanation.
- Строка функции только версии after может иметь пустой before_function_ids со статусом changed/unresolved; это не доказательство появления функции во всей организации. preserved/transferred требуют функции before. Оба списка одновременно пустыми быть не могут. Каждая извлечённая функция before по-прежнему должна входить в матрицу.
- findings: структура ниже.
- conclusion: summary, limitations, recommendations. Существенные рекомендации содержат finding_ids/evidence_ids.
- activity: operation, status, referenced_ids — фактические краткие события инструментов без скрытых рассуждений.

## Замечание

id, type (possible_loss/possible_duplication/potential_conflict/insufficient_evidence), title, explanation, before_function_ids, after_function_ids, evidence_ids, checked_after_document_ids, limitations, human_review.

Для possible_loss обязательны исходный фрагмент, checked_after_document_ids и оговорка об охвате. Численный confidence не вводится без калибровки. human_review сначала unreviewed; confirmed/rejected зарезервированы, кнопки сохранения пока не входят в первый этап.

## Источник

evidence_id, document_id, version, document_name, locator, quote, context, extraction_warning.

locator: kind (paragraph/table_cell/pdf_page/sheet_range), section, paragraph_index, page, sheet, cell_range; неприменимые поля null. quote точно совпадает с извлечённым текстом. UI показывает адрес и контекст безопасным текстом, не исполняет HTML. Абсолютные пути машины не передаются.

## Изменения договора

Координатор обновляет договор и ревизию до зависимых изменений UI/backend. Друг сообщает недостающую операцию с примером; самостоятельно переименовывать поля нельзя.

## Подключение

Базовый URL: http://127.0.0.1:8000. CORS по умолчанию: localhost/127.0.0.1 с портами 5173/4173/3000; 4173 используется для просмотра production-сборки Vite. CORS_ORIGINS в .env добавляет адреса к этим локальным origin; стандартные локальные адреса сохраняются. Разрешены GET/POST и заголовки Content-Type/Idempotency-Key, включая предварительный OPTIONS-запрос браузера. GET /api/health не вызывает модель; model_configured означает наличие ключа, не проверку баланса или доступности провайдера. Схема HealthResponse включает status="ok", contract_version="r1", model, model_configured и список supported_extensions.

POST: повторяющиеся поля before_files/after_files, по 1–5 файлов, каждый до 5 МиБ. Один UUID Idempotency-Key на нажатие; сетевой повтор использует прежний ключ и порядок файлов. Новый анализ — новый ключ. Реальные этапы: extracting → verifying → reporting; matching зарезервирован.

Источник: encodeURIComponent(evidence_id), пример doc-001:e00001. unit_id — читаемое название подразделения, отдельного endpoint нет. Предупреждения: documents[].warnings и warnings статуса.

Отчёт дополнительно содержит usage: model, calls, input_tokens, output_tokens, estimated_cost_usd (null при неизвестном расходе). Это оценка стоимости, не биллинг и не подтверждение промокредита. activity содержит фактические search_functions/read_evidence и validate_references; валидация структурная.
