"""Lossless prompt packing: exact text once, ordered source references retained."""
from .models import Document, Evidence


def source_characters(evidence: list[Evidence]) -> int:
    """Count source text, not copied neighbours used for the source inspector."""
    return sum(len(item.quote) for item in evidence)


def pack_sources(documents: list[Document], evidence: list[Evidence]) -> dict:
    texts: list[str] = []
    indices: dict[str, int] = {}
    sources = []
    for item in evidence:
        if item.quote not in indices:
            indices[item.quote] = len(texts)
            texts.append(item.quote)
        sources.append([item.evidence_id, item.document_id, indices[item.quote]])
    return {
        "format": "texts[i] is the exact source text. Each sources row is [evidence_id, document_id, text_index]. Rows keep document order; repeated text retains EVERY separate source ID. Context and locators are available through read_evidence.",
        "documents": [doc.model_dump() for doc in documents],
        "texts": texts,
        "sources": sources,
    }
