"""
Carla to ROS2 Rosbag (.db3 + metadata.yaml) Recorder Service.
Records IMU, LiDAR, and RGB Camera from CARLA simulator every 1 second (1 Hz).
"""

from __future__ import annotations

import datetime
import math
import os
from pathlib import Path
import sqlite3
import struct
import sys
import threading
import time
from typing import Any, Optional

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import numpy as np

# Check if rosbags library is installed
try:
    from rosbags.rosbag2 import Writer as RosbagsWriter
    from rosbags.typesys import Stores, get_typestore

    ROSBAGS_AVAILABLE = True
except ImportError:
    ROSBAGS_AVAILABLE = False


def _euler_to_quaternion(roll_rad: float, pitch_rad: float, yaw_rad: float) -> tuple[float, float, float, float]:
    """Convert Euler angles (radians) to Quaternion (x, y, z, w)."""
    cy = math.cos(yaw_rad * 0.5)
    sy = math.sin(yaw_rad * 0.5)
    cp = math.cos(pitch_rad * 0.5)
    sp = math.sin(pitch_rad * 0.5)
    cr = math.cos(roll_rad * 0.5)
    sr = math.sin(roll_rad * 0.5)

    w = cr * cp * cy + sr * sp * sy
    x = sr * cp * cy - cr * sp * sy
    y = cr * sp * cy + sr * cp * sy
    z = cr * cp * sy - sr * sp * cy
    return x, y, z, w


class FallbackRosbagWriter:
    """Zero-dependency fallback writer producing standard ROS2 Humble sqlite3 (.db3) + metadata.yaml."""

    def __init__(self, bag_dir: Path):
        self.bag_dir = Path(bag_dir)
        self.bag_dir.mkdir(parents=True, exist_ok=True)
        self.db_name = f"{self.bag_dir.name}.db3"
        self.db_path = self.bag_dir / self.db_name

        self.conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
        self.cursor = self.conn.cursor()
        self._init_db()

        self.topics: dict[str, int] = {}
        self.topic_types: dict[str, str] = {}
        self.message_counts: dict[str, int] = {}
        self.start_time_ns: Optional[int] = None
        self.end_time_ns: Optional[int] = None
        self.total_messages = 0
        self._lock = threading.Lock()

    def _init_db(self):
        self.cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS topics (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                serialization_format TEXT NOT NULL,
                offered_qos_profiles TEXT NOT NULL
            );
        """
        )
        self.cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY,
                topic_id INTEGER NOT NULL,
                timestamp INTEGER NOT NULL,
                data BLOB NOT NULL
            );
        """
        )
        self.cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS timestamp_idx ON messages (timestamp ASC);
        """
        )
        self.conn.commit()

    def add_connection(self, topic: str, msg_type: str) -> int:
        with self._lock:
            if topic not in self.topics:
                topic_id = len(self.topics) + 1
                self.topics[topic] = topic_id
                self.topic_types[topic] = msg_type
                self.message_counts[topic] = 0
                self.cursor.execute(
                    "INSERT INTO topics (id, name, type, serialization_format, offered_qos_profiles) VALUES (?, ?, ?, ?, ?)",
                    (topic_id, topic, msg_type, "cdr", ""),
                )
                self.conn.commit()
            return self.topics[topic]

    def write(self, topic_id: int, timestamp_ns: int, data: bytes):
        with self._lock:
            self.total_messages += 1
            if self.start_time_ns is None or timestamp_ns < self.start_time_ns:
                self.start_time_ns = timestamp_ns
            if self.end_time_ns is None or timestamp_ns > self.end_time_ns:
                self.end_time_ns = timestamp_ns

            for topic, tid in self.topics.items():
                if tid == topic_id:
                    self.message_counts[topic] += 1
                    break

            self.cursor.execute(
                "INSERT INTO messages (topic_id, timestamp, data) VALUES (?, ?, ?)",
                (topic_id, timestamp_ns, sqlite3.Binary(data)),
            )

    def close(self):
        with self._lock:
            self.conn.commit()
            self.conn.close()
            self._write_metadata()

    def _write_metadata(self):
        start_ns = self.start_time_ns or 0
        end_ns = self.end_time_ns or start_ns
        duration_ns = max(0, end_ns - start_ns)

        topics_yaml = []
        for topic, count in self.message_counts.items():
            msg_type = self.topic_types[topic]
            topics_yaml.append(
                f"""  - message_count: {count}
    topic_metadata:
      name: {topic}
      offered_qos_profiles: ''
      serialization_format: cdr
      type: {msg_type}"""
            )

        metadata_content = f"""rosbag2_bagfile_information:
  compression_format: ''
  compression_mode: ''
  custom_data: null
  duration:
    nanoseconds: {duration_ns}
  files:
  - duration:
      nanoseconds: {duration_ns}
    message_count: {self.total_messages}
    path: {self.db_name}
    starting_time:
      nanoseconds_since_epoch: {start_ns}
  message_count: {self.total_messages}
  relative_file_paths:
  - {self.db_name}
  ros_distro: rosbags
  starting_time:
    nanoseconds_since_epoch: {start_ns}
  storage_identifier: sqlite3
  topics_with_message_count:
{chr(10).join(topics_yaml)}
  version: 8
"""
        yaml_path = self.bag_dir / "metadata.yaml"
        yaml_path.write_text(metadata_content, encoding="utf-8")


class CarlaRosbagRecorder:
    """
    Connects to CARLA Simulator and records IMU, LiDAR, and RGB Camera into ROS2 bag (db3 + yaml) at 1 Hz.
    """

    def __init__(
        self,
        host: str = "127.0.0.1",
        port: int = 2000,
        output_dir: Optional[str | Path] = None,
        sampling_interval: float = 1.0,
        image_width: int = 800,
        image_height: int = 600,
        lidar_channels: int = 32,
        lidar_range: float = 50.0,
        lidar_points_per_sec: int = 56000,
    ):
        self.host = host
        self.port = port
        self.sampling_interval = sampling_interval
        self.image_width = image_width
        self.image_height = image_height
        self.lidar_channels = lidar_channels
        self.lidar_range = lidar_range
        self.lidar_points_per_sec = lidar_points_per_sec

        # Determine output directory
        if output_dir is None:
            base_data = Path(__file__).resolve().parent.parent / "Data"
            timestamp_str = datetime.datetime.now().strftime("%Y_%m_%d-%H_%M_%S")
            self.bag_dir = base_data / f"rosbag2_carla_{timestamp_str}"
        else:
            self.bag_dir = Path(output_dir)

        self.client: Any = None
        self.world: Any = None
        self.vehicle: Any = None
        self.is_vehicle_spawned_by_us = False

        self.sensors: list[Any] = []
        self.writer: Any = None
        self.is_recording = False
        self._lock = threading.Lock()

        # Topic connections
        self.imu_conn: Any = None
        self.lidar_conn: Any = None
        self.cam_conn: Any = None

        # rosbags setup if available
        self.typestore = None
        if ROSBAGS_AVAILABLE:
            self.typestore = get_typestore(Stores.ROS2_HUMBLE)

        # Rate limiter tracker (to enforce strictly 1 Hz per sensor)
        self.last_imu_time = 0.0
        self.last_lidar_time = 0.0
        self.last_cam_time = 0.0

    def connect_carla(self):
        """Connect to CARLA server."""
        try:
            import carla
        except ImportError as err:
            raise RuntimeError(
                "Thư viện 'carla' chưa được cài đặt trong môi trường Python này. "
                "Hãy kiểm tra lại môi trường conda (ví dụ: 'carla37' trên WSL) hoặc pip install carla."
            ) from err

        print(f"[CARLA] Đang kết nối tới CARLA Server tại {self.host}:{self.port}...")
        self.client = carla.Client(self.host, self.port)
        self.client.set_timeout(10.0)
        self.world = self.client.get_world()
        map_name = self.world.get_map().name
        print(f"[CARLA] Kết nối thành công! Bản đồ hiện tại: {map_name}")

    def get_or_spawn_vehicle(self) -> Any:
        """Find an existing ego vehicle or spawn a new one."""
        import carla

        # Check existing actors
        actors = self.world.get_actors()
        vehicles = actors.filter("vehicle.*")
        for v in vehicles:
            role = v.attributes.get("role_name", "")
            if role in ["hero", "ego_vehicle"]:
                print(f"[CARLA] Đã tìm thấy xe có sẵn với role='{role}' (ID: {v.id})")
                self.is_vehicle_spawned_by_us = False
                return v

        if len(vehicles) > 0:
            first_v = vehicles[0]
            print(f"[CARLA] Sử dụng xe có sẵn trong map (ID: {first_v.id}, Loại: {first_v.type_id})")
            self.is_vehicle_spawned_by_us = False
            return first_v

        # Otherwise spawn a new vehicle
        bp_lib = self.world.get_blueprint_library()
        vehicle_bp = bp_lib.find("vehicle.tesla.model3")
        vehicle_bp.set_attribute("role_name", "ego_vehicle")

        spawn_points = self.world.get_map().get_spawn_points()
        if not spawn_points:
            raise RuntimeError("Không tìm thấy vị trí spawn nào trên bản đồ hiện tại!")

        spawn_point = spawn_points[0]
        vehicle = self.world.spawn_actor(vehicle_bp, spawn_point)
        vehicle.set_autopilot(True)
        self.is_vehicle_spawned_by_us = True
        print(f"[CARLA] Đã spawn xe thử nghiệm Tesla Model 3 tại {spawn_point.location} (ID: {vehicle.id})")
        return vehicle

    def setup_bag_writer(self):
        """Initialize the ROS2 bag writer."""
        self.bag_dir.parent.mkdir(parents=True, exist_ok=True)
        # rosbags Writer raises if directory exists, so ensure unique non-existing path
        if self.bag_dir.exists():
            counter = 1
            orig_name = self.bag_dir.name
            while self.bag_dir.exists():
                self.bag_dir = self.bag_dir.parent / f"{orig_name}_{counter}"
                counter += 1

        print(f"[ROSBAG] Khởi tạo ROS2 Bag tại: {self.bag_dir}")

        if ROSBAGS_AVAILABLE:
            self.writer = RosbagsWriter(self.bag_dir, version=8)
            self.writer.open()
            self.imu_conn = self.writer.add_connection(
                "/carla/ego_vehicle/imu", "sensor_msgs/msg/Imu", typestore=self.typestore
            )
            self.lidar_conn = self.writer.add_connection(
                "/carla/ego_vehicle/lidar", "sensor_msgs/msg/PointCloud2", typestore=self.typestore
            )
            self.cam_conn = self.writer.add_connection(
                "/carla/ego_vehicle/camera/rgb", "sensor_msgs/msg/Image", typestore=self.typestore
            )
        else:
            self.writer = FallbackRosbagWriter(self.bag_dir)
            self.imu_conn = self.writer.add_connection("/carla/ego_vehicle/imu", "sensor_msgs/msg/Imu")
            self.lidar_conn = self.writer.add_connection("/carla/ego_vehicle/lidar", "sensor_msgs/msg/PointCloud2")
            self.cam_conn = self.writer.add_connection("/carla/ego_vehicle/camera/rgb", "sensor_msgs/msg/Image")

    def _on_imu_data(self, data: Any):
        """Callback for CARLA IMU data (1 Hz)."""
        now = time.time()
        if now - self.last_imu_time < (self.sampling_interval - 0.05):
            return
        self.last_imu_time = now

        # Timestamp in nanoseconds
        t_ns = int(now * 1e9)
        sec = int(now)
        nanosec = int((now - sec) * 1e9)

        # Coordinate conversion: CARLA left-hand -> ROS right-hand
        # Accel
        ax = float(data.accelerometer.x)
        ay = float(-data.accelerometer.y)
        az = float(data.accelerometer.z)

        # Gyro (rad/s)
        gx = float(data.gyroscope.x)
        gy = float(-data.gyroscope.y)
        gz = float(-data.gyroscope.z)

        # Orientation from compass / transform
        compass_rad = float(data.compass)
        qx, qy, qz, qw = _euler_to_quaternion(0.0, 0.0, -compass_rad)

        if ROSBAGS_AVAILABLE:
            Header = self.typestore.types["std_msgs/msg/Header"]
            Time = self.typestore.types["builtin_interfaces/msg/Time"]
            Imu = self.typestore.types["sensor_msgs/msg/Imu"]
            Quaternion = self.typestore.types["geometry_msgs/msg/Quaternion"]
            Vector3 = self.typestore.types["geometry_msgs/msg/Vector3"]

            msg = Imu(
                header=Header(stamp=Time(sec=sec, nanosec=nanosec), frame_id="imu_link"),
                orientation=Quaternion(x=qx, y=qy, z=qz, w=qw),
                orientation_covariance=np.zeros(9, dtype=np.float64),
                angular_velocity=Vector3(x=gx, y=gy, z=gz),
                angular_velocity_covariance=np.zeros(9, dtype=np.float64),
                linear_acceleration=Vector3(x=ax, y=ay, z=az),
                linear_acceleration_covariance=np.zeros(9, dtype=np.float64),
            )
            raw = self.typestore.serialize_cdr(msg, "sensor_msgs/msg/Imu")
        else:
            # Native pure-Python CDR serialization
            buf = bytearray(b"\x00\x01\x00\x00")
            buf.extend(struct.pack("<ii", sec, nanosec))
            frame_id_b = b"imu_link\x00"
            buf.extend(struct.pack("<I", len(frame_id_b)))
            buf.extend(frame_id_b)
            while (len(buf) - 4) % 4 != 0:
                buf.append(0)
            buf.extend(struct.pack("<4d", qx, qy, qz, qw))
            buf.extend(struct.pack("<9d", *([0.0] * 9)))
            buf.extend(struct.pack("<3d", gx, gy, gz))
            buf.extend(struct.pack("<9d", *([0.0] * 9)))
            buf.extend(struct.pack("<3d", ax, ay, az))
            buf.extend(struct.pack("<9d", *([0.0] * 9)))
            raw = bytes(buf)

        with self._lock:
            if self.is_recording and self.writer:
                self.writer.write(self.imu_conn, t_ns, raw)

    def _on_lidar_data(self, data: Any):
        """Callback for CARLA LiDAR data (1 Hz)."""
        now = time.time()
        if now - self.last_lidar_time < (self.sampling_interval - 0.05):
            return
        self.last_lidar_time = now

        t_ns = int(now * 1e9)
        sec = int(now)
        nanosec = int((now - sec) * 1e9)

        # Parse raw lidar buffer: x, y, z, intensity (float32)
        raw_pts = np.frombuffer(data.raw_data, dtype=np.dtype("f4"))
        points = np.reshape(raw_pts, (int(raw_pts.shape[0] / 4), 4)).copy()
        # Invert y axis for ROS right-handed REP 103 convention
        points[:, 1] = -points[:, 1]

        num_points = int(points.shape[0])
        point_step = 16
        row_step = point_step * num_points
        data_bytes = points.tobytes()

        if ROSBAGS_AVAILABLE:
            Header = self.typestore.types["std_msgs/msg/Header"]
            Time = self.typestore.types["builtin_interfaces/msg/Time"]
            PointCloud2 = self.typestore.types["sensor_msgs/msg/PointCloud2"]
            PointField = self.typestore.types["sensor_msgs/msg/PointField"]

            fields = [
                PointField(name="x", offset=0, datatype=7, count=1),
                PointField(name="y", offset=4, datatype=7, count=1),
                PointField(name="z", offset=8, datatype=7, count=1),
                PointField(name="intensity", offset=12, datatype=7, count=1),
            ]
            msg = PointCloud2(
                header=Header(stamp=Time(sec=sec, nanosec=nanosec), frame_id="lidar_link"),
                height=1,
                width=num_points,
                fields=fields,
                is_bigendian=False,
                point_step=point_step,
                row_step=row_step,
                data=np.frombuffer(data_bytes, dtype=np.uint8),
                is_dense=True,
            )
            raw = self.typestore.serialize_cdr(msg, "sensor_msgs/msg/PointCloud2")
        else:
            buf = bytearray(b"\x00\x01\x00\x00")
            buf.extend(struct.pack("<ii", sec, nanosec))
            frame_id_b = b"lidar_link\x00"
            buf.extend(struct.pack("<I", len(frame_id_b)))
            buf.extend(frame_id_b)
            while (len(buf) - 4) % 4 != 0:
                buf.append(0)
            buf.extend(struct.pack("<II", 1, num_points))  # height, width
            # 4 fields: sequence length
            buf.extend(struct.pack("<I", 4))
            for name, offset in [("x", 0), ("y", 4), ("z", 8), ("intensity", 12)]:
                nb = name.encode("utf-8") + b"\x00"
                buf.extend(struct.pack("<I", len(nb)))
                buf.extend(nb)
                while (len(buf) - 4) % 4 != 0:
                    buf.append(0)
                # offset (uint32), datatype (uint8), 3 bytes pad, count (uint32)
                buf.extend(struct.pack("<IB3xI", offset, 7, 1))
            buf.append(0)  # is_bigendian (bool)
            while (len(buf) - 4) % 4 != 0:
                buf.append(0)
            buf.extend(struct.pack("<II", point_step, row_step))
            buf.extend(struct.pack("<I", len(data_bytes)))
            buf.extend(data_bytes)
            buf.append(1)  # is_dense=True
            raw = bytes(buf)

        with self._lock:
            if self.is_recording and self.writer:
                self.writer.write(self.lidar_conn, t_ns, raw)

    def _on_camera_data(self, data: Any):
        """Callback for CARLA RGB Camera data (1 Hz)."""
        now = time.time()
        if now - self.last_cam_time < (self.sampling_interval - 0.05):
            return
        self.last_cam_time = now

        t_ns = int(now * 1e9)
        sec = int(now)
        nanosec = int((now - sec) * 1e9)

        # Convert CARLA BGRA image to RGB
        raw_bgra = np.frombuffer(data.raw_data, dtype=np.dtype("uint8"))
        img_bgra = np.reshape(raw_bgra, (data.height, data.width, 4))
        img_rgb = img_bgra[:, :, :3][:, :, ::-1]  # Drop alpha, BGR to RGB
        rgb_bytes = img_rgb.tobytes()

        step = data.width * 3

        if ROSBAGS_AVAILABLE:
            Header = self.typestore.types["std_msgs/msg/Header"]
            Time = self.typestore.types["builtin_interfaces/msg/Time"]
            Image = self.typestore.types["sensor_msgs/msg/Image"]

            msg = Image(
                header=Header(stamp=Time(sec=sec, nanosec=nanosec), frame_id="camera_link"),
                height=data.height,
                width=data.width,
                encoding="rgb8",
                is_bigendian=0,
                step=step,
                data=np.frombuffer(rgb_bytes, dtype=np.uint8),
            )
            raw = self.typestore.serialize_cdr(msg, "sensor_msgs/msg/Image")
        else:
            buf = bytearray(b"\x00\x01\x00\x00")
            buf.extend(struct.pack("<ii", sec, nanosec))
            frame_id_b = b"camera_link\x00"
            buf.extend(struct.pack("<I", len(frame_id_b)))
            buf.extend(frame_id_b)
            while (len(buf) - 4) % 4 != 0:
                buf.append(0)
            buf.extend(struct.pack("<II", data.height, data.width))
            enc_b = b"rgb8\x00"
            buf.extend(struct.pack("<I", len(enc_b)))
            buf.extend(enc_b)
            buf.append(0)  # is_bigendian (uint8, no alignment needed)
            while (len(buf) - 4) % 4 != 0:
                buf.append(0)
            buf.extend(struct.pack("<II", step, len(rgb_bytes)))
            buf.extend(rgb_bytes)
            raw = bytes(buf)

        with self._lock:
            if self.is_recording and self.writer:
                self.writer.write(self.cam_conn, t_ns, raw)

    def attach_sensors(self):
        """Spawn and attach IMU, LiDAR, and RGB Camera to vehicle."""
        import carla

        bp_lib = self.world.get_blueprint_library()

        # 1. IMU sensor (1 Hz tick)
        imu_bp = bp_lib.find("sensor.other.imu")
        imu_bp.set_attribute("sensor_tick", str(self.sampling_interval))
        imu_transform = carla.Transform(carla.Location(x=0.0, y=0.0, z=1.4))
        imu_actor = self.world.spawn_actor(imu_bp, imu_transform, attach_to=self.vehicle)
        imu_actor.listen(self._on_imu_data)
        self.sensors.append(imu_actor)
        print("[SENSORS] Đã gắn IMU (sensor_tick = 1.0s)")

        # 2. LiDAR sensor (1 Hz tick)
        lidar_bp = bp_lib.find("sensor.lidar.ray_cast")
        lidar_bp.set_attribute("sensor_tick", str(self.sampling_interval))
        lidar_bp.set_attribute("channels", str(self.lidar_channels))
        lidar_bp.set_attribute("range", str(self.lidar_range))
        lidar_bp.set_attribute("points_per_second", str(self.lidar_points_per_sec))
        lidar_transform = carla.Transform(carla.Location(x=0.0, y=0.0, z=2.2))
        lidar_actor = self.world.spawn_actor(lidar_bp, lidar_transform, attach_to=self.vehicle)
        lidar_actor.listen(self._on_lidar_data)
        self.sensors.append(lidar_actor)
        print("[SENSORS] Đã gắn LiDAR (sensor_tick = 1.0s, channels = 32)")

        # 3. RGB Camera sensor (1 Hz tick)
        cam_bp = bp_lib.find("sensor.camera.rgb")
        cam_bp.set_attribute("sensor_tick", str(self.sampling_interval))
        cam_bp.set_attribute("image_size_x", str(self.image_width))
        cam_bp.set_attribute("image_size_y", str(self.image_height))
        cam_bp.set_attribute("fov", "90.0")
        cam_transform = carla.Transform(
            carla.Location(x=1.6, y=0.0, z=1.7),
            carla.Rotation(pitch=0.0, yaw=0.0, roll=0.0),
        )
        cam_actor = self.world.spawn_actor(cam_bp, cam_transform, attach_to=self.vehicle)
        cam_actor.listen(self._on_camera_data)
        self.sensors.append(cam_actor)
        print(f"[SENSORS] Đã gắn RGB Camera (sensor_tick = 1.0s, res = {self.image_width}x{self.image_height})")

    def start(self):
        """Start CARLA connection, attach sensors, and begin recording."""
        self.connect_carla()
        self.vehicle = self.get_or_spawn_vehicle()
        self.setup_bag_writer()

        self.is_recording = True
        self.attach_sensors()
        print("\n>>> [RECORDING] Đang ghi log CARLA IMU, LiDAR, Camera vào ROS2 Bag (.db3 + yaml) mỗi giây...")

    def stop(self):
        """Stop recording and cleanup all resources."""
        print("\n[RECORDING] Đang dừng quá trình ghi log...")
        with self._lock:
            self.is_recording = False

        # Destroy sensors
        for s in self.sensors:
            try:
                if s.is_listening:
                    s.stop()
                s.destroy()
            except Exception:
                pass
        self.sensors.clear()

        # Destroy vehicle if we spawned it
        if self.is_vehicle_spawned_by_us and self.vehicle:
            try:
                self.vehicle.destroy()
                print("[CARLA] Đã giải phóng xe thử nghiệm.")
            except Exception:
                pass
            self.vehicle = None

        # Close writer and finalize metadata.yaml
        if self.writer:
            self.writer.close()
            self.writer = None

        print(f"[HOÀN TẤT] File ROS2 Bag đã được xuất thành công tại: {self.bag_dir}")
        db3_files = list(self.bag_dir.glob("*.db3"))
        yaml_files = list(self.bag_dir.glob("*.yaml"))
        print(f"  - Database: {[f.name for f in db3_files]}")
        print(f"  - Metadata: {[f.name for f in yaml_files]}")

    def record_for_duration(self, seconds: int = 10):
        """Run recording for a specific number of seconds."""
        try:
            self.start()
            for i in range(seconds):
                time.sleep(1)
                print(f"  [Đã ghi]: {i + 1}/{seconds} giây...")
        except KeyboardInterrupt:
            print("\n[USER] Nhận lệnh ngắt bàn phím (Ctrl+C).")
        finally:
            self.stop()
