from .base import TranscriptionProvider
from .openai_compatible import OpenAICompatibleProvider

PROVIDERS: dict[str, type[TranscriptionProvider]] = {
    "openai_compatible": OpenAICompatibleProvider,
}


def get_provider(name: str) -> TranscriptionProvider:
    try:
        provider_cls = PROVIDERS[name]
    except KeyError:
        raise ValueError(
            f"unknown TRANSCRIPTION_PROVIDER '{name}', available: {', '.join(PROVIDERS)}"
        )
    return provider_cls()