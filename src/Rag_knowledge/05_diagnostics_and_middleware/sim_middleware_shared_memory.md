---
source: "SIM Middleware (arXiv 2025)"
title: "SIM: Sensor-in-Memory Transport for Zero-Copy, High-Throughput ROS 2 Autonomous Systems"
year: 2025
url: "https://arxiv.org/html/2510.11448v2"
primary_fault_type: "Frequency_Drop"
primary_layer: "ROS2_DDS_Middleware"
---

# SIM Middleware: Kiến Trúc Bộ Nhớ Chia Sẻ Zero-Copy Chống Nghẽn Gói Tin ROS 2

## 1. Nguyên Nhân Nghẽn Mạng Nội Bộ Trên DDS Truyền Thống
<!-- Metadata: Fault_Type=Frequency_Drop | Layer=ROS2_DDS_Middleware | Action_Type=Diagnostic_Code -->
- Truyền thông DDS mặc định (qua CycloneDDS / FastDDS socket UDP loopback) yêu cầu tuần tự hóa CDR (Serialization) và cấp phát bộ nhớ liên tục (malloc/free).
- Khi truyền dữ liệu tốc độ cao (IMU 200Hz, LiDAR PointCloud 10Hz dung lượng lớn), CPU bị chiếm dụng tới 40% chỉ để sao chép bộ nhớ (Memory copies), dẫn đến hiện tượng nghẽn DDS và rớt tần số.

## 2. Giải Pháp Bộ Nhớ Chia Sẻ (Shared Memory / Loaned Messages)
<!-- Metadata: Fault_Type=Frequency_Drop | Layer=ROS2_DDS_Middleware | Action_Type=Recovery_Adaptation -->
- **Cơ chế Loaned Message (Zero-Copy)**: Publisher mượn trực tiếp vùng nhớ chia sẻ từ Middleware thông qua `borrow_loaned_message()`, ghi dữ liệu cảm biến và chuyển con trỏ cho Subscriber mà không qua sao chép byte.
- **Cấu hình CycloneDDS với Iceoryx**:
  ```xml
  <?xml version="1.0" encoding="UTF-8" ?>
  <CycloneDDS xmlns="https://cdds.io/config">
    <Domain id="any">
      <SharedMemory>
        <Enable>true</Enable>
        <LogLevel>info</LogLevel>
      </SharedMemory>
    </Domain>
  </CycloneDDS>
  ```
