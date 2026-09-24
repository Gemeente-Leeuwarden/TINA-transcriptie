import os

import requests

from .base import LLMProvider, LLMResult


class OpenAICompatibleLLMProvider(LLMProvider):
    """Talks to any server exposing an OpenAI-compatible /v1/chat/completions
    endpoint (e.g. Ollama, vLLM, LM Studio, OpenAI)."""

    def __init__(self):
        self.api_url = os.getenv("LLM_API_URL", "")
        if not self.api_url:
            raise RuntimeError("LLM_API_URL is not configured, cannot apply prompts")
        self.api_key = os.getenv("LLM_API_KEY", "")
        self.model = os.getenv("LLM_MODEL", "")

    def apply_prompt(self, prompt: str, transcription: str) -> LLMResult:
        headers = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        body = {
            "messages": [
                {"role": "system", "content": prompt},
                {"role": "user", "content": transcription},
            ],
        }
        if self.model:
            body["model"] = self.model

        response = requests.post(
            self.api_url,
            headers=headers,
            json=body,
            timeout=600,
        )
        response.raise_for_status()
        payload = response.json()

        return LLMResult(
            text=payload["choices"][0]["message"]["content"].strip(),
            model=payload.get("model") or self.model or None,
        )
