from langchain_openai import ChatOpenAI

from src.config import get_settings


def get_llm(
    model: str | None = None,
    api_key: str | None = None,
    temperature: float | None = None,
    base_url: str | None = None,
) -> ChatOpenAI:
    settings = get_settings()
    effective_api_key = (api_key or "").strip() or settings.openai_api_key
    effective_model = (model or "").strip() or settings.model_name
    effective_temperature = temperature if temperature is not None else settings.llm_temperature
    effective_base_url = (base_url or "").strip() or settings.openai_base_url

    kwargs = {
        "model": effective_model,
        "api_key": effective_api_key,
        "temperature": effective_temperature,
    }
    if effective_base_url:
        kwargs["base_url"] = effective_base_url
    return ChatOpenAI(**kwargs)

