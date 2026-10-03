---
source: "ROS 2 sensor_msgs"
title: "ROS 2 Interface: `sensor_msgs/msg/LaserScan`"
primary_fault_type: "Message_Dropout"
primary_layer: "Hardware_Sensor"
primary_action_type: "Specification_Standard"
---

# ROS 2 Interface: `sensor_msgs/msg/LaserScan`

**Source:** Official ROS 2 Knowledge Base

### Field Definitions & Specification
<!-- Metadata: Fault_Type=Message_Dropout | Layer=Hardware_Sensor | Action_Type=Diagnostic_Code -->

```text
# Single scan from a planar laser range-finder

# If you have another ranging device with different behavior (e.g. a sonar
# array), please find or create a different message, since applications
# will make fairly laser-specific assumptions about this data

std_msgs/Header header # timestamp in the header is the acquisition time of
                             # the first ray in the scan.
                             #
                             # in frame frame_id, angles are measured around
                             # the positive Z axis (counterclockwise, if Z is up)
                             # with zero angle being forward along the x axis

float32 angle_min            # start angle of the scan [rad]
float32 angle_max            # end angle of the scan [rad]
float32 angle_increment      # angular distance between measurements [rad]

float32 time_increment       # time between measurements [seconds] - if your scanner
                             # is moving, this will be used in interpolating position
                             # of 3d points
float32 scan_time            # time between scans [seconds]

float32 range_min            # minimum range value [m]
float32 range_max            # maximum range value [m]

float32 ranges             # range data [m]
                             # (Note: values < range_min or > range_max should be discarded)
float32 intensities        # intensity data [device-specific units].  If your
                             # device does not provide intensities, please leave
                             # the array empty.
```
