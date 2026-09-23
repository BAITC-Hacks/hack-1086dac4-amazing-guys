from pathlib import Path

from fastapi.testclient import TestClient

from backend.app import create_app
from backend.config import Settings
from backend.models import AgentResult, Conclusion, ReportPayload, Usage


def uploads(after=b"After function"):
    return [("before_files", ("before.txt", b"Before function", "text/plain")),
            ("after_files", ("after.txt", after, "text/plain"))]


async def fake_agent(documents, evidence, settings):
    # Dependency fake validates HTTP mechanics, not model quality; never enabled in the app.
    return AgentResult(payload=ReportPayload(unit_changes=[], functions=[], function_matches=[], findings=[],
                       conclusion=Conclusion(summary="HTTP test result", limitations=[], recommendations=[])),
                       activity=[], usage=Usage(model="test-double", calls=0, input_tokens=0, output_tokens=0, estimated_cost_usd=0))


def configured(tmp_path, monkeypatch):
    monkeypatch.setattr("backend.app.run_agent", fake_agent)
    return create_app(Settings(api_key="test-only", data_dir=tmp_path))


def test_upload_report_and_exact_source(tmp_path, monkeypatch):
    with TestClient(configured(tmp_path, monkeypatch)) as client:
        response = client.post("/api/analyses", files=uploads())
        assert response.status_code == 202
        analysis_id = response.json()["analysis_id"]
        status = client.get(f"/api/analyses/{analysis_id}").json()
        assert status["status"] == "completed"
        report = client.get(f"/api/analyses/{analysis_id}/report").json()
        assert report["coverage"]["status"] == "complete"
        record = client.app.state.store.get(analysis_id)
        for eid, expected in record["evidence"].items():
            actual = client.get(f"/api/analyses/{analysis_id}/evidence/{eid}").json()
            assert actual == expected
            assert actual["quote"] in {"Before function", "After function"}
        assert "fingerprint" not in status and "idempotency_key" not in status


def test_repeated_request_is_not_billed_twice_and_survives_restart(tmp_path, monkeypatch):
    calls = []
    async def counted(*args):
        calls.append(1)
        return await fake_agent(*args)
    app = configured(tmp_path, monkeypatch)
    monkeypatch.setattr("backend.app.run_agent", counted)
    with TestClient(app) as client:
        one = client.post("/api/analyses", files=uploads(), headers={"Idempotency-Key": "abc"}).json()
        two = client.post("/api/analyses", files=uploads(), headers={"Idempotency-Key": "abc"}).json()
        assert one["analysis_id"] == two["analysis_id"]
        assert len(calls) == 1
        conflict = client.post("/api/analyses", files=uploads(b"Changed"), headers={"Idempotency-Key": "abc"})
        assert conflict.status_code == 409
    with TestClient(configured(tmp_path, monkeypatch)) as client:
        report = client.get(f"/api/analyses/{one['analysis_id']}/report")
        assert report.status_code == 200


def test_missing_key_does_not_use_environment_key(tmp_path, monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "must-not-be-used")
    with TestClient(create_app(Settings(api_key="", data_dir=tmp_path))) as client:
        response = client.post("/api/analyses", files=uploads())
        assert response.status_code == 503
        assert response.json()["error"]["code"] == "model_not_configured"
        assert not list(tmp_path.glob("*.json"))


def test_config_reads_only_project_key(tmp_path, monkeypatch):
    monkeypatch.setattr("backend.config.PROJECT_ROOT", tmp_path)
    monkeypatch.setenv("OPENAI_API_KEY", "unrelated-account")
    (tmp_path / ".env").write_text("OPENAI_API_KEY=\n", encoding="utf-8")
    assert Settings.from_env().api_key == ""
    (tmp_path / ".env").write_text("OPENAI_API_KEY=local-test-key\n", encoding="utf-8")
    assert Settings.from_env().api_key == "local-test-key"
    assert "local-test-key" not in repr(Settings.from_env())


def test_invalid_uploads_and_size(tmp_path, monkeypatch):
    app = configured(tmp_path, monkeypatch)
    app.state.settings.max_file_bytes = 50
    with TestClient(app) as client:
        assert client.post("/api/analyses", files=uploads()[:1]).status_code == 422
        bad = uploads()[:1] + [("after_files", ("file.exe", b"foo", "application/octet-stream"))]
        assert client.post("/api/analyses", files=bad).status_code == 422
        assert client.post("/api/analyses", files=uploads(b"")).status_code == 422
        assert client.post("/api/analyses", files=uploads(b"a" * 51)).status_code == 413


def test_model_failure_is_not_a_success_report(tmp_path, monkeypatch):
    from backend.agent import AgentFailure
    app = configured(tmp_path, monkeypatch)
    async def failed(*args):
        raise AgentFailure("model_unavailable", "Модель недоступна.", True)
    monkeypatch.setattr("backend.app.run_agent", failed)
    with TestClient(app) as client:
        aid = client.post("/api/analyses", files=uploads()).json()["analysis_id"]
        status = client.get(f"/api/analyses/{aid}").json()
        assert status["status"] == "failed"
        assert status["error"]["code"] == "model_unavailable"
        assert client.get(f"/api/analyses/{aid}/report").status_code == 409
        assert client.app.state.store.get(aid)["evidence"]


def test_source_is_bound_to_its_analysis(tmp_path, monkeypatch):
    with TestClient(configured(tmp_path, monkeypatch)) as client:
        aid = client.post("/api/analyses", files=uploads()).json()["analysis_id"]
        assert client.get(f"/api/analyses/{aid}/evidence/does-not-exist").status_code == 404
        assert client.get("/api/analyses/not-an-id").status_code == 404
        assert client.get("/api/analyses/" + "0" * 32 + "/evidence/doc-001-1").status_code == 404


def test_empty_text_is_failed_not_no_findings(tmp_path, monkeypatch):
    with TestClient(configured(tmp_path, monkeypatch)) as client:
        aid = client.post("/api/analyses", files=uploads(b"   \n")).json()["analysis_id"]
        status = client.get(f"/api/analyses/{aid}").json()
        assert status["status"] == "failed"
        assert status["error"]["code"] == "no_readable_text"


def test_restart_marks_interrupted_analysis_failed(tmp_path, monkeypatch):
    app = configured(tmp_path, monkeypatch)
    aid = "a" * 32
    app.state.store.put({"analysis_id": aid, "contract_version": "r1", "status": "running",
                         "stage": "extracting", "documents": [], "warnings": [], "evidence": {}})
    with TestClient(app) as client:
        status = client.get(f"/api/analyses/{aid}").json()
        assert status["status"] == "failed"
        assert status["error"]["code"] == "analysis_interrupted"


def test_cors_allows_teammate_and_demo_is_available(tmp_path, monkeypatch):
    with TestClient(configured(tmp_path, monkeypatch)) as client:
        response = client.options("/api/analyses", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "idempotency-key"})
        assert response.status_code == 200
        assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
        assert client.get("/").status_code == 200
