---
source: "ModalAI Technical Forum"
title: "ROS IMU Timing Quality Issues and Chunking on Embedded SoC (Qualcomm RB5)"
year: 2024
url: "https://forum.modalai.com/topic/2591/ros-imu-timing-quality-issues-on-rb5"
primary_fault_type: "Timestamp_Shift"
primary_layer: "Hardware_Sensor"
---

# ModalAI Guide: Khắc Phục Hiện Tượng Dồn Cục (Chunking) & Lệch Giờ IMU Trên Máy Tính Nhúng

## 1. Triệu Chứng Hiện Tượng Dồn Cục (IMU Data Chunking)
<!-- Metadata: Fault_Type=Timestamp_Shift | Layer=Hardware_Sensor | Action_Type=Diagnostic_Code -->
- **Hiện tượng**: Tần số trung bình cả bài test vẫn là 100Hz, nhưng các gói tin không đến đều đặn mỗi 10ms. Thay vào đó, cảm biến im lặng trong 30-50ms, sau đó một cụm 4-5 gói tin cùng ùa đến một lúc.
- **Biểu hiện dữ liệu**: Độ biến thiên chu kỳ tin nhắn (Jitter) cực cao, delta_t giữa các tin nhắn trong cùng cụm chỉ khoảng $0.1	ext{ms} - 0.5	ext{ms}$, sau đó là một khoảng trống $40	ext{ms}$.

## 2. Nguyên Nhân Kỹ Thuật Vi Mô (Hardware & Driver Root Cause)
<!-- Metadata: Fault_Type=Timestamp_Shift | Layer=Hardware_Sensor | Action_Type=Diagnostic_Code -->
1. **DMA Buffer Timeout trên SoC ARM**:
   - Trình điều khiển phần cứng UART/SPI trên SoC (như Qualcomm Snapdragon RB5, Jetson Orin) gom các byte vào bộ đệm Direct Memory Access (DMA) để giảm ngắt CPU (Interrupt throttling). DMA chỉ nhả dữ liệu khi bộ đệm đầy hoặc hết thời gian timeout.
2. **CPU Governor Tiết Kiệm Năng Lượng**:
   - Thống đốc CPU mặc định `powersave` hoặc `ondemand` hạ xung nhịp các core ARM khi tải thấp, khiến việc xử lý ngắt cảm biến bị trễ nhịp.

## 3. Quy Trình Khắc Phục (Hardware & Kernel Tuning)
<!-- Metadata: Fault_Type=Timestamp_Shift | Layer=Hardware_Sensor | Action_Type=Recovery_Adaptation -->
```bash
# Thiết lập CPU sang chế độ Performance tối đa
sudo cpupower frequency-set -g performance

# Khóa CPU core riêng biệt cho tiến trình đọc IMU (Core isolation)
taskset -c 2,3 ros2 run imu_driver imu_node

# Giảm ngưỡng ngắt DMA của cổng SPI/UART trong Device Tree hoặc module params
echo 1 | sudo tee /sys/module/qcom_geni_serial/parameters/low_latency
```
