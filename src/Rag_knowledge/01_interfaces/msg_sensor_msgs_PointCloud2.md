---
source: "ROS 2 sensor_msgs"
title: "ROS 2 Interface: `sensor_msgs/msg/PointCloud2`"
primary_fault_type: "Message_Dropout"
primary_layer: "Hardware_Sensor"
primary_action_type: "Specification_Standard"
---

# ROS 2 Interface: `sensor_msgs/msg/PointCloud2`

**Source:** Official ROS 2 Knowledge Base

### Field Definitions & Specification
<!-- Metadata: Fault_Type=Message_Dropout | Layer=Hardware_Sensor | Action_Type=Diagnostic_Code -->

```text
# This message holds a collection of N-dimensional points, which may
# contain additional information such as normals, intensity, etc. The
# point data is stored as a binary blob, its layout described by the
# contents of the "fields" array.

# The point cloud data may be organized 2d (image-like) or 1d (unordered).
# Point clouds organized as 2d images may be produced by camera depth sensors
# such as stereo or time-of-flight.

# Time of sensor data acquisition, and the coordinate frame ID (for 3d points).
std_msgs/Header header

# 2D structure of the point cloud. If the cloud is unordered, height is
# 1 and width is the length of the point cloud.
uint32 height
uint32 width

# Describes the channels and their layout in the binary data blob.
PointField fields

bool    is_bigendian # Is this data bigendian?
uint32  point_step   # Length of a point in bytes
uint32  row_step     # Length of a row in bytes
uint8 data         # Actual point data, size is (row_step*height)

bool is_dense        # True if there are no invalid points
```
