"""Shared HTTP and model-output schemas. Generated quotes never replace source text."""
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Locator(StrictModel):
    kind: Literal["paragraph", "table_cell", "pdf_page", "sheet_range"]
    section: str | None = None
    paragraph_index: int | None = None
    page: int | None = None
    sheet: str | None = None
    cell_range: str | None = None


class Evidence(StrictModel):
    evidence_id: str
    document_id: str
    version: Literal["before", "after"]
    document_name: str
    locator: Locator
    quote: str
    context: str
    extraction_warning: str | None = None


class Document(StrictModel):
    document_id: str
    version: Literal["before", "after"]
    name: str
    extraction_status: Literal["read", "partial", "failed"]
    warnings: list[str]


class UnitChange(StrictModel):
    id: str
    before_unit_ids: list[str]
    after_unit_ids: list[str]
    kind: Literal["preserved", "renamed", "merged", "split", "created", "removed", "unresolved"]
    evidence_ids: list[str]
    explanation: str


class Function(StrictModel):
    id: str
    version: Literal["before", "after"]
    unit_id: str
    action: str
    object: str
    scope: str | None
    role: str | None
    evidence_ids: list[str]


class FunctionMatch(StrictModel):
    id: str
    before_function_ids: list[str]
    after_function_ids: list[str]
    status: Literal["preserved", "transferred", "changed", "unresolved"]
    evidence_ids: list[str]
    explanation: str


class Finding(StrictModel):
    id: str
    type: Literal["possible_loss", "possible_duplication", "potential_conflict", "insufficient_evidence"]
    title: str
    explanation: str
    before_function_ids: list[str]
    after_function_ids: list[str]
    evidence_ids: list[str]
    checked_after_document_ids: list[str]
    limitations: list[str]
    human_review: Literal["unreviewed"]


class Recommendation(StrictModel):
    text: str
    finding_ids: list[str]
    evidence_ids: list[str]


class Conclusion(StrictModel):
    summary: str
    limitations: list[str]
    recommendations: list[Recommendation]


class ReportPayload(StrictModel):
    """Only this content is model authored; coverage, citations and usage are server owned."""
    unit_changes: list[UnitChange]
    functions: list[Function]
    function_matches: list[FunctionMatch]
    findings: list[Finding]
    conclusion: Conclusion


class Activity(StrictModel):
    operation: str
    status: str
    referenced_ids: list[str]


class Usage(StrictModel):
    model: str
    calls: int
    input_tokens: int
    output_tokens: int
    estimated_cost_usd: float | None


class AgentResult(StrictModel):
    payload: ReportPayload
    activity: list[Activity]
    usage: Usage


AnalysisState = Literal["queued", "running", "completed", "failed"]


class ApiError(StrictModel):
    code: str
    message: str
    retryable: bool


class ErrorResponse(StrictModel):
    error: ApiError


class HealthResponse(StrictModel):
    status: Literal["ok"]
    contract_version: Literal["r1"]
    model: str
    model_configured: bool
    supported_extensions: list[str]


class AnalysisAccepted(StrictModel):
    analysis_id: str
    contract_version: Literal["r1"]
    status: AnalysisState


class AnalysisStatus(AnalysisAccepted):
    stage: Literal["extracting", "matching", "verifying", "reporting"]
    documents: list[Document]
    warnings: list[str]
    error: ApiError | None
    usage: Usage | None


class Coverage(StrictModel):
    status: Literal["complete", "partial"]
    document_ids_checked: list[str]
    unread_document_ids: list[str]
    limitations: list[str]


class Report(ReportPayload):
    contract_version: Literal["r1"]
    analysis_id: str
    coverage: Coverage
    documents: list[Document]
    activity: list[Activity]
    usage: Usage
