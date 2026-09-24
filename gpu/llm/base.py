from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class LLMResult:
    text: str
    model: Optional[str] = None


class LLMProvider(ABC):
    @abstractmethod
    def apply_prompt(self, prompt: str, transcription: str) -> LLMResult:
        raise NotImplementedError
