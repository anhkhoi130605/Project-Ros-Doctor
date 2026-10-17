from unittest.mock import AsyncMock

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from src.main import app


@pytest.fixture(autouse=True)
def mock_guardrail_model(monkeypatch):
    """Exercise real NeMo rails while preventing paid/network judge calls in tests."""
    from langsmith import tracing_context
    from nemoguardrails.guardrails.model_engine import ModelEngine
    from nemoguardrails.types import LLMResponse

    from src.config import Settings
    from src.safety import service

    settings = Settings(
        _env_file=None,
        openai_api_key="guardrails-test-key",
        openai_base_url="https://guardrails.invalid/v1",
        model_name="test-judge",
        guardrails_model="test-judge",
        guardrails_enabled=True,
    )
    monkeypatch.setattr(service, "get_settings", lambda: settings)
    model = AsyncMock(return_value=LLMResponse(content='{"verdict":"SAFE"}'))
    monkeypatch.setattr(ModelEngine, "chat_completion", model)
    # A developer's .env may enable LangSmith; synthetic tests must not upload traces.
    with tracing_context(enabled=False):
        yield model


@pytest_asyncio.fixture
async def client():
    """Async HTTP client for testing API endpoints."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def mock_llm():
    """Mock LLM to avoid calling OpenAI during tests.

    Usage in test:
        def test_something(mock_llm):
            # LLM calls will return mock response instead of hitting OpenAI
            ...
    """
    mock = AsyncMock()
    mock.ainvoke.return_value = AsyncMock(content="Mocked LLM response")
    return mock


@pytest.fixture(autouse=True)
def ensure_test_jwt_secret(monkeypatch):
    import src.config
    test_secret = "test-jwt-secret-key-with-at-least-32-bytes"
    monkeypatch.setenv("JWT_SECRET", test_secret)
    src.config.get_settings.cache_clear()
    yield
    src.config.get_settings.cache_clear()


@pytest.fixture
def auth_headers():
    import jwt
    from src.config import get_settings
    settings = get_settings()
    token = jwt.encode(
        {"sub": "test-user-id", "email": "test@domain.com", "role": "User"},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_auth_headers():
    import jwt
    from src.config import get_settings
    settings = get_settings()
    token = jwt.encode(
        {"sub": "test-admin-id", "email": "admin@domain.com", "role": "Admin"},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )
    return {"Authorization": f"Bearer {token}"}


