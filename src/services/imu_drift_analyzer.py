"""Numerical Integration Yaw Drift Analyzer for ROS 2 IMU Telemetry.

Integrates angular velocity around the Z-axis (numerical integration) to track
accumulated heading drift and yaw drift rate:
  theta_z(t) = \\int_0^t omega_z(tau) dtau = \\sum 0.5 * (gz_i + gz_{i-1}) * dt_i

Automatically detects subtle yaw drift (> 0.05 rad/s) even when the vehicle
is stationary or in steady linear motion.
"""
from __future__ import annotations

import math
import sqlite3
import struct
from collections.abc import Sequence
from dataclasses import dataclass


@dataclass
class ImuSample:
    timestamp_ns: int
    gx: float  # roll rate (rad/s)
    gy: float  # pitch rate (rad/s)
    gz: float  # yaw rate (rad/s)
    ax: float  # longitudinal accel (m/s^2)
    ay: float  # lateral accel (m/s^2)
    az: float  # vertical accel (m/s^2)


@dataclass
class YawDriftAnomaly:
    detected: bool
    yaw_drift_rate: float       # rad/s
    integrated_yaw_deg: float   # accumulated degrees
    start_sec: float
    end_sec: float
    duration_sec: float
    steady_sample_count: int
    description: str


def analyze_yaw_drift_rate(
    samples: Sequence[ImuSample],
    drift_rate_threshold: float = 0.05,
    min_duration_sec: float = 2.0,
    min_steady_samples: int = 20,
) -> list[YawDriftAnomaly]:
    """Analyze sequence of IMU samples using numerical integration to detect yaw drift (> 0.05 rad/s).

    Vehicle stationary or steady linear motion conditions:
      - Lateral acceleration |ay| <= 1.2 m/s^2
      - Roll/pitch rotational rates |gx| <= 0.15 rad/s, |gy| <= 0.15 rad/s
      - Total gravity magnitude 7.5 <= sqrt(ax^2 + ay^2 + az^2) <= 12.5 m/s^2
    """
    if len(samples) < min_steady_samples:
        return []

    anomalies: list[YawDriftAnomaly] = []

    # Sort samples by timestamp
    sorted_samples = sorted(samples, key=lambda s: s.timestamp_ns)
    t0_ns = sorted_samples[0].timestamp_ns

    prev_ts_ns: int | None = None
    prev_gz: float = 0.0
    integrated_yaw_rad: float = 0.0
    window_start_ns: int = 0
    steady_count: int = 0

    for s in sorted_samples:
        accel_mag = math.sqrt(s.ax * s.ax + s.ay * s.ay + s.az * s.az)

        # Condition: vehicle is stationary or moving in steady straight line
        is_steady = (
            abs(s.ay) <= 1.2
            and abs(s.gx) <= 0.15
            and abs(s.gy) <= 0.15
            and 7.5 <= accel_mag <= 12.5
            and abs(s.gz) < 34.0  # not saturated/wild read
        )

        if is_steady:
            if window_start_ns == 0:
                window_start_ns = s.timestamp_ns

            if prev_ts_ns is not None:
                dt_sec = (s.timestamp_ns - prev_ts_ns) / 1e9
                if 0 < dt_sec <= 0.25:
                    # Trapezoidal numerical integration
                    integrated_yaw_rad += 0.5 * (s.gz + prev_gz) * dt_sec
                    steady_count += 1

            elapsed_sec = (s.timestamp_ns - window_start_ns) / 1e9
            if elapsed_sec >= min_duration_sec and steady_count >= min_steady_samples:
                drift_rate = abs(integrated_yaw_rad) / elapsed_sec
                if drift_rate > drift_rate_threshold:
                    yaw_deg = round(integrated_yaw_rad * 180.0 / math.pi, 2)
                    rel_start = (window_start_ns - t0_ns) / 1e9
                    rel_end = (s.timestamp_ns - t0_ns) / 1e9

                    anomalies.append(
                        YawDriftAnomaly(
                            detected=True,
                            yaw_drift_rate=round(drift_rate, 4),
                            integrated_yaw_deg=yaw_deg,
                            start_sec=round(rel_start, 2),
                            end_sec=round(rel_end, 2),
                            duration_sec=round(elapsed_sec, 2),
                            steady_sample_count=steady_count,
                            description=(
                                f"Tích phân con lắc số (numerical integration) phát hiện độ trôi góc xoay quanh trục Z "
                                f"đạt {yaw_deg}° qua {elapsed_sec:.1f}s (tốc độ trôi yaw drift rate = {drift_rate:.3f} rad/s > {drift_rate_threshold} rad/s) "
                                f"ngay khi xe đang ở trạng thái đứng yên/chuyển động thẳng đều."
                            ),
                        )
                    )
                    # Reset window to capture next distinct event if any
                    window_start_ns = 0
                    integrated_yaw_rad = 0.0
                    steady_count = 0
        else:
            # Genuine turn or heavy disturbance: reset integration window
            window_start_ns = 0
            integrated_yaw_rad = 0.0
            steady_count = 0

        prev_ts_ns = s.timestamp_ns
        prev_gz = s.gz

    return anomalies


def parse_imu_cdr_payload(raw: bytes, timestamp_ns: int) -> ImuSample | None:
    """Parse raw CDR binary payload of a sensor_msgs/msg/Imu ROS 2 message."""
    if len(raw) < 120:
        return None
    try:
        pos = 4  # skip CDR header
        pos += 8  # skip stamp (sec + nsec)

        if pos + 4 > len(raw):
            return None
        flen = struct.unpack_from("<I", raw, pos)[0]
        if flen > 256:
            return None
        pos += 4 + flen

        # Align to 8-byte boundary relative to payload offset 4
        pos = 4 + (((pos - 4) + 7) & ~7)

        # Skip orientation (32 bytes) + covariance (72 bytes) = 104 bytes
        orient_block_size = 104
        # Angular vel (24 bytes) + covariance (72 bytes)
        ang_vel_size = 24
        ang_vel_cov_size = 72
        # Linear accel (24 bytes)
        lin_accel_size = 24

        if pos + orient_block_size + ang_vel_size + ang_vel_cov_size + lin_accel_size > len(raw):
            return None

        pos += orient_block_size
        gx, gy, gz = struct.unpack_from("<ddd", raw, pos)
        pos += ang_vel_size + ang_vel_cov_size
        ax, ay, az = struct.unpack_from("<ddd", raw, pos)

        # Sanity check
        if any(math.isnan(v) or math.isinf(v) for v in (gx, gy, gz, ax, ay, az)):
            return None
        if max(abs(ax), abs(ay), abs(az)) > 200 or max(abs(gx), abs(gy), abs(gz)) > 50:
            return None

        return ImuSample(
            timestamp_ns=timestamp_ns,
            gx=gx, gy=gy, gz=gz,
            ax=ax, ay=ay, az=az,
        )
    except Exception:
        return None


def extract_and_analyze_db3_imu(
    db3_path: str,
    imu_topic: str | None = None,
    drift_rate_threshold: float = 0.05,
) -> list[YawDriftAnomaly]:
    """Inspect .db3 rosbag file and run numerical integration yaw drift analysis."""
    conn = sqlite3.connect(db3_path)
    cursor = conn.cursor()

    try:
        # Find IMU topic
        if imu_topic:
            cursor.execute("SELECT id FROM topics WHERE name = ?", (imu_topic,))
        else:
            cursor.execute(
                "SELECT id FROM topics WHERE type = 'sensor_msgs/msg/Imu' OR name LIKE '%imu%'"
            )
        row = cursor.fetchone()
        if not row:
            return []
        topic_id = row[0]

        cursor.execute(
            "SELECT timestamp, data FROM messages WHERE topic_id = ? ORDER BY timestamp ASC",
            (topic_id,),
        )
        samples: list[ImuSample] = []
        for ts, data in cursor.fetchall():
            sample = parse_imu_cdr_payload(data, ts)
            if sample:
                samples.append(sample)

        return analyze_yaw_drift_rate(samples, drift_rate_threshold=drift_rate_threshold)
    finally:
        conn.close()
