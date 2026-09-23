"""Export HTTP fixtures with a labelled test double; never calls OpenAI.

Run from the repository root: uv run --project backend python -m backend.export_contract
"""
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.app import create_app
from backend.config import Settings
from backend.models import AgentResult, ReportPayload, Usage


async def example_agent(documents, evidence, settings):
    before, after = evidence
    functions = [dict(id=f"f{i}", version=e.version, unit_id=unit, action="готовит",
                      object="отчёт", scope=None, role=None, evidence_ids=[e.evidence_id])
                 for i, (e, unit) in enumerate(zip(evidence, ["Отдел А", "Отдел Б"]), 1)]
    ids = [e.evidence_id for e in evidence]
    payload = ReportPayload.model_validate(dict(
        unit_changes=[dict(id="u1", before_unit_ids=["Отдел А"], after_unit_ids=["Отдел Б"],
                           kind="unresolved", evidence_ids=ids, explanation="Демонстрационный пример: связь подразделений не подтверждена.")],
        functions=functions,
        function_matches=[dict(id="m1", before_function_ids=["f1"], after_function_ids=["f2"],
                               status="unresolved", evidence_ids=ids, explanation="Нужно уточнить назначение отчёта.")],
        findings=[dict(id="n1", type="insufficient_evidence", title="Уточнить назначение отчёта",
                       explanation="В примере не указано, относятся ли обязанности к одному отчёту.",
                       before_function_ids=["f1"], after_function_ids=["f2"], evidence_ids=ids,
                       checked_after_document_ids=[], limitations=["Авторский HTTP-пример, не результат AI."], human_review="unreviewed")],
        conclusion=dict(summary="Авторский HTTP-пример для интерфейса. Модель не вызывалась.",
                        limitations=["Смысл требует проверки сотрудником."],
                        recommendations=[dict(text="Уточнить вид отчёта.", finding_ids=["n1"], evidence_ids=ids)])))
    return AgentResult(payload=payload, activity=[], usage=Usage(
        model="fixture-not-ai", calls=0, input_tokens=0, output_tokens=0, estimated_cost_usd=0))


def main():
    target = Path(__file__).resolve().parent.parent / "fixtures" / "api"
    target.mkdir(parents=True, exist_ok=True)

    def save(name, data):
        (target / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    with TemporaryDirectory() as directory, patch("backend.app.run_agent", example_agent):
        app = create_app(Settings(api_key="fixture-only", data_dir=Path(directory)))
        with TestClient(app) as client:
            response = client.post("/api/analyses", files=[
                ("before_files", ("before.txt", "Отдел А готовит отчёт.".encode(), "text/plain")),
                ("after_files", ("after.txt", "Отдел Б готовит отчёт.".encode(), "text/plain"))])
            assert response.status_code == 202
            analysis_id = response.json()["analysis_id"]

            def stable(data):
                return json.loads(json.dumps(data).replace(analysis_id, "0" * 32))

            save("accepted.json", stable(response.json()))
            status = client.get(f"/api/analyses/{analysis_id}").json()
            assert status["status"] == "completed"
            save("completed.json", stable(status))
            report = client.get(f"/api/analyses/{analysis_id}/report").json()
            save("report.json", stable(report))
            for side, doc in zip(["before", "after"], ["doc-001", "doc-002"]):
                save(f"evidence-{side}.json", client.get(f"/api/analyses/{analysis_id}/evidence/{doc}:e00001").json())
            invalid = client.post("/api/analyses")
            assert invalid.status_code == 422
            save("invalid-input.json", invalid.json())
            status.update(status="failed", error=dict(code="model_timeout", message="Время анализа истекло.", retryable=True))
            save("failed.json", stable(status))
            report["coverage"].update(status="partial", limitations=["Пример частичного чтения: изображение не распознано."])
            report["documents"][0].update(extraction_status="partial", warnings=["Изображение не распознано."])
            save("report-partial.json", stable(report))
            save("openapi.json", app.openapi())
    print("Exported labelled HTTP fixtures; no model requests.")


if __name__ == "__main__":
    main()
