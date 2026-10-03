---
source: "ROS 2 Diagnostic Playbook"
title: "Expert Diagnostic Guide: ROS 2 Timestamp Anomalies"
primary_fault_type: "Timestamp_Shift"
primary_layer: "ROS2_DDS_Middleware"
primary_action_type: "Recovery_Adaptation"
---

# Expert Diagnostic Guide: ROS 2 Timestamp Anomalies

## 1. Definition
<!-- Metadata: Fault_Type=Timestamp_Shift | Layer=ROS2_DDS_Middleware | Action_Type=Diagnostic_Code -->
Discrepancy between message `header.stamp` and `record_timestamp` (receive time), non-monotonic time jumps, timestamps jumping backwards, or timestamps frozen at epoch 0 (1970-01-01).

## 2. Root Causes
<!-- Metadata: Fault_Type=Timestamp_Shift | Layer=ROS2_DDS_Middleware | Action_Type=Diagnostic_Code -->
1. **Clock Skew between Distributed Machines**:
   - Sensor or micro-controller has its own internal RTC not synchronized via NTP/PTP with the host recording PC.
   - Time difference drifts gradually or jumps when NTP daemon performs a step correction.
2. **Hardware Clock Reset / Unsynchronized Sensor**:
   - Micro-controller boots up before receiving GPS/NTP time, publishing timestamps starting from `0.000000` (Unix Epoch 1970).
3. **Simulation vs Wall Time Discrepancy**:
   - `use_sim_time` is enabled on some nodes and disabled on others, mixing `/clock` (simulated time) with system wall-clock time.
4. **Out-of-Order Delivery**:
   - Messages processed through parallel pipelines or multi-threaded callback groups arriving at the recorder out of temporal order.

## 3. Diagnostic Tool Metrics
<!-- Metadata: Fault_Type=Timestamp_Shift | Layer=ROS2_DDS_Middleware | Action_Type=Diagnostic_Code -->
- Delta `abs(header_stamp - record_timestamp) > 0.5` seconds.
- Negative delta `delta_t < 0` (backward time travel).
- Timestamps near `0` (nanoseconds < 10^12).

## 4. Remediation Actions
<!-- Metadata: Fault_Type=Timestamp_Shift | Layer=ROS2_DDS_Middleware | Action_Type=Recovery_Adaptation -->
- Configure `chrony` or `ptpd` for sub-millisecond precision IEEE 1588 PTP synchronization across robot subnet.
- Ensure nodes wait for valid GPS PPS / time synchronization before publishing valid headers.
- Strictly align `use_sim_time: true` across all participating nodes during bag playback or Gazebo simulation.
