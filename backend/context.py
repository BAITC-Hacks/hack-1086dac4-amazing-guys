"""Source-only prompt: bind every exact quote directly to its ID in reading order."""
from .models import Document, Evidence


def source_characters(evidence: list[Evidence]) -> int:
    """Count source text, not copied neighbours used for the source inspector."""
    return sum(len(item.quote) for item in evidence)


def pack_sources(documents: list[Document], evidence: list[Evidence]) -> dict:
    return {
        "format": "Each source binds an evidence_id directly to its exact quote and version. Sources keep document order. Cite the ID beside the quote, never infer an ID from paragraph position. Context and locators are available through read_evidence.",
        "documents": [doc.model_dump() for doc in documents],
        "sources": [{"evidence_id": e.evidence_id, "document_id": e.document_id,
                     "version": e.version, "quote": e.quote} for e in evidence],
    }
