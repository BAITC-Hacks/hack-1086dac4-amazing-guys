"""Exercise documented HTTP failures and browser origins without model calls."""
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.app import create_app
from backend.config import Settings
from backend.models import ErrorResponse, HealthResponse


def uploads(after=b"After"):
    return [("before_files", ("before.txt", b"Before", "text/plain")),
            ("after_files", ("after.txt", after, "text/plain"))]


@pytest.fixture
def client(tmp_path, monkeypatch):
    async def forbidden_model_call(*args, **kwargs):
        pytest.fail("HTTP contract checks must not call the model")

    monkeypatch.setattr("backend.app.run_agent", forbidden_model_call)
    with TestClient(create_app(Settings(api_key="", data_dir=tmp_path))) as result:
        yield result


def assert_error(client, response, method, route, status, code, retryable=False):
    assert response.status_code == status
    error = ErrorResponse.model_validate(response.json()).error
    assert error.code == code
    assert error.retryable is retryable
    assert error.message
    documented = client.app.openapi()["paths"][route][method]["responses"][str(status)]
    assert documented["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/ErrorResponse"}


def test_validation_size_configuration_and_malformed_request(client):
    route = "/api/analyses"
    assert_error(client, client.post(route), "post", route, 422, "invalid_input")
    assert_error(client, client.post(route, files=uploads(b"")),
                 "post", route, 422, "empty_file")
    client.app.state.settings.max_file_bytes = 10
    assert_error(client, client.post(route, files=uploads(b"x" * 11)),
                 "post", route, 413, "file_too_large")
    assert_error(client, client.post(route, files=uploads()),
                 "post", route, 503, "model_not_configured", True)
    malformed = client.post(route, content=b"invalid multipart",
                            headers={"Content-Type": "multipart/form-data"})
    assert_error(client, malformed, "post", route, 400, "request_error")


def test_missing_objects_and_report_not_ready(client):
    aid = "a" * 32
    for suffix, template in [
        ("", ""), ("/report", "/report"),
        ("/evidence/missing", "/evidence/{evidence_id}"),
    ]:
        assert_error(client, client.get(f"/api/analyses/{aid}{suffix}"),
                     "get", "/api/analyses/{analysis_id}" + template,
                     404, "analysis_not_found")
    client.app.state.store.put({"analysis_id": aid, "status": "failed", "evidence": {}})
    assert_error(client, client.get(f"/api/analyses/{aid}/report"),
                 "get", "/api/analyses/{analysis_id}/report", 409, "report_not_ready")
    assert_error(client, client.get(f"/api/analyses/{aid}/evidence/missing"),
                 "get", "/api/analyses/{analysis_id}/evidence/{evidence_id}",
                 404, "evidence_not_found")


def test_idempotency_conflict_and_queue_full(client):
    route = "/api/analyses"
    client.app.state.store.put({"analysis_id": "a" * 32, "status": "queued",
                                "idempotency_key": "existing", "fingerprint": "different"})
    assert_error(client, client.post(route, files=uploads(), headers={"Idempotency-Key": "existing"}),
                 "post", route, 409, "idempotency_conflict")
    client.app.state.store.put({"analysis_id": "b" * 32, "status": "running"})
    client.app.state.settings.api_key = "test-only"
    assert_error(client, client.post(route, files=uploads()),
                 "post", route, 429, "queue_full", True)


def test_health_and_exported_openapi_match_runtime(client):
    health = HealthResponse.model_validate(client.get("/api/health").json())
    assert health.status == "ok"
    assert health.model_configured is False
    assert ".txt" in health.supported_extensions
    schema = client.get("/openapi.json").json()
    assert "HTTPValidationError" not in schema["components"]["schemas"]
    assert schema["components"]["schemas"]["ErrorResponse"]["properties"]["error"] == {
        "$ref": "#/components/schemas/ApiError"}
    assert set(schema["components"]["schemas"]["ApiError"]["required"]) == {
        "code", "message", "retryable"}
    fixture = Path(__file__).resolve().parents[2] / "fixtures" / "api" / "openapi.json"
    assert json.loads(fixture.read_text(encoding="utf-8")) == schema


@pytest.mark.parametrize("origin", ["http://localhost:4173", "http://127.0.0.1:4173"])
def test_production_preview_cors_preflight_and_error_response(client, origin):
    response = client.options("/api/analyses", headers={
        "Origin": origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type,idempotency-key",
    })
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
    assert "POST" in response.headers["access-control-allow-methods"]
    assert "idempotency-key" in response.headers["access-control-allow-headers"].lower()
    error = client.post("/api/analyses", files=uploads(), headers={"Origin": origin})
    assert error.status_code == 503
    assert error.headers["access-control-allow-origin"] == origin


def test_unlisted_browser_origin_is_not_allowed(client):
    response = client.options("/api/analyses", headers={
        "Origin": "https://unlisted.example", "Access-Control-Request-Method": "POST"})
    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers


def test_preview_origins_are_default_for_environment_loading(tmp_path, monkeypatch):
    monkeypatch.setattr("backend.config.PROJECT_ROOT", tmp_path)
    settings = Settings.from_env()
    assert {"http://localhost:4173", "http://127.0.0.1:4173"} <= set(settings.cors_origins)
    (tmp_path / ".env").write_text("CORS_ORIGINS=https://review.example\n", encoding="utf-8")
    configured_origins = Settings.from_env().cors_origins
    assert "https://review.example" in configured_origins
    assert {"http://localhost:4173", "http://127.0.0.1:4173"} <= set(configured_origins)
