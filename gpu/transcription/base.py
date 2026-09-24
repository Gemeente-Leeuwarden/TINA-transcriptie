from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class TranscriptionSegment:
    start_ms: int
    end_ms: int
    text: str
    speaker: Optional[str] = None


@dataclass
class TranscriptionResult:
    text: str
    segments: list[TranscriptionSegment] = field(default_factory=list)
    language: Optional[str] = None
    model: Optional[str] = None


class TranscriptionProvider(ABC):
    @abstractmethod
    def transcribe(
        self,
        audio_bytes: bytes,
        filename: str,
        content_type: str,
        language: Optional[str] = None,
    ) -> TranscriptionResult:
        raise NotImplementedError