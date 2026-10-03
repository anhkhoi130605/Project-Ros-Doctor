---
source: "IEEE ROS-RVFT 2024"
title: "Runtime Verification and Field Testing for ROS-Based Robotic Systems: 20 Engineering Guidelines"
year: 2024
url: "https://ros-rvft.github.io/"
primary_fault_type: "Timestamp_Shift"
primary_layer: "ROS2_DDS_Middleware"
---

# IEEE ROS-RVFT 2024: 20 Quy Chuẩn Thiết Kế & Kiểm Định Độ Tin Cậy Trong ROS

## 1. Các Quy Chuẩn Về Đơn Điệu Thời Gian (Time Monotonicity & Liveness)
<!-- Metadata: Fault_Type=Timestamp_Shift | Layer=ROS2_DDS_Middleware | Action_Type=Diagnostic_Code -->
- **Quy chuẩn G01 (Monotonicity)**: Thời gian xuất bản phải luôn đơn điệu tăng ($t_{k+1} > t_k$). Bất kỳ thông điệp nào vi phạm điều kiện này phải bị loại bỏ ở lớp Middleware.
- **Quy chuẩn G04 (Heartbeat & Liveness)**: Mỗi driver cảm biến quan trọng phải phát nhịp sinh tồn (Heartbeat). Nếu không có thông điệp trong thời gian $1.5 	imes 	ext{Expected Interval}$, hệ thống phải kích hoạt cờ cảnh báo lỗi im lặng.
- **Quy chuẩn G09 (TF Coordinate Authority)**: Một frame con (`child_frame_id`) chỉ được phép có duy nhất một frame cha (`header.frame_id`) tại mọi thời điểm. Vi phạm nguyên tắc này tạo ra xung đột cây TF và phá hủy định vị robot.

## 2. Kỹ Thuật Cô Lập & Giám Sát Runtime (Runtime Verification Patterns)
<!-- Metadata: Fault_Type=Timestamp_Shift | Layer=ROS2_DDS_Middleware | Action_Type=Recovery_Adaptation -->
- **Giám sát trực tiếp cây tọa độ TF**:
  ```bash
  ros2 run tf2_ros tf2_monitor
  ros2 run tf2_ros tf2_echo odom base_link
  ```
- **Kiểm tra tính đơn điệu của topic**:
  Chạy validator kiểm tra delta_t:
  ```bash
  ros2 topic echo /ouster/imu --field header.stamp
  ```
