"""Environment is read at app creation. Never print keys or configuration objects."""
import os
from dataclasses import dataclass, field
from pathlib import Path
from dotenv import dotenv_values

PROJECT_ROOT = Path(__file__).resolve().parent.parent


@dataclass
class Settings:
    api_key: str = field(default="", repr=False)
    model: str = "gpt-6-luna"
    data_dir: Path = field(default_factory=lambda: PROJECT_ROOT / "outputs" / "analyses")
    max_file_bytes: int = 5 * 1024 * 1024
    max_files_per_side: int = 5
    max_total_chars: int = 60000
    max_model_calls: int = 4
    max_tool_calls: int = 8
    max_output_tokens: int = 10000
    model_timeout_seconds: float = 60
    analysis_timeout_seconds: float = 180
    max_analysis_cost_usd: float = 0.25
    cors_origins: list[str] = field(default_factory=lambda: ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000"])

    @classmethod
    def from_env(cls):
        local = dotenv_values(PROJECT_ROOT / ".env")
        return cls(
            # Do not consume an inherited key belonging to another account/tool.
            api_key=(local.get("OPENAI_API_KEY") or "").strip(),
            model=(local.get("OPENAI_MODEL") or "gpt-6-luna").strip(),
            data_dir=Path(os.environ.get("ORG_REVIEW_DATA_DIR", str(PROJECT_ROOT / "outputs" / "analyses"))),
            cors_origins=[x.strip() for x in (local.get("CORS_ORIGINS") or "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000").split(",") if x.strip()],
        )
