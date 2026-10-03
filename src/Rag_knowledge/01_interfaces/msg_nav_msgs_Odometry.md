---
source: "ROS 2 Core Interfaces"
title: "ROS 2 Interface: `nav_msgs/msg/Odometry`"
primary_fault_type: "General_Architecture"
primary_layer: "ROS2_DDS_Middleware"
primary_action_type: "Specification_Standard"
---

# ROS 2 Interface: `nav_msgs/msg/Odometry`

**Source:** Official ROS 2 Knowledge Base

### Field Definitions & Specification
<!-- Metadata: Fault_Type=General_Architecture | Layer=ROS2_DDS_Middleware | Action_Type=Diagnostic_Code -->

```text
# This represents an estimate of a position and velocity in free space.
# The pose in this message should be specified in the coordinate frame given by header.frame_id
# The twist in this message should be specified in the coordinate frame given by the child_frame_id

# Includes the frame id of the pose parent.
std_msgs/Header header

# Frame id the pose points to. The twist is in this coordinate frame.
string child_frame_id

# Estimated pose that is typically relative to a fixed world frame.
geometry_msgs/PoseWithCovariance pose

# Estimated linear and angular velocity relative to child_frame_id.
geometry_msgs/TwistWithCovariance twist
```
