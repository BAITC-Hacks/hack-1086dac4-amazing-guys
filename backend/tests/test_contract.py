"""Keep the teammate's shared examples aligned with HTTP response models."""
import json
from pathlib import Path

from backend.models import AnalysisAccepted, AnalysisStatus, ApiError, Evidence, Report


def test_shared_http_examples_and_source_links():
    root = Path(__file__).resolve().parents[2] / "fixtures" / "api"
    def read(name):
        return json.loads((root / name).read_text(encoding="utf-8"))
    AnalysisAccepted.model_validate(read("accepted.json"))
    for name in ["completed.json", "failed.json"]:
        AnalysisStatus.model_validate(read(name))
    sources = [Evidence.model_validate(read(f"evidence-{side}.json")) for side in ["before", "after"]]
    ids = {e.evidence_id for e in sources}
    for name in ["report.json", "report-partial.json"]:
        report = Report.model_validate(read(name))
        assert report.usage.calls == 0 and report.usage.model == "fixture-not-ai"
        assert all(set(f.evidence_ids) <= ids for f in report.findings + report.functions)
    ApiError.model_validate(read("invalid-input.json")["error"])
