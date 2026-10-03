---
source: "ROS 2 TF2 & REP 105"
title: "ROS 2 Interface: `geometry_msgs/msg/TransformStamped`"
primary_fault_type: "TF_Inconsistency"
primary_layer: "State_Estimation_EKF"
primary_action_type: "Specification_Standard"
---

# ROS 2 Interface: `geometry_msgs/msg/TransformStamped`

**Source:** Official ROS 2 Knowledge Base

### Field Definitions & Specification
<!-- Metadata: Fault_Type=TF_Inconsistency | Layer=State_Estimation_EKF | Action_Type=Diagnostic_Code -->

```text
# This expresses a transform from coordinate frame header.frame_id
# to the coordinate frame child_frame_id at the time of header.stamp

# This message is mostly used by the
# <a href=" package.
# See its documentation for more information.

# The child_frame_id is necessary in addition to the frame_id
# in the Header to communicate the full reference for the transform
# in a self contained message.

# The frame id in the header is used as the reference frame of this transform.
std_msgs/Header header

# The frame id of the child frame to which this transform points.
string child_frame_id

# Translation and rotation in 3-dimensions of child_frame_id from header.frame_id.
Transform transform
```
