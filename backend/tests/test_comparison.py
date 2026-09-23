import pytest
import json

from backend.comparison import (ComparisonReview, comparison_blocks,
                                validate_review, missing_review_sources, review_schema, parse_review)
from backend.models import Evidence, Locator


def test_scoped_synthesis_keeps_sources_and_tool_checks_without_other_batch_notes():
    from backend.comparison import scoped_review_history
    sources = {"role": "user", "content": json.dumps({"sources": [{"quote": "Complete source"}]})}
    notes = {"role": "user", "content": json.dumps({"review_instructions": "Verify",
        "comparison_review": {"blocks": [{"block_id": "one", "observations": ["A"]},
                                           {"block_id": "two", "observations": ["B"]}]}})}
    tool = {"type": "function_call_output", "call_id": "call", "output": "Real search results"}
    history = [sources, notes, tool]
    first = scoped_review_history(history, ["one"])
    second = scoped_review_history(history, ["two"])
    assert first[0] == sources and first[2] == tool
    assert json.loads(first[1]["content"])["comparison_review"]["blocks"] == [{"block_id": "one", "observations": ["A"]}]
    assert json.loads(second[1]["content"])["comparison_review"]["blocks"] == [{"block_id": "two", "observations": ["B"]}]
    assert len(json.loads(history[1]["content"])["comparison_review"]["blocks"]) == 2
    assert scoped_review_history(history, None) == history


def source(id, version, quote, doc=None):
    return Evidence(evidence_id=id, document_id=doc or version, version=version,
                    document_name=version, locator=Locator(kind="paragraph"),
                    quote=quote, context="")


def test_late_modality_change_is_candidate_with_context_and_original_ids():
    rows = [source(f"b{i}", "before", f"{i}. Условие") for i in range(60)]
    rows += [source("b60", "before", "Анализ выполняется.")]
    rows += [source(f"a{i}", "after", f"{i}. Условие") for i in range(60)]
    rows += [source("a60", "after", "Анализ может выполняться.")]
    blocks = comparison_blocks(rows)
    assert len(blocks) == 1
    assert blocks[0]["evidence_ids"] == ["b60", "a60"]
    assert blocks[0]["context_ids"] == ["b58", "b59", "a58", "a59"]


def test_insertions_deletions_and_repeats_are_not_silently_discarded():
    rows = [source("b1", "before", "Общий пункт"), source("b2", "before", "Удалённый пункт"),
            source("b3", "before", "Общий пункт"), source("a1", "after", "Общий пункт"),
            source("a2", "after", "Общий пункт"), source("a3", "after", "Добавленный пункт")]
    changed = {s for b in comparison_blocks(rows) for s in b["evidence_ids"]}
    assert {"b2", "a3"} <= changed


def test_multiple_documents_do_not_get_a_fabricated_pairing():
    rows = [source("b", "before", "One"), source("b2", "before", "Two", "another"),
            source("a", "after", "Three")]
    assert comparison_blocks(rows) == []


def test_review_requires_all_blocks_and_real_related_sources():
    rows = [source("b", "before", "Текст до"), source("a", "after", "Текст после")]
    blocks = comparison_blocks(rows)
    review = ComparisonReview.model_validate({"blocks": [{"block_id": "change-001", "observations": [
        {"kind": "changed", "explanation": "Изменение", "evidence_ids": ["b", "a"]}]}]})
    validate_review(review, blocks, rows)
    with pytest.raises(ValueError):
        validate_review(ComparisonReview(blocks=[]), blocks, rows)
    review.blocks[0].observations[0].evidence_ids = ["not-a-source"]
    with pytest.raises(ValueError):
        validate_review(review, blocks, rows)


def test_review_coverage_does_not_accept_functions_without_visible_comparison():
    from types import SimpleNamespace as Obj
    review = ComparisonReview.model_validate({"blocks": [{"block_id": "c1", "observations": [
        {"kind": "changed", "explanation": "Изменение", "evidence_ids": ["b", "a"]},
        {"kind": "editorial", "explanation": "Опечатка", "evidence_ids": ["ignored"]}]}]})
    payload = Obj(unit_changes=[], function_matches=[Obj(evidence_ids=["b"])], findings=[],
                  functions=[Obj(evidence_ids=["a"])])
    assert missing_review_sources(review, payload) == ["a"]
    payload.function_matches[0].evidence_ids.append("a")
    assert missing_review_sources(review, payload) == []


def test_wire_schema_requires_each_block_and_restricts_known_ids():
    rows = [source("b", "before", "Текст до"), source("a", "after", "Текст после")]
    schema = review_schema(comparison_blocks(rows), rows)
    assert schema["properties"]["blocks"]["required"] == ["change-001"]
    assert schema["$defs"]["Observation"]["properties"]["evidence_ids"]["items"]["enum"] == ["b", "a"]
    review = parse_review('{"blocks":{"change-001":[{"kind":"preserved","explanation":"Same","evidence_ids":["b"]}]}}')
    with pytest.raises(ValueError, match="both versions"):
        validate_review(review, comparison_blocks(rows), rows)


def test_preserved_context_note_may_sit_outside_the_changed_region():
    rows = [source("b1", "before", "Директор А"), source("b2", "before", "Готовит отчёт"),
            source("a1", "after", "Директор Б"), source("a2", "after", "Готовит отчёт")]
    review = ComparisonReview.model_validate({"blocks": [{"block_id": "change-001", "observations": [
        {"kind": "changed", "explanation": "Исполнитель изменён", "evidence_ids": ["b1", "a1"]},
        {"kind": "preserved", "explanation": "Действие сохранилось", "evidence_ids": ["b2", "a2"]}]}]})
    validate_review(review, comparison_blocks(rows), rows)
    review.blocks[0].observations.pop(0)
    with pytest.raises(ValueError, match="changed region"):
        validate_review(review, comparison_blocks(rows), rows)


def test_batches_cover_every_block_once_and_do_not_split_observations():
    from backend.comparison import review_batches
    review = ComparisonReview.model_validate({"blocks": [{"block_id": f"c{i}", "observations": [
        {"kind": "changed", "explanation": "Change", "evidence_ids": ["e"]} for _ in range(i + 1)]} for i in range(5)]})
    batches = review_batches(review)
    assert len(batches) == 2 and all(batches)
    assert [id for batch in batches for id in batch] == [f"c{i}" for i in range(5)]
