# HTTP-примеры r1

Авторские примеры для разработки UI, не результаты модели. `report.json` и цитаты получены через TestClient с подменой агента. `failed.json` и `report-partial.json` — производные примеры состояний. Модель не вызывается. ID из этих файлов не существует в запущенном сервере.

Схемы: `openapi.json`, источник — `backend/models.py` и маршруты приложения. Обновление из корня:

```sh
uv run --project backend --locked python -m backend.export_contract
```

Начало: `accepted.json`; опрос: `completed.json` / `failed.json`; результат: `report.json` / `report-partial.json`; цитаты: `evidence-before.json` / `evidence-after.json`; неверный ввод: `invalid-input.json`.
