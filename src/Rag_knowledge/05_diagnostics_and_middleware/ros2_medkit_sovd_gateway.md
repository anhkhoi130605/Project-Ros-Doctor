---
source: "ros2_medkit (SOVD Standard)"
title: "Diagnostic Gateway for ROS 2 Robots: Structured Fault Codes, Freeze-Frames and Black-Box Bags"
year: 2025
url: "https://selfpatch.github.io/ros2_medkit/"
primary_fault_type: "Hardware_Failure"
primary_layer: "ROS2_DDS_Middleware"
---

# ros2_medkit: Cổng Chẩn Đoán Cấu Trúc SOVD Cho Robot ROS 2

## 1. Kiến Trúc Chẩn Đoán Chuẩn SOVD (Service-Oriented Vehicle Diagnostics)
<!-- Metadata: Fault_Type=Hardware_Failure | Layer=ROS2_DDS_Middleware | Action_Type=Diagnostic_Code -->
- **Cơ chế hoạt động**: Thay vì để các lỗi chìm vào log file hoặc chuỗi `/rosout`, `ros2_medkit` chuyển đổi các sự cố thành mã lỗi có cấu trúc (Diagnostic Trouble Codes - DTC) tra cứu qua REST API chuẩn SOVD.
- **Tính năng Hộp Đen (Black-box Rosbag)**: Tự động chụp lại snapshot trạng thái hệ thống (freeze-frame) và lưu một đoạn rosbag 10 giây trước và sau thời điểm xảy ra sự cố.

## 2. Danh Mục Mã Lỗi Chẩn Đoán Chuẩn (Diagnostic Trouble Codes - DTC)
<!-- Metadata: Fault_Type=Hardware_Failure | Layer=ROS2_DDS_Middleware | Action_Type=Diagnostic_Code -->

| Mã Lỗi (DTC Code) | Ý Nghĩa Kỹ Thuật | Tầng Phát Sinh | Mức Độ |
| :--- | :--- | :--- | :--- |
| `DTC_IMU_COMM_LOSS_0x11` | Mất gói tin cảm biến IMU liên tục $> 2	ext{s}$ | Hardware_Sensor | CRITICAL |
| `DTC_TF_DISCONTINUITY_0x22` | Bước nhảy tọa độ đột biến vượt ngưỡng $2	ext{m}$ | State_Estimation_EKF | CRITICAL |
| `DTC_DDS_QUEUE_OVERFLOW_0x33`| Hàng đợi nhận subscriber bị tràn | ROS2_DDS_Middleware | MAJOR |
| `DTC_CLOCK_DESYNC_0x44` | Độ lệch thời gian giữa các node $> 100	ext{ms}$ | Hardware_Sensor | MAJOR |
| `DTC_QUATERNION_DENORM_0x55` | Quaternion có chuẩn sai khác 1.0 ($|\|q\| - 1| > 10^{-4}$) | State_Estimation_EKF | CRITICAL |

## 3. Truy Vấn & Thao Tác Khắc Phục Qua REST Gateway
<!-- Metadata: Fault_Type=Hardware_Failure | Layer=ROS2_DDS_Middleware | Action_Type=Recovery_Adaptation -->
```bash
# Truy vấn danh sách lỗi đang kích hoạt trên hệ thống
curl -X GET http://localhost:8080/api/v1/faults

# Tải rosbag hộp đen tại thời điểm xảy ra lỗi để phân tích ngoại tuyến
curl -O http://localhost:8080/api/v1/faults/DTC_IMU_COMM_LOSS_0x11/blackbox.bag

# Xóa mã lỗi sau khi đã xử lý xong phần cứng
curl -X POST http://localhost:8080/api/v1/faults/DTC_IMU_COMM_LOSS_0x11/clear
```
