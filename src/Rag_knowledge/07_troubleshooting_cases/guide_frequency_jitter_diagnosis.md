---
source: "ROS 2 Diagnostic Playbook"
title: "Expert Diagnostic Guide: ROS 2 Frequency Drop & Jitter"
primary_fault_type: "Frequency_Drop"
primary_layer: "ROS2_DDS_Middleware"
primary_action_type: "Recovery_Adaptation"
---

# Expert Diagnostic Guide: ROS 2 Frequency Drop & Jitter

## 1. Definition
<!-- Metadata: Fault_Type=Frequency_Drop | Layer=ROS2_DDS_Middleware | Action_Type=Diagnostic_Code -->
The publishing frequency drops below the expected nominal rate (e.g. dropping > 20%), or displays high variance / coefficient of variation (std_dev / mean > 0.3) with bursty arrivals.

## 2. Root Causes
<!-- Metadata: Fault_Type=Frequency_Drop | Layer=ROS2_DDS_Middleware | Action_Type=Diagnostic_Code -->
1. **SQLite3 Writer Buffer Saturation (I/O Bottleneck)**:
   - When recording high-throughput sensors (PointCloud2, IMU, Camera) into SQLite3 `.db3`, the disk I/O cannot keep up with synchronous transactions.
   - Rosbag2's internal queue overflows, silently discarding messages before writing.
2. **Single-Threaded Executor Saturation**:
   - A ROS 2 node runs heavy algorithmic processing (e.g. point cloud filtering, Kalman filter) in the same thread as the timer callback.
   - The timer cannot fire on time, causing jitter and dropped cycles.
3. **USB / PCIe Bandwidth Bottleneck**:
   - Multiple sensors sharing the same USB host controller bus.

## 3. Diagnostic Tool Metrics
<!-- Metadata: Fault_Type=Frequency_Drop | Layer=ROS2_DDS_Middleware | Action_Type=Diagnostic_Code -->
- `actual_hz < nominal_hz * 0.8`.
- Coefficient of variation `std_dev / mean > 0.35`.
- Clusters of dropped messages (burst pattern).

## 4. Remediation Actions
<!-- Metadata: Fault_Type=Frequency_Drop | Layer=ROS2_DDS_Middleware | Action_Type=Recovery_Adaptation -->
- Switch storage plugin from SQLite3 to **MCAP** (`--storage mcap`), which writes append-only sequential chunks.
- Increase rosbag buffer size: `--max-cache-size 100000000` (100MB).
- Use **Composable Nodes** (`rclcpp::NodeOptions.use_intra_process_comms(true)`) to eliminate serialization overhead.
- Move time-critical sensor publishers to a `MultiThreadedExecutor` or dedicated callback group.
