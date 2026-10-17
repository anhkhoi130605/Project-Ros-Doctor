"""JWT Authentication & Role-based Authorization for Python AI Agent API."""

from __future__ import annotations

import logging
from typing import Any

import jwt
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.config import get_settings

logger = logging.getLogger(__name__)

# auto_error=False so we can handle custom error messages and optional internal secrets
security_scheme = HTTPBearer(auto_error=False)

ROLE_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
NAME_ID_CLAIM = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"


def decode_jwt_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT Bearer token issued by ASP.NET Core backend."""
    settings = get_settings()
    if not settings.jwt_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="JWT secret chưa được cấu hình trên máy chủ (Thiếu JWT_SECRET).",
        )
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            options={"verify_aud": False},  # Audience verification disabled for cross-service flexibility
        )

        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None
    except jwt.InvalidTokenError as err:
        logger.warning("Invalid JWT Token received: %s", err)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token xác thực không hợp lệ.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None


async def get_current_user(
    auth: HTTPAuthorizationCredentials | None = Depends(security_scheme),
    x_internal_secret: str | None = Header(default=None, alias="X-Internal-Secret"),
) -> dict[str, Any]:
    """Verify user authentication via JWT Bearer Token or internal service secret."""
    settings = get_settings()

    # 1. Allow internal service-to-service communication if secret matches
    if settings.internal_api_secret and x_internal_secret:
        if x_internal_secret.strip() == settings.internal_api_secret.strip():
            return {
                "user_id": "system-internal",
                "email": "system@internal",
                "roles": ["Admin"],
                "is_internal": True,
            }

    # 2. Require Bearer Token
    if not auth or not auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Yêu cầu xác thực. Thiếu Authorization Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_jwt_token(auth.credentials)

    user_id = payload.get("sub") or payload.get(NAME_ID_CLAIM) or "unknown"
    email = payload.get("email") or ""

    # Extract roles (single string or list)
    roles_raw = payload.get("role") or payload.get(ROLE_CLAIM) or payload.get("roles") or []
    if isinstance(roles_raw, str):
        roles = [roles_raw]
    elif isinstance(roles_raw, list):
        roles = [str(r) for r in roles_raw]
    else:
        roles = []

    return {
        "user_id": user_id,
        "email": email,
        "roles": roles,
        "payload": payload,
    }


async def require_admin(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Ensure the authenticated user has Admin privileges."""
    roles = [r.lower() for r in current_user.get("roles", [])]
    if "admin" not in roles and not current_user.get("is_internal"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Quyền truy cập bị từ chối. Thao tác này chỉ dành cho Quản trị viên (Admin).",
        )
    return current_user
