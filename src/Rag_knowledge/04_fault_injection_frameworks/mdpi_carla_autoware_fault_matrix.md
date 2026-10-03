---
source: "MDPI Informatics 2025"
title: "Simulating the Effects of Sensor Failures on Autonomous Vehicles for Safety Evaluation"
volume: "12(3), Article 94"
year: 2025
url: "https://www.mdpi.com/2227-9709/12/3/94"
primary_fault_type: "Hardware_Failure"
primary_layer: "Hardware_Sensor"
---

# MDPI 2025: Ma Trận Tác Động Sự Cố Cảm Biến Trên Xe Tự Hành (CARLA-Autoware)

## 1. Phân Loại Mô Hình Lỗi Cảm Biến Đa Tầng (Fault Models)
<!-- Metadata: Fault_Type=Hardware_Failure | Layer=Hardware_Sensor | Action_Type=Diagnostic_Code -->
1. **Lỗi Im Lặng Hoàn Toàn (Silent Failure)**:
   - Cảm biến ngắt xuất bản hoàn toàn dữ liệu (Output rate = 0 Hz) do mất nguồn, đứt cáp hoặc node driver bị crash.
2. **Nhiễu Cực Đại / Dị Biệt Giá Trị (Severe Noise & Outlier Spikes)**:
   - Giá trị đo bị cộng thêm thành phần nhiễu Gaussian phương sai lớn hoặc các xung shock cực đại vượt 5 lần giới hạn hoạt động bình thường.
3. **Đơ Cảm Biến (Sensor Freeze / Stuck-at-Zero / Stuck-at-Constant)**:
   - Giá trị đầu ra giữ nguyên một số cố định, phương sai tín hiệu bằng 0 tuyệt đối dù xe đang chuyển động.

## 2. Ma Trận Đánh Giá Tác Động Lỗi Trên Từng Loại Cảm Biến
<!-- Metadata: Fault_Type=Hardware_Failure | Layer=State_Estimation_EKF | Action_Type=Prediction_Model -->

| Loại Cảm Biến | Mô Hình Lỗi Tiêm Vào | Tác Động Hệ Thống | Mức Độ Nghiêm Trọng |
| :--- | :--- | :--- | :--- |
| **IMU Con quay hồi chuyển (Gyro)** | Drift hoặc Nhiễu nặng | Xe đánh lái chệch quỹ đạo, trôi góc hướng, va chạm dải phân cách | **CRITICAL** |
| **IMU Gia tốc kế (Accel)** | Outlier spike hoặc Drift | Nhầm lẫn gia tốc trọng trường, dao động nhẹ ở vận tốc tuyến tính | **MEDIUM** |
| **LiDAR Chùm tia** | Mất gói tin (Dropout) hoặc Mù | Thuật toán NDT/ICP SLAM mất vị trí tức thì, phanh khẩn cấp | **CRITICAL** |
| **GNSS Định vị vệ tinh** | Lệch mốc thời gian / Mất vệ tinh | EKF chuyển sang dead-reckoning dựa vào odometry bánh xe và IMU | **LOW - MEDIUM** |

## 3. Playbook Ứng Phó & Khôi Phục (Recovery Playbook)
<!-- Metadata: Fault_Type=Hardware_Failure | Layer=State_Estimation_EKF | Action_Type=Recovery_Adaptation -->
- **Khi Gyroscope gặp sự cố**: Chuyển ngay trọng số state estimator sang đo đạc từ Dual-antenna GPS Heading hoặc Visual Odometry.
- **Khi LiDAR bị Silent failure**: Kích hoạt cơ chế dừng xe an toàn (Safe Stop / Minimum Risk Maneuver) trên làn khẩn cấp.
