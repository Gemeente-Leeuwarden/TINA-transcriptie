import os
from typing import Optional

import requests

from .base import TranscriptionProvider, TranscriptionResult, TranscriptionSegment


class OpenAICompatibleProvider(TranscriptionProvider):
    """Talks to any server exposing an OpenAI-compatible /v1/audio/transcriptions
    endpoint (e.g. speaches, whisper.cpp server, LocalAI)."""

    def __init__(self):
        self.api_url = os.environ["TRANSCRIPTION_API_URL"]
        self.api_key = os.getenv("TRANSCRIPTION_API_KEY", "")
        self.model = os.getenv("TRANSCRIPTION_MODEL", "")
        self.default_language = os.getenv("TRANSCRIPTION_LANGUAGE", "") or None

    def transcribe(
        self,
        audio_bytes: bytes,
        filename: str,
        content_type: str,
        language: Optional[str] = None,
    ) -> TranscriptionResult:
        headers = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        data = {"response_format": "verbose_json"}
        if self.model:
            data["model"] = self.model
        lang = language or self.default_language
        if lang:
            data["language"] = lang

        files = {"file": (filename, audio_bytes, content_type or "application/octet-stream")}

        response = requests.post(
            self.api_url,
            headers=headers,
            data=data,
            files=files,
            timeout=600,
        )
        response.raise_for_status()
        payload = response.json()

        segments = [
            TranscriptionSegment(
                start_ms=int(seg.get("start", 0.0) * 1000),
                end_ms=int(seg.get("end", 0.0) * 1000),
                text=seg.get("text", "").strip(),
            )
            for seg in payload.get("segments", [])
        ]

        return TranscriptionResult(
            text=payload.get("text", "").strip(),
            segments=segments,
            language=payload.get("language"),
            model=self.model or None,
        )