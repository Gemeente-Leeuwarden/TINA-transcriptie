from .base import LLMProvider
from .openai_compatible import OpenAICompatibleLLMProvider

PROVIDERS: dict[str, type[LLMProvider]] = {
    "openai_compatible": OpenAICompatibleLLMProvider,
}


def get_provider(name: str) -> LLMProvider:
    try:
        provider_cls = PROVIDERS[name]
    except KeyError:
        raise ValueError(
            f"unknown LLM_PROVIDER '{name}', available: {', '.join(PROVIDERS)}"
        )
    return provider_cls()
