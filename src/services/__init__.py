from typing import Any

__all__ = ["CarlaRosbagRecorder"]


def __getattr__(name: str) -> Any:
    if name == "CarlaRosbagRecorder":
        from src.services.carla_rosbag_service import CarlaRosbagRecorder

        return CarlaRosbagRecorder
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
