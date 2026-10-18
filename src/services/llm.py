from langchain_core.language_models.chat_models import BaseChatModel
from langchain_openai import AzureChatOpenAI, ChatOpenAI

from src.config import get_settings


def get_llm(
    model: str | None = None,
    api_key: str | None = None,
    temperature: float | None = None,
    base_url: str | None = None,
    max_tokens: int | None = None,
) -> BaseChatModel:
    settings = get_settings()
    effective_temperature = temperature if temperature is not None else settings.llm_temperature
    effective_max_tokens = max_tokens if max_tokens is not None else getattr(settings, "llm_max_tokens", 4096)

    is_azure = bool(
        settings.azure_openai_endpoint
        or (settings.openai_base_url and "openai.azure.com" in settings.openai_base_url)
        or (base_url and "openai.azure.com" in base_url)
    )

    if is_azure:
        effective_endpoint = (
            settings.azure_openai_endpoint
            or base_url
            or settings.openai_base_url
            or ""
        )
        effective_deployment = (
            settings.azure_openai_deployment_name
            or (model or "").strip()
            or settings.model_name
        )
        if "/openai/deployments" in effective_endpoint:
            parts = effective_endpoint.split("/openai/deployments")
            effective_endpoint = parts[0]
            if not settings.azure_openai_deployment_name and parts[1].strip("/"):
                effective_deployment = parts[1].strip("/").split("/")[0]

        effective_api_key = (
            (api_key or "").strip()
            or settings.azure_openai_api_key
            or settings.openai_api_key
        )
        effective_api_version = settings.azure_openai_api_version or "2024-06-01"

        return AzureChatOpenAI(
            azure_endpoint=effective_endpoint,
            azure_deployment=effective_deployment,
            openai_api_version=effective_api_version,
            api_key=effective_api_key,
            temperature=effective_temperature,
            max_tokens=effective_max_tokens,
        )

    effective_api_key = (api_key or "").strip() or settings.openai_api_key
    effective_model = (model or "").strip() or settings.model_name
    effective_base_url = (base_url or "").strip() or settings.openai_base_url

    kwargs = {
        "model": effective_model,
        "api_key": effective_api_key,
        "temperature": effective_temperature,
        "max_tokens": effective_max_tokens,
    }
    if effective_base_url:
        kwargs["base_url"] = effective_base_url
    return ChatOpenAI(**kwargs)

