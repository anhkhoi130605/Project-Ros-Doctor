"""
CLI Runner to record CARLA IMU, LiDAR, and RGB Camera into ROS2 bag (db3 + yaml) at 1 Hz.
Usage:
    python -m src.record_carla_bag --duration 10
    python src/record_carla_bag.py --host 127.0.0.1 --port 2000 --duration 15
"""

import argparse
import sys
from pathlib import Path

# Fix Windows console UTF-8 output encoding
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from src.services.carla_rosbag_service import CarlaRosbagRecorder


def main():
    parser = argparse.ArgumentParser(
        description="Ghi dữ liệu IMU, LiDAR và Camera từ CARLA Simulator thành ROS2 Rosbag (.db3 + yaml)"
    )
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Địa chỉ CARLA Server (mặc định: 127.0.0.1)")
    parser.add_argument("-p", "--port", type=int, default=2000, help="Cổng CARLA Server (mặc định: 2000)")
    parser.add_argument(
        "-d",
        "--duration",
        type=int,
        default=10,
        help="Thời gian ghi (giây). Mặc định: 10 giây (mỗi giây 1 bản ghi = 10 mẫu/sensor)",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=str,
        default=None,
        help="Thư mục xuất rosbag2 (mặc định: lưu tự động vào src/Data/rosbag2_carla_<timestamp>)",
    )
    parser.add_argument(
        "--rate",
        type=float,
        default=1.0,
        help="Chu kỳ lấy mẫu sensor (giây). Mặc định: 1.0 giây (1 Hz)",
    )

    args = parser.parse_args()

    print("=" * 70)
    print(" CARLA SIMULATOR -> ROS2 ROSBAG (.db3 + metadata.yaml) LOGGER")
    print(f" - Host: {args.host}:{args.port}")
    print(f" - Tần số ghi: 1 bản ghi / {args.rate} giây (1 Hz)")
    print(f" - Thời gian ghi dự kiến: {args.duration} giây")
    print(
        " - Topics: /carla/ego_vehicle/imu, /carla/ego_vehicle/lidar, /carla/ego_vehicle/camera/rgb"
    )
    print("=" * 70)

    recorder = CarlaRosbagRecorder(
        host=args.host,
        port=args.port,
        output_dir=args.output,
        sampling_interval=args.rate,
    )

    try:
        recorder.record_for_duration(seconds=args.duration)
    except Exception as e:
        print(f"\n[LỖI] Có lỗi xảy ra: {e}", file=sys.stderr)
        print("Vui lòng đảm bảo CARLA Server đã được bật trước khi chạy script!", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
