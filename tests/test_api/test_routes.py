import pytest


@pytest.mark.asyncio
async def test_health(client):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


@pytest.mark.asyncio
async def test_chat_unauthenticated(client):
    response = await client.post("/api/v1/chat", json={"message": "hello"})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_chat_empty_message(client, auth_headers):
    response = await client.post("/api/v1/chat", json={"message": ""}, headers=auth_headers)
    assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
async def test_agent_status(client):
    response = await client.get("/api/v1/status")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_traces_unauthenticated(client):
    response = await client.get("/api/v1/traces")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_ai_config_unauthenticated(client):
    response = await client.post("/api/v1/ai-config", json={"model": "gpt-4o"})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_ai_config_forbidden_for_normal_user(client, auth_headers):
    response = await client.post(
        "/api/v1/ai-config",
        json={"model": "gpt-4o"},
        headers=auth_headers,
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_ai_config_invalid_url(client, admin_auth_headers):
    response = await client.post(
        "/api/v1/ai-config",
        json={"base_url": "javascript:alert(1)"},
        headers=admin_auth_headers,
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_ai_config_allowed_for_admin(client, admin_auth_headers, monkeypatch):
    from unittest.mock import MagicMock
    import src.config
    monkeypatch.setattr(src.config, "update_env_setting", MagicMock())
    response = await client.post(
        "/api/v1/ai-config",
        json={"model": "test-custom-model", "base_url": "https://api.test-provider.com/v1"},
        headers=admin_auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["success"] is True


