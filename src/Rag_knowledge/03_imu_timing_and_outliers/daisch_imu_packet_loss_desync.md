---
source: "DAISCH Technical Report"
title: "How to Resolve IMU Data Packet Loss or Timestamp Desynchronization in ROS"
year: 2025
url: "https://daischsensor.com/how-to-resolve-imu-data-packet-loss-or-timestamp-desynchronization-in-ros/"
primary_fault_type: "Message_Dropout"
primary_layer: "Hardware_Sensor"
---

# DAISCH Technical Guide: IMU Packet Loss & Timestamp Desynchronization in ROS

## 1. Triệu Chứng Nhận Biết & Hiện Tượng Vi Mô (Diagnostic Symptoms)
<!-- Metadata: Fault_Type=Message_Dropout | Layer=Hardware_Sensor | Action_Type=Diagnostic_Code -->
- **Hiện tượng ngắt quãng ngẫu nhiên (Random Packet Loss)**: Tần số publish định kỳ (ví dụ 100Hz hoặc 200Hz) bị gián đoạn từng khoảng thời gian ngắn (1s - 5s).
- **Hiện tượng nhảy mốc thời gian (Timestamp Jumps & Desynchronization)**: Độ trễ delta_t giữa Header Stamp và Receive Stamp gia tăng đột biến, xuất hiện bước nhảy thời gian âm (t[i+1] < t[i]) hoặc phương sai chu kỳ (Coefficient of Variation) vượt ngưỡng 0.35.
- **Hệ quả trên SLAM & EKF**: Bộ lọc Kalman mở rộng (EKF) bị phân kỳ ma trận hiệp phương sai (Covariance divergence), quỹ đạo robot bị giật cục hoặc trôi tích lũy.

## 2. Phân Tích Căn Nguyên Gốc (Root Cause Analysis)
<!-- Metadata: Fault_Type=Timestamp_Shift | Layer=ROS2_DDS_Middleware | Action_Type=Diagnostic_Code -->
1. **Bộ đệm DDS và Hàng đợi Socket bị tràn (Buffer Overflow)**:
   - Dưới chính sách `KEEP_LAST` với queue depth nhỏ (ví dụ depth=10), khi CPU bận xử lý tác vụ khác, hàng đợi nhận của ROS subscriber bị tràn, dẫn đến loại bỏ các gói tin IMU mới nhất.
2. **Bộ chia tần và Xung nhịp phần cứng không đồng bộ (Clock Drift & Polling Latency)**:
   - Chip cảm biến sử dụng bộ dao động thạch anh độc lập với xung nhịp máy chủ CPU. Không có đồng bộ xung cứng dẫn đến trôi tuyến tính (Linear clock drift từ 2ms đến 10ms mỗi giây).
   - Bộ chuyển đổi USB-to-UART (như FTDI) mặc định có bộ đếm thời gian trễ polling 16ms (`latency_timer`), gây ra hiện tượng dữ liệu IMU bị dồn thành từng cụm (batching/chunking).
3. **Tiến trình không thời gian thực bị tranh chấp (Non-RT Scheduler Contention)**:
   - Nhân Linux tiêu chuẩn (CFS scheduler) ưu tiên các tiến trình khác khiến callback đọc sensor bị trễ deadline.

## 3. Quy Trình Khắc Phục Kỹ Thuật (Remediation & Recovery Playbook)
<!-- Metadata: Fault_Type=Message_Dropout | Layer=ROS2_DDS_Middleware | Action_Type=Recovery_Adaptation -->
### Bước 1: Cấu hình Tối ưu Hóa Driver & Hệ Thống Linux
```bash
# Giảm độ trễ USB Serial từ 16ms xuống 1ms
setserial /dev/ttyUSB0 low_latency

# Cấp quyền thời gian thực FIFO cho tiến trình đọc IMU
chrt -f -p 90 $(pgrep -f imu_driver_node)

# Kiểm tra tần số xuất bản thực tế
ros2 topic hz /ouster/imu
```

### Bước 2: Cấu hình Chuẩn QoS Policy trong ROS 2
```yaml
# Cấu hình QoS tránh mất gói tin cảm biến
/ouster/imu:
  reliability: reliable              # Thay vì best_effort
  history: keep_last
  depth: 50                          # Mở rộng buffer lên 50 messages
  durability: volatile
  deadline:
    sec: 0
    nsec: 20000000                   # 20ms deadline cho cảm biến 100Hz
```

### Bước 3: Đồng Bộ Xung Cứng (Hardware PPS / PTP Synchronization)
- Đấu dây xung nhịp cứng **PPS (Pulse Per Second)** từ bộ thu GNSS hoặc đồng hồ chủ vào chân Sync IN của IMU.
- Cấu hình daemon `chrony` trên máy tính điều khiển để đồng bộ xung hệ điều hành với sai số dưới 1 microsecond.
