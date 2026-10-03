---
source: "FusionCore (arXiv 2025 / 2026)"
title: "23-State UKF with Retrodiction Ring-Buffer and Chi-Squared Outlier Gating"
year: 2025
url: "https://github.com/manankharwar/fusioncore"
primary_fault_type: "Value_Outlier"
primary_layer: "State_Estimation_EKF"
---

# FusionCore: Bộ Lọc 23-State UKF & Cổng Lọc Dị Biệt Chi-Squared

## 1. Triệu Chứng Nhận Biết & Mã Lỗi Chẩn Đoán (Diagnostic Codes)
<!-- Metadata: Fault_Type=Value_Outlier | Layer=State_Estimation_EKF | Action_Type=Diagnostic_Code -->
- **Mã lỗi `CHI2_FAILED`**: Khoảng cách Mahalanobis của phép đo mới vượt quá ngưỡng phân phối $\chi^2$ (Chi-squared gating), biểu hiện cảm biến bị đột biến giá trị hoặc va chạm vật lý.
- **Mã lỗi `IMPLAUSIBLE_JUMP`**: Tọa độ vị trí hoặc vận tốc thay đổi vượt quá giới hạn vật lý của robot (vận tốc ngụ ý $> 15 	ext{m/s}$ trên xe mặt đất).
- **Mã lỗi `DELAY_TOO_LARGE`**: Dữ liệu cảm biến tới trễ hơn giới hạn của bộ đệm hồi tố (Retrodiction buffer window, $> 200	ext{ms}$), dẫn đến việc phép đo bị từ chối sáp nhập.
- **Mã lỗi `SIGMA_XY_HIGH`**: Ma trận hiệp phương sai ước lượng vị trí bị phình to do mất nguồn quan trắc chính.

## 2. Cơ Chế Thuật Toán Căn Nguyên (Algorithmic Mechanisms)
<!-- Metadata: Fault_Type=Timestamp_Shift | Layer=State_Estimation_EKF | Action_Type=Prediction_Model -->
1. **Cổng Lọc Dị Biệt Khoảng Cách Mahalanobis (Mahalanobis Outlier Gate)**:
   - Định nghĩa khoảng cách bình phương:
     $$d_M^2 = (z - \hat{z})^T S^{-1} (z - \hat{z})$$
     trong đó $z$ là phép đo, $\hat{z}$ là giá trị dự đoán, $S$ là ma trận hiệp phương sai đổi mới (Innovation covariance).
   - Nếu $d_M^2 > \gamma$ (với $\gamma$ là ngưỡng kiểm định giả thuyết $\chi^2$ tại bậc tự do $k$), phép đo lập tức bị loại bỏ trước khi cập nhật bộ lọc.
2. **Bộ Đệm Vòng Hồi Tố (Retrodiction Ring-Buffer)**:
   - Xử lý các phép đo đến không theo thứ tự thời gian (Out-of-Order / Delayed measurements). Bộ lọc lưu vết trạng thái trong cửa sổ 500ms, tái tua ngược lại thời điểm xảy ra phép đo để cập nhật và tích hợp xuôi tiếp.
3. **Bù Trôi Bias Vận Tốc Góc (Gyro Yaw Rate Bias Tracking)**:
   - Trạng thái 23 chiều tích hợp ước lượng trực tiếp vector bias của con quay hồi chuyển $\mathbf{b}_\omega$, ngăn hiện tượng trôi góc hướng (yaw drift) khi robot đứng yên.

## 3. Quy Trình Khắc Phục & Giám Sát Sức Khỏe Bộ Lọc (Recovery & Monitoring)
<!-- Metadata: Fault_Type=Value_Outlier | Layer=State_Estimation_EKF | Action_Type=Recovery_Adaptation -->
```bash
# Theo dõi lý do loại bỏ phép đo GPS/IMU trực tiếp
ros2 topic echo /fusion/debug/gnss_status

# Giám sát chuẩn số đổi mới và góc không chắc chắn
ros2 topic echo /fusion/debug/filter_health

# Đánh giá tính trung thực của hiệp phương sai trên rosbag (Normalized Innovation Squared)
python3 tools/nis_from_bag.py /path/to/recorded_bag.db3
```
- **Hành động can thiệp**:
  - Nếu xuất hiện `CHI2_FAILED` liên tục: Kiểm tra cáp nối IMU xem có bị nhiễu cảm ứng từ động cơ, bổ sung lõi khử từ Ferrite.
  - Nếu xuất hiện `DELAY_TOO_LARGE`: Bật bộ đệm Retrodiction sâu hơn hoặc đồng bộ thời gian máy chủ qua PTP.
