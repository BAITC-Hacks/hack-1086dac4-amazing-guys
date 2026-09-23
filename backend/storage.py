"""Small single-process JSON store for the local prototype."""
import json
import re
import threading
from pathlib import Path


class Store:
    def __init__(self, directory: Path):
        self.directory = directory.resolve()
        self.directory.mkdir(parents=True, exist_ok=True)
        self.lock = threading.RLock()

    def _path(self, analysis_id: str) -> Path:
        if not re.fullmatch(r"[a-f0-9]{32}", analysis_id):
            raise KeyError(analysis_id)
        return self.directory / f"{analysis_id}.json"

    def get(self, analysis_id: str) -> dict:
        with self.lock:
            path = self._path(analysis_id)
            if not path.is_file():
                raise KeyError(analysis_id)
            return json.loads(path.read_text(encoding="utf-8"))

    def put(self, record: dict) -> None:
        with self.lock:
            path = self._path(record["analysis_id"])
            temporary = path.with_suffix(".tmp")
            temporary.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
            temporary.replace(path)

    def records(self) -> list[dict]:
        with self.lock:
            return [json.loads(path.read_text(encoding="utf-8")) for path in self.directory.glob("*.json")]

    def update(self, analysis_id: str, **changes) -> dict:
        with self.lock:
            record = self.get(analysis_id)
            record.update(changes)
            self.put(record)
            return record

    def recover_interrupted(self) -> None:
        for record in self.records():
            if record["status"] in {"queued", "running"}:
                self.update(record["analysis_id"], status="failed", error={
                    "code": "analysis_interrupted",
                    "message": "Сервер перезапущен во время обработки. Создайте новый анализ.",
                    "retryable": True,
                })
