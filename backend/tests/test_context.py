import json

from backend.context import pack_sources, source_characters
from backend.models import Document, Evidence, Locator


def test_packing_preserves_every_quote_reference_version_and_order():
    docs = [Document(document_id=f"d{i}", version=v, name=f"{v}.docx", extraction_status="read", warnings=[])
            for i, v in enumerate(["before", "after"], 1)]
    evidence = [Evidence(evidence_id=f"e{i}", document_id=d.document_id, version=d.version,
                         document_name=d.name, locator=Locator(kind="paragraph", paragraph_index=i),
                         quote=q, context="Neighbours copied for the inspector " * 100)
                for i, (d, q) in enumerate([(docs[0], "Отдел А"), (docs[0], "Проверять платежи."),
                                            (docs[1], "Отдел Б"), (docs[1], "Проверять платежи.")], 1)]
    packed = pack_sources(docs, evidence)
    restored = [(s["evidence_id"], s["document_id"], s["quote"]) for s in packed["sources"]]
    assert restored == [(e.evidence_id, e.document_id, e.quote) for e in evidence]
    assert [s["version"] for s in packed["sources"]] == [e.version for e in evidence]
    assert packed["documents"] == [d.model_dump() for d in docs]
    assert "Neighbours" not in json.dumps(packed)
    assert source_characters(evidence) == sum(len(e.quote) for e in evidence)
    assert evidence[0].context  # Source API still has original context.


def test_large_repeated_sources_fit_without_discarding_occurrences():
    d = Document(document_id="d1", version="before", name="long.docx", extraction_status="read", warnings=[])
    sources = [Evidence(evidence_id=f"e{i}", document_id="d1", version="before", document_name=d.name,
                        locator=Locator(kind="paragraph", paragraph_index=i), quote="x" * 200,
                        context="y" * 800) for i in range(981)]
    from backend.config import Settings
    assert sum(len(e.quote) + len(e.context) for e in sources) > Settings().max_total_chars
    assert source_characters(sources) < Settings().max_total_chars
    packed = pack_sources([d], sources)
    assert len(packed["sources"]) == 981
    assert all(s["quote"] == "x" * 200 for s in packed["sources"])
