from typing import Any

__all__ = ["CarlaRosbagRecorder", "BackendClient", "get_backend_client"]


def __getattr__(name: str) -> Any:
    if name == "CarlaRosbagRecorder":
        from src.services.carla_rosbag_service import CarlaRosbagRecorder

        return CarlaRosbagRecorder
    if name in ("BackendClient", "get_backend_client"):
        from src.services.backend_client import BackendClient, get_backend_client

        if name == "BackendClient":
            return BackendClient
        return get_backend_client
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

