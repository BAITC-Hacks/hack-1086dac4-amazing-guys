"""Constrain generated citation IDs without changing the public r1 schema."""
from .models import Evidence, ReportPayload


def report_schema(evidence: list[Evidence]) -> dict:
    source_ids = list(dict.fromkeys(item.evidence_id for item in evidence))
    schema = ReportPayload.model_json_schema()
    function_schema = schema["$defs"]["Function"]
    function_schema["properties"]["source_excerpt"] = {
        "type": "string", "description": "Exact 12-160 character excerpt substantiating this function, copied from one of its cited quotes. No ellipses or paraphrase."
    }
    function_schema["required"].append("source_excerpt")

    def enum_count(node):
        if isinstance(node, dict):
            return len(node.get("enum", [])) + sum(enum_count(v) for v in node.values())
        if isinstance(node, list):
            return sum(enum_count(v) for v in node)
        return 0

    # Provider limits: 1000 enum values total; >250 string values <=15000 chars.
    # Larger inputs still use all sources and the same strict server validator.
    if (not source_ids or len(source_ids) + enum_count(schema) > 1000
            or len(source_ids) > 250 and sum(map(len, source_ids)) > 15000):
        return schema
    schema["$defs"]["AvailableEvidence"] = {"type": "string", "enum": source_ids}
    for definition in schema["$defs"].values():
        field = definition.get("properties", {}).get("evidence_ids")
        if field is not None:
            field["items"] = {"$ref": "#/$defs/AvailableEvidence"}

    return schema
