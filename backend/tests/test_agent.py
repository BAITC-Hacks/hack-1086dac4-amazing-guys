"""No network or API credentials: mocked SDK boundary and provenance invariants."""
import asyncio
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from backend import agent
from backend.config import Settings
from backend.models import Document, Evidence, Locator, ReportPayload


@pytest.fixture
def data():
    docs = [Document(document_id="d1", version="before", name="before.docx", extraction_status="read", warnings=[]),
            Document(document_id="d2", version="after", name="after.docx", extraction_status="read", warnings=[])]
    sources = [Evidence(evidence_id="e1", document_id="d1", version="before", document_name="before.docx", locator=Locator(kind="paragraph"), quote="Отдел А готовит отчёт.", context=""),
               Evidence(evidence_id="e2", document_id="d2", version="after", document_name="after.docx", locator=Locator(kind="paragraph"), quote="Отдел Б готовит отчёт.", context="")]
    payload = ReportPayload.model_validate({
        "unit_changes": [{"id": "u1", "before_unit_ids": ["Отдел А"], "after_unit_ids": ["Отдел Б"], "kind": "renamed", "evidence_ids": ["e1", "e2"], "explanation": "Переименование"}],
        "functions": [{"id": "f1", "version": "before", "unit_id": "Отдел А", "action": "готовит", "object": "отчёт", "scope": None, "role": None, "evidence_ids": ["e1"]},
                      {"id": "f2", "version": "after", "unit_id": "Отдел Б", "action": "готовит", "object": "отчёт", "scope": None, "role": None, "evidence_ids": ["e2"]}],
        "function_matches": [{"id": "m1", "before_function_ids": ["f1"], "after_function_ids": ["f2"], "status": "transferred", "evidence_ids": ["e1", "e2"], "explanation": "Передача"}],
        "findings": [], "conclusion": {"summary": "Функция сохранена", "limitations": ["Смысл требует проверки сотрудником"], "recommendations": []}})
    return docs, sources, payload


class Item(SimpleNamespace):
    def model_dump(self, **kwargs):
        return vars(self)


def response(*, call=None, payload=None, status="completed", usage=True):
    raw = payload.model_dump() if payload else None
    if raw:
        for function in raw["functions"]:
            function["source_excerpt"] = function["action"] + " " + function["object"]
    return SimpleNamespace(output=[] if call is None else [call], output_parsed=payload,
                           output_text=json.dumps(raw, ensure_ascii=False) if raw else "", status=status,
                           usage=SimpleNamespace(input_tokens=100, output_tokens=50) if usage else None)


def tool(name="search_functions", args=None):
    return Item(type="function_call", name=name, arguments=json.dumps(args or {"query": "отчёт", "version": "after"}), call_id="call1")


def install(monkeypatch, responses, payload):
    api = SimpleNamespace(create=AsyncMock(side_effect=responses), parse=AsyncMock(return_value=response(payload=payload)))
    async def dispatch(**kwargs):
        # Two mock recorders for a single SDK create boundary: tool and report.
        return await (api.parse(**kwargs) if "text" in kwargs else api.create(**kwargs))
    class Client:
        def __init__(self, **kwargs):
            assert kwargs["api_key"] == "mock-only-key"
            assert kwargs["max_retries"] == 0
            assert kwargs["base_url"] == "https://api.openai.com/v1"
            self.responses = SimpleNamespace(create=dispatch)
        async def __aenter__(self):
            return self
        async def __aexit__(self, *args):
            pass
    monkeypatch.setattr(agent, "AsyncOpenAI", Client)
    return api


def settings(**kwargs):
    return Settings(api_key="mock-only-key", max_model_calls=2, **kwargs)


def test_real_tool_contract_and_structured_report(monkeypatch, data):
    docs, sources, payload = data
    api = install(monkeypatch, [response(call=tool())], payload)
    result = asyncio.run(agent.run_agent(docs, sources, settings()))
    assert result.payload.function_matches[0].status == "transferred"
    assert result.usage.calls == 2 and result.usage.input_tokens == 200
    assert result.usage.estimated_cost_usd == pytest.approx(0.00007)
    assert result.activity[0].referenced_ids == ["d2"]
    assert result.activity[-1].status == "completed_structural_only"
    assert api.create.call_args.kwargs["store"] is False
    assert api.parse.call_args.kwargs["text"]["format"]["strict"] is True
    assert api.parse.call_args.kwargs["text"]["format"]["schema"]["$defs"]["AvailableEvidence"]["enum"] == ["e1", "e2"]
    assert any(x.get("type") == "function_call_output" for x in api.parse.call_args.kwargs["input"])
    packed = json.loads(api.create.call_args.kwargs["input"][0]["content"])
    assert len(packed["sources"]) == 2
    assert api.create.call_args.kwargs["max_output_tokens"] == 2048
    assert api.parse.call_args.kwargs["max_output_tokens"] == Settings().max_output_tokens


@pytest.mark.parametrize("kwargs,code", [({"api_key": ""}, "missing_api_key"), ({"model": "unknown"}, "unsupported_model"), ({"max_analysis_cost_usd": 0.000001}, "cost_limit"), ({"max_model_calls": 1}, "invalid_configuration")])
def test_preflight_no_api_calls(monkeypatch, data, kwargs, code):
    docs, sources, payload = data
    api = install(monkeypatch, [], payload)
    config = Settings(api_key="mock-only-key", **{k:v for k,v in kwargs.items() if k != "api_key"})
    if "api_key" in kwargs:
        config.api_key = kwargs["api_key"]
    with pytest.raises(agent.AgentFailure) as error:
        asyncio.run(agent.run_agent(docs, sources, config))
    assert error.value.code == code
    api.create.assert_not_called()
    api.parse.assert_not_called()


@pytest.mark.parametrize("item", [None, tool("read_evidence", {"evidence_id": "outside-analysis"}), tool("shell", {"command": "bad"}), tool("search_functions", {"query": "отчёт", "version": "after", "path": "secret"})])
def test_missing_or_invalid_tool_prevents_report(monkeypatch, data, item):
    docs, sources, payload = data
    api = install(monkeypatch, [response(call=item)], payload)
    with pytest.raises(agent.AgentFailure, match="успешную"):
        asyncio.run(agent.run_agent(docs, sources, settings()))
    api.parse.assert_not_called()


@pytest.mark.parametrize("mutation", ["unknown_source", "wrong_version", "duplicate_id", "missing_matrix", "unknown_function", "uncited_recommendation"])
def test_rejects_untrusted_references(data, mutation):
    docs, sources, payload = data
    if mutation == "unknown_source":
        payload.functions[0].evidence_ids = ["outside"]
    elif mutation == "wrong_version":
        payload.functions[0].evidence_ids = ["e2"]
    elif mutation == "duplicate_id":
        payload.functions.append(payload.functions[0])
    elif mutation == "missing_matrix":
        payload.function_matches = []
    elif mutation == "unknown_function":
        payload.function_matches[0].after_function_ids = ["unknown"]
    else:
        from backend.models import Recommendation
        payload.conclusion.recommendations = [Recommendation(text="Изменить", finding_ids=["unknown"], evidence_ids=["e1"])]
    with pytest.raises(agent.AgentFailure):
        agent.validate_payload(payload, docs, sources, {"d2"})


def loss(payload):
    from backend.models import Finding
    payload.function_matches[0].status = "unresolved"
    payload.function_matches[0].after_function_ids = []
    payload.findings = [Finding(id="loss", type="possible_loss", title="Возможная потеря", explanation="Назначение не найдено в комплекте", before_function_ids=["f1"], after_function_ids=[], evidence_ids=["e1"], checked_after_document_ids=["d2"], limitations=["Поиск не доказывает отсутствие"], human_review="unreviewed")]


def test_loss_requires_executed_search_not_model_claim(data):
    docs, sources, payload = data
    loss(payload)
    with pytest.raises(agent.AgentFailure):
        agent.validate_payload(payload, docs, sources, set())
    agent.validate_payload(payload, docs, sources, {"d2"})
    payload.findings[0].limitations = []
    with pytest.raises(agent.AgentFailure):
        agent.validate_payload(payload, docs, sources, {"d2"})


def test_loss_cannot_contradict_preserved_match(data):
    docs, sources, payload = data
    loss(payload)
    payload.function_matches[0].status = "preserved"
    payload.function_matches[0].after_function_ids = ["f2"]
    with pytest.raises(agent.AgentFailure, match="противоречит"):
        agent.validate_payload(payload, docs, sources, {"d2"})


def test_tool_error_can_be_repaired_within_bounds(monkeypatch, data):
    docs, sources, payload = data
    api = install(monkeypatch, [response(call=tool("read_evidence", {"evidence_id": "unknown"})), response(call=tool())], payload)
    result = asyncio.run(agent.run_agent(docs, sources, Settings(api_key="mock-only-key", max_model_calls=3)))
    assert result.usage.calls == 3
    assert [x.status for x in result.activity[:2]] == ["invalid_arguments", "completed"]
    assert api.create.call_count == 2


def test_duplication_needs_distinct_after_functions_and_sources(data):
    docs, sources, payload = data
    loss(payload)
    finding = payload.findings[0]
    finding.type = "possible_duplication"
    finding.after_function_ids = ["f2", "f2"]
    finding.evidence_ids = ["e1", "e2"]
    with pytest.raises(agent.AgentFailure):
        agent.validate_payload(payload, docs, sources, {"d2"})


def test_bounded_tool_calls(data):
    docs, sources, _ = data
    run = agent._Run(docs, sources, settings(max_tool_calls=1))
    assert run.tool("read_evidence", '{"evidence_id":"e1"}')["quote"] == sources[0].quote
    with pytest.raises(agent.AgentFailure) as error:
        run.tool("read_evidence", '{"evidence_id":"e2"}')
    assert error.value.code == "tool_limit"


def test_no_match_search_is_not_absence_proof(data):
    docs, sources, _ = data
    run = agent._Run(docs, sources, settings())
    result = run.tool("search_functions", '{"query":"несуществующаяфункция","version":"after"}')
    assert result["matches"] == [] and result["checked_document_ids"] == ["d2"]
    assert "не доказывает" in result["limitations"]


@pytest.mark.parametrize("usage,status,code", [(False, "completed", "usage_unavailable"), (True, "incomplete", "incomplete_model_output")])
def test_incomplete_or_unaccounted_response_stops(monkeypatch, data, usage, status, code):
    docs, sources, payload = data
    api = install(monkeypatch, [response(call=tool(), usage=usage, status=status)], payload)
    with pytest.raises(agent.AgentFailure) as error:
        asyncio.run(agent.run_agent(docs, sources, settings()))
    assert error.value.code == code
    api.parse.assert_not_called()


def test_timeout_is_safe_and_retryable(monkeypatch, data):
    docs, sources, payload = data
    api = install(monkeypatch, [], payload)
    async def delayed(**kwargs):
        await asyncio.sleep(1)
    api.create.side_effect = delayed
    with pytest.raises(agent.AgentFailure) as error:
        asyncio.run(agent.run_agent(docs, sources, settings(model_timeout_seconds=0.01)))
    assert error.value.code == "model_timeout" and error.value.retryable
    assert error.value.usage.calls == 1
    assert error.value.usage.estimated_cost_usd is None


def test_long_context_usage_uses_long_context_rates(monkeypatch, data):
    docs, sources, payload = data
    out = response(call=tool())
    out.usage.input_tokens = 280_000
    out.usage.output_tokens = 100
    api = install(monkeypatch, [out], payload)
    result = asyncio.run(agent.run_agent(docs, sources, settings()))
    # Long first call: $0.20/$0.75, short report call: $0.10/$0.50.
    assert result.usage.estimated_cost_usd == pytest.approx(0.05611)


def test_source_limit_applies_before_network_without_counting_context(monkeypatch, data):
    docs, sources, payload = data
    api = install(monkeypatch, [response(call=tool())], payload)
    for source in sources:
        source.context = "neighbour " * 1000
    result = asyncio.run(agent.run_agent(docs, sources, settings(max_total_chars=100)))
    assert result.usage.calls == 2
    api.create.reset_mock()
    with pytest.raises(agent.AgentFailure) as error:
        asyncio.run(agent.run_agent(docs, sources, settings(max_total_chars=1)))
    assert error.value.code == "input_limit"
    api.create.assert_not_called()


@pytest.mark.parametrize("repaired", [True, False])
def test_invalid_report_gets_one_bounded_repair(monkeypatch, data, repaired):
    docs, sources, valid = data
    invalid = valid.model_copy(deep=True)
    invalid.functions[0].evidence_ids = ["paragraph-label-not-source-id"]
    api = install(monkeypatch, [response(call=tool())], valid)
    api.parse.side_effect = [response(payload=invalid), response(payload=valid if repaired else invalid)]
    config = Settings(api_key="mock-only-key", max_model_calls=3)
    if repaired:
        result = asyncio.run(agent.run_agent(docs, sources, config))
        assert result.usage.calls == 3
        assert result.activity[-2].status == "rejected"
    else:
        with pytest.raises(agent.AgentFailure) as error:
            asyncio.run(agent.run_agent(docs, sources, config))
        assert error.value.code == "invalid_model_output"
        assert error.value.usage.calls == 3
    assert api.parse.call_count == 2


def test_comparison_inherits_only_explicit_function_sources(data):
    docs, sources, payload = data
    payload.function_matches[0].evidence_ids = ["e1"]
    assert agent.assemble_linked_citations(payload) == ["m1"]
    assert payload.function_matches[0].evidence_ids == ["e1", "e2"]
    agent.validate_payload(payload, docs, sources, {"d2"})
    payload.function_matches[0].evidence_ids = ["outside"]
    agent.assemble_linked_citations(payload)
    with pytest.raises(agent.AgentFailure, match="неизвестный источник"):
        agent.validate_payload(payload, docs, sources, {"d2"})
    payload.function_matches[0].evidence_ids = ["e1", "e1"]
    agent.assemble_linked_citations(payload)
    with pytest.raises(agent.AgentFailure, match="уникальные"):
        agent.validate_payload(payload, docs, sources, {"d2"})


def test_unit_citation_rejects_adjacent_wrong_department(data):
    docs, sources, payload = data
    sources.append(sources[0].model_copy(update={"evidence_id": "e3", "quote": "Другой отдел хранит архив."}))
    payload.unit_changes[0].evidence_ids = ["e3", "e2"]
    with pytest.raises(agent.AgentFailure, match="u1: before Отдел А") as error:
        agent.validate_payload(payload, docs, sources, {"d2"})
    assert "e1" in error.value.message


def test_unit_guard_does_not_pretend_to_resolve_inflected_names(data):
    docs, sources, payload = data
    payload.unit_changes[0].before_unit_ids = ["Отдела А"]
    agent.validate_payload(payload, docs, sources, {"d2"})


def test_invalid_report_text_keeps_usage_and_safe_diagnostic(monkeypatch, data):
    docs, sources, valid = data
    api = install(monkeypatch, [response(call=tool())], valid)
    invalid = response(payload=valid)
    invalid.output_text = '{"private_document_text": "MUST_NOT_LEAK"}'
    api.parse.return_value = invalid
    with pytest.raises(agent.AgentFailure) as error:
        asyncio.run(agent.run_agent(docs, sources, settings()))
    assert error.value.code == "invalid_model_output"
    assert error.value.usage.calls == 2
    assert error.value.usage.estimated_cost_usd == pytest.approx(0.00007)
    assert "MUST_NOT_LEAK" not in error.value.message
    assert "unit_changes: missing" in error.value.message


def test_function_excerpt_rejects_real_but_wrong_source(data):
    docs, sources, payload = data
    sources.append(sources[0].model_copy(update={"evidence_id": "e3", "quote": "Другой отдел хранит архив."}))
    payload.functions[0].evidence_ids = ["e3"]
    with pytest.raises(agent.AgentFailure, match="source_excerpt.*f1"):
        agent.validate_payload(payload, docs, sources, {"d2"}, {"f1": "готовит отчёт", "f2": "готовит отчёт"})
    payload.functions[0].evidence_ids = ["e1"]
    agent.validate_payload(payload, docs, sources, {"d2"}, {"f1": "готовит отчёт", "f2": "готовит отчёт"})
