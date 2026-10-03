from langchain_openai import ChatOpenAI

from src.config import get_settings


def get_llm() -> ChatOpenAI:
    settings = get_settings()
    kwargs = {
        "model": settings.model_name,
        "api_key": settings.openai_api_key,
        "temperature": settings.llm_temperature,
    }
    if settings.openai_base_url:
        kwargs["base_url"] = settings.openai_base_url
    return ChatOpenAI(**kwargs)

