---
source: "ROS 2 Diagnostic Playbook"
title: "Expert Diagnostic Guide: ROS 2 Topic Dropout"
primary_fault_type: "Message_Dropout"
primary_layer: "ROS2_DDS_Middleware"
primary_action_type: "Recovery_Adaptation"
---

# Expert Diagnostic Guide: ROS 2 Topic Dropout

## 1. Definition
<!-- Metadata: Fault_Type=Message_Dropout | Layer=ROS2_DDS_Middleware | Action_Type=Diagnostic_Code -->
A topic suddenly ceases publishing messages, exhibits extended silent intervals (> 3x expected period), or records 0 messages in the rosbag despite appearing in the active topic list.

## 2. Root Causes
<!-- Metadata: Fault_Type=Message_Dropout | Layer=ROS2_DDS_Middleware | Action_Type=Diagnostic_Code -->
1. **QoS Compatibility Mismatch (Silent Dropout)**:
   - Publisher is configured with `BEST_EFFORT` reliability (typical for high-rate sensor streams like LiDAR / IMU).
   - Rosbag2 recorder is configured with `RELIABLE` reliability.
   - **Consequence**: The DDS middleware rejects the connection. The publisher publishes, but the subscriber receives zero messages WITHOUT any warning or error log!
2. **Node Lifecycle Crash / Exit**:
   - The publisher node threw an unhandled exception (SIGSEGV, segmentation fault, out of memory).
   - In ROS 2 Lifecycle nodes, the node transitioned ungracefully to `Unconfigured` or `Finalized`.
3. **Hardware / Connection Interruption**:
   - USB disconnect, Ethernet socket timeout, or CAN bus error causing sensor driver to hang.
4. **DDS Discovery / Multicast Partitioning**:
   - Firewall blocking DDS discovery packets, or `ROS_DOMAIN_ID` conflict.

## 3. Diagnostic Tool Metrics
<!-- Metadata: Fault_Type=Message_Dropout | Layer=ROS2_DDS_Middleware | Action_Type=Diagnostic_Code -->
- `message_count == 0` while topic exists in `metadata.yaml`.
- Max inter-message gap `gap > 5.0` seconds in continuous streams.
- Sudden cutoff where `end_time` of the topic is significantly earlier than bag `duration`.

## 4. Remediation Actions
<!-- Metadata: Fault_Type=Message_Dropout | Layer=ROS2_DDS_Middleware | Action_Type=Recovery_Adaptation -->
- For QoS mismatch: Supply `--qos-profile-overrides-path qos.yaml` to `ros2 bag record` setting reliability to `best_effort`.
- For node crash: Inspect `ros2 doctor`, node logs, and system `dmesg` for crash dumps.
- Check executor thread health: Verify node isn't blocked on a synchronous service call.
