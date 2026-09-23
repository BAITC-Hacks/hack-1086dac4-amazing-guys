"""Environment is read at app creation. Never print keys or configuration objects."""
import os
from dataclasses import dataclass, field
from pathlib import Path
from dotenv import dotenv_values

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_ORIGINS = [f"http://{host}:{port}" for port in (5173, 4173, 3000) for host in ("localhost", "127.0.0.1")]


@dataclass
class Settings:
    api_key: str = field(default="", repr=False)
    model: str = "gpt-6-luna"
    reasoning_effort: str = "medium"
    data_dir: Path = field(default_factory=lambda: PROJECT_ROOT / "outputs" / "analyses")
    max_file_bytes: int = 5 * 1024 * 1024
    max_files_per_side: int = 5
    max_total_chars: int = 250000
    max_model_calls: int = 6
    max_tool_calls: int = 8
    max_output_tokens: int = 49152
    model_timeout_seconds: float = 480
    analysis_timeout_seconds: float = 600
    max_analysis_cost_usd: float = 0.25
    cors_origins: list[str] = field(default_factory=lambda: DEFAULT_ORIGINS.copy())

    @classmethod
    def from_env(cls):
        local = dotenv_values(PROJECT_ROOT / ".env")
        return cls(
            # Do not consume an inherited key belonging to another account/tool.
            api_key=(local.get("OPENAI_API_KEY") or "").strip(),
            model=(local.get("OPENAI_MODEL") or "gpt-6-luna").strip(),
            reasoning_effort=(local.get("OPENAI_REASONING_EFFORT") or "medium").strip(),
            data_dir=Path(os.environ.get("ORG_REVIEW_DATA_DIR", str(PROJECT_ROOT / "outputs" / "analyses"))),
            cors_origins=list(dict.fromkeys(DEFAULT_ORIGINS + [x.strip() for x in (local.get("CORS_ORIGINS") or "").split(",") if x.strip()])),
        )
