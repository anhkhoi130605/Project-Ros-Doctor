---
source: "SUNSET Framework (arXiv 2026)"
title: "SUNSET: Self-Adaptation for Robotic Systems Under Sensor Failures"
year: 2026
url: "https://arxiv.org/html/2601.13732v2"
primary_fault_type: "Hardware_Failure"
primary_layer: "ROS2_DDS_Middleware"
---

# SUNSET Framework: Mô Hình Tự Thích Ứng & Phục Hồi Lỗi Cảm Biến Trong ROS 2

## 1. Bộ Mẫu 5 Triệu Chứng Lỗi Điển Hình (Failures F1 - F5)
<!-- Metadata: Fault_Type=Hardware_Failure | Layer=Hardware_Sensor | Action_Type=Diagnostic_Code -->
- **F1 - Complete Signal Loss (Mất tín hiệu toàn phần)**: Cảm biến tắt hoàn toàn, không có thông điệp nào tới subscriber.
- **F2 - Data Degradation / Noise Burst (Suy thoái chất lượng / Nhiễu bùng phát)**: Dữ liệu bị nhiễu hạt, sụt giảm tần số đột ngột hoặc giá trị đo sai lệch lớn.
- **F3 - Sensor Freeze (Đơ cảm biến)**: Giá trị không đổi qua nhiều chu kỳ liên tiếp dù môi trường xung quanh biến đổi.
- **F4 - Temporal Desynchronization (Mất đồng bộ thời gian)**: Độ trễ hàng đợi vượt ngưỡng xử lý tối đa của thuật toán sensor fusion.
- **F5 - Transform Hierarchy Loss (Mất chuỗi liên kết hệ tọa độ TF)**: Khung tọa độ bị ngắt lìa khỏi cây biến đổi chung của robot.

## 2. Bốn Cấp Độ Tự Phục Hồi Thích Ứng (4-Tier Self-Adaptation Engine)
<!-- Metadata: Fault_Type=Hardware_Failure | Layer=ROS2_DDS_Middleware | Action_Type=Recovery_Adaptation -->
1. **Cấp 1 - Lifecycle Restart (Khởi động lại vòng đời node)**:
   - Dùng ROS 2 Managed Lifecycle (`rclcpp_lifecycle`) chuyển trạng thái node:
     `Unconfigured -> Inactive -> Active`.
   - Lệnh thực thi:
     ```bash
     ros2 lifecycle set /sensor_driver_node deactivate
     ros2 lifecycle set /sensor_driver_node activate
     ```
2. **Cấp 2 - Reparameterize (Cập nhật lại tham số động)**:
   - Thay đổi tham số bộ lọc mà không cần tắt tiến trình:
     ```bash
     ros2 param set /ekf_node imu_outlier_threshold 3.5
     ros2 param set /sensor_driver_node publish_rate 50
     ```
3. **Cấp 3 - Remap / Switch Redundant Pipeline (Chuyển kênh dự phòng)**:
   - Chuyển hướng subscriber sang nhận dữ liệu từ cảm biến dự phòng tương đương (ví dụ chuyển từ `/camera/odom` sang `/wheel/odom`).
4. **Cấp 4 - Redeploy / Fail-Safe Degradation (Hạ cấp an toàn)**:
   - Ngắt module tự hành cấp cao, chuyển hệ thống về chế độ phanh khẩn cấp hoặc neo tàu dừng tại chỗ.
