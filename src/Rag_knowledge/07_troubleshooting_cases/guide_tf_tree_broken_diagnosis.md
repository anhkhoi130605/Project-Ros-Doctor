---
source: "ROS 2 Diagnostic Playbook"
title: "Expert Diagnostic Guide: ROS 2 TF2 Tree Inconsistency"
primary_fault_type: "TF_Inconsistency"
primary_layer: "ROS2_DDS_Middleware"
primary_action_type: "Recovery_Adaptation"
---

# Expert Diagnostic Guide: ROS 2 TF2 Tree Inconsistency

## 1. Definition
<!-- Metadata: Fault_Type=TF_Inconsistency | Layer=ROS2_DDS_Middleware | Action_Type=Diagnostic_Code -->
The transform tree contains disconnected sub-trees, missing links between reference frames (e.g. `odom` -> `base_link` or `base_link` -> `sensor`), cyclic parent-child loops, or transform lookup timeouts due to timestamp extrapolation.

## 2. Root Causes
<!-- Metadata: Fault_Type=TF_Inconsistency | Layer=ROS2_DDS_Middleware | Action_Type=Diagnostic_Code -->
1. **Missing or Crashed Transform Publisher**:
   - `robot_state_publisher` or `robot_localization` node crashed, severing the link between `odom` and `base_link`.
   - Sensor URDF not loaded, leaving `sensor_frame` floating without a parent.
2. **TF2 Extrapolation Error (Time Travel)**:
   - Sensor data has timestamp $T_{sensor}$, but TF buffer only contains transforms up to $T_{tf} < T_{sensor}$ (extrapolation into the future).
   - Cause: Transform publisher has high latency or is publishing at too low a frequency (< 20Hz).
3. **Multiple Frame Authorities (Branching / Cyclic Tree)**:
   - Two different nodes publishing conflicting transforms for the same parent-child relationship (e.g., both AMCL and SLAM publishing `map` -> `odom`).
4. **Publishing Static Transforms to Dynamic `/tf`**:
   - Publishing sensor mounting transforms to `/tf` instead of `/tf_static` causes the transform to drop out if the message isn't published continuously.

## 3. Diagnostic Tool Metrics
<!-- Metadata: Fault_Type=TF_Inconsistency | Layer=ROS2_DDS_Middleware | Action_Type=Diagnostic_Code -->
- Multiple disconnected root frames (forest instead of single tree).
- Missing transform chain from target sensor frame to `base_link`.
- Transform lookup error: `Lookup would require extrapolation into the past/future`.

## 4. Remediation Actions
<!-- Metadata: Fault_Type=TF_Inconsistency | Layer=ROS2_DDS_Middleware | Action_Type=Recovery_Adaptation -->
- Static frames (sensors fixed to robot body) MUST be published using `static_transform_publisher` to `/tf_static`.
- Increase TF broadcast rate for dynamic joints (minimum 50Hz for mobile robots).
- Inspect frame tree using `ros2 run tf2_tools view_frames` or `rqt_tf_tree`.
- Validate standard REP 105 frame hierarchy: `map` -> `odom` -> `base_link` -> `[sensor_link]`.
