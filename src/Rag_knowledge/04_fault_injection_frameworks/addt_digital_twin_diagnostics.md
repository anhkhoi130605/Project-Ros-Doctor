---
source: "ADDT Framework (arXiv 2025)"
title: "Autonomous Driving Digital Twin: Comprehensive Fault Modeling and Diagnostic Procedures"
year: 2025
url: "https://arxiv.org/html/2504.09461v1"
primary_fault_type: "Timestamp_Shift"
primary_layer: "ROS2_DDS_Middleware"
---

# ADDT Digital Twin: Quy Trình Chẩn Đoán Lỗi Miền Thời Gian & Miền Tính Toán

## 1. Phân Tích Lỗi Miền Thời Gian (Temporal Fault Injections)
<!-- Metadata: Fault_Type=Timestamp_Shift | Layer=ROS2_DDS_Middleware | Action_Type=Diagnostic_Code -->
- **Lỗi trễ gói tin (Transmission Delay Injection)**: Gói tin bị giữ lại trong hàng đợi mạng từ 50ms đến 500ms trước khi đưa lên bus DDS.
- **Lỗi đảo lộn thứ tự (Out-of-Order Message Inversion)**: Nhiều luồng (threads) xuất bản đồng thời không có khóa tuần tự khiến thông điệp t2 đến trước thông điệp t1.
- **Triệu chứng phát hiện**: Điều kiện $t_{recv}[i] < t_{recv}[i-1]$ xuất hiện liên tục trong khoảng thời gian ngắn.

## 2. Phân Tích Lỗi Miền Tính Toán (Compute & Memory Faults)
<!-- Metadata: Fault_Type=Hardware_Failure | Layer=ROS2_DDS_Middleware | Action_Type=Diagnostic_Code -->
- **Bit-flips trong bộ nhớ đệm**: Giá trị tọa độ biến thành `NaN` hoặc cực đại ($> 10^{30}$).
- **CPU Throttling**: Khi chip xử lý quá nhiệt, tần số quét giảm từng bước (stepwise degradation: 100Hz -> 80Hz -> 50Hz).

## 3. Khắc Phục Lỗi Thứ Tự Tin Nhắn Trong ROS 2
<!-- Metadata: Fault_Type=Timestamp_Shift | Layer=ROS2_DDS_Middleware | Action_Type=Recovery_Adaptation -->
- Sử dụng `message_filters::TimeSequencer` để tự động sắp xếp lại các gói tin theo tem thời gian header trước khi chuyển đến callback.
- Thay thế `ReentrantCallbackGroup` bằng `MutuallyExclusiveCallbackGroup` để triệt tiêu race condition.
