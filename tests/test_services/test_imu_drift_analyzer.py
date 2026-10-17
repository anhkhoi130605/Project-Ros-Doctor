import math
from src.services.imu_drift_analyzer import (
    ImuSample,
    analyze_yaw_drift_rate,
)


def test_yaw_drift_rate_detected_in_stationary_state():
    # 50 Hz IMU samples over 4 seconds = 200 samples
    # Vehicle is stationary: ax=0, ay=0, az=9.81, gx=0, gy=0
    # Small yaw drift: gz = 0.08 rad/s (> 0.05 rad/s)
    samples = []
    dt_ns = int(1e9 / 50)  # 20ms
    t_ns = 1_000_000_000

    for _ in range(200):
        samples.append(
            ImuSample(
                timestamp_ns=t_ns,
                gx=0.001,
                gy=-0.002,
                gz=0.08,  # Small drift 0.08 rad/s
                ax=0.01,
                ay=0.02,
                az=9.81,
            )
        )
        t_ns += dt_ns

    anomalies = analyze_yaw_drift_rate(samples, drift_rate_threshold=0.05)
    assert len(anomalies) >= 1
    assert anomalies[0].detected is True
    assert anomalies[0].yaw_drift_rate >= 0.07
    assert anomalies[0].integrated_yaw_deg > 0


def test_nominal_yaw_drift_rate_not_flagged():
    # 50 Hz IMU samples over 4 seconds
    # Very small sensor noise around zero: gz = 0.005 rad/s (< 0.05 rad/s)
    samples = []
    dt_ns = int(1e9 / 50)
    t_ns = 1_000_000_000

    for i in range(200):
        noise = 0.01 * math.sin(i * 0.1)
        samples.append(
            ImuSample(
                timestamp_ns=t_ns,
                gx=0.0,
                gy=0.0,
                gz=noise,
                ax=0.0,
                ay=0.0,
                az=9.81,
            )
        )
        t_ns += dt_ns

    anomalies = analyze_yaw_drift_rate(samples, drift_rate_threshold=0.05)
    assert len(anomalies) == 0


def test_genuine_vehicle_turn_not_flagged_as_drift():
    # When turning, vehicle has high lateral acceleration |ay| > 2.0 m/s^2 or roll/pitch
    samples = []
    dt_ns = int(1e9 / 50)
    t_ns = 1_000_000_000

    for _ in range(200):
        samples.append(
            ImuSample(
                timestamp_ns=t_ns,
                gx=0.0,
                gy=0.0,
                gz=0.5,  # Active steering turn
                ax=1.0,
                ay=3.5,  # Significant centripetal lateral acceleration
                az=9.81,
            )
        )
        t_ns += dt_ns

    anomalies = analyze_yaw_drift_rate(samples, drift_rate_threshold=0.05)
    assert len(anomalies) == 0
