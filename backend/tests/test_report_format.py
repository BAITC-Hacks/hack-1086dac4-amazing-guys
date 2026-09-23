from backend.models import Evidence, Locator, ReportPayload
from backend.report_format import report_schema


def sources(count):
    return [Evidence(evidence_id=f"doc-001:e{i:05}", document_id="doc-001",
                     version="before", document_name="a", locator=Locator(kind="paragraph"),
                     quote="text", context="") for i in range(count)]


def test_wire_schema_constrains_every_citation_without_changing_contract():
    original = ReportPayload.model_json_schema()
    schema = report_schema(sources(981))
    assert "source_excerpt" in schema["$defs"]["Function"]["required"]
    assert len(schema["$defs"]["AvailableEvidence"]["enum"]) == 981
    for name in ["Function", "UnitChange", "FunctionMatch", "Finding", "Recommendation"]:
        assert schema["$defs"][name]["properties"]["evidence_ids"]["items"] == {"$ref": "#/$defs/AvailableEvidence"}
    schema["$defs"]["AvailableEvidence"]["enum"].clear()
    assert len(report_schema(sources(981))["$defs"]["AvailableEvidence"]["enum"]) == 981
    assert ReportPayload.model_json_schema() == original


def test_provider_enum_limits_keep_all_sources_and_server_validation():
    assert "AvailableEvidence" not in report_schema(sources(1000))["$defs"]
    long = sources(300)
    for source in long:
        source.evidence_id += "x" * 60
    assert "AvailableEvidence" not in report_schema(long)["$defs"]
