---
source: "Mahalanobis SVDD & Sequential LSTM Swarm (arXiv 2025)"
title: "AI-Driven Anomaly Detection and Predictive Fault Isolation for Robotic Sensor Fusion"
year: 2025
url: "https://arxiv.org/abs/2505.05811v1"
primary_fault_type: "Value_Outlier"
primary_layer: "AI_Perception"
---

# AI Models: Phát Hiện Dị Biệt Bằng Khoảng Cách Mahalanobis SVDD & Chuỗi Thời Gian LSTM

## 1. Mô Hình M-SVDD (Mahalanobis Support Vector Data Description)
<!-- Metadata: Fault_Type=Value_Outlier | Layer=AI_Perception | Action_Type=Prediction_Model -->
- **Ứng dụng**: Phát hiện va chạm vật lý đột ngột (Hull collision) hoặc hư hỏng ổ bi/cơ khí động cơ bằng cách kết hợp chuỗi tín hiệu rung động gia tốc kế và âm thanh.
- **Đặc trưng**: Không cần gán nhãn dữ liệu lỗi trước (Unsupervised). Mô hình học một siêu cầu (hypersphere) bao quanh dữ liệu hoạt động bình thường; mọi điểm dữ liệu nằm ngoài bán kính $R$ được phân loại là dị biệt cơ học (Mechanical Outlier).

## 2. Mô Hình LSTM Dự Đoán Suy Thoái Tiền Đề (Sequential Behavioural Precursors)
<!-- Metadata: Fault_Type=Frequency_Drop | Layer=AI_Perception | Action_Type=Prediction_Model -->
- **Cơ chế**: Dự đoán lỗi hỏng hóc trước khi nó xảy ra hoàn toàn bằng cách theo dõi các tín hiệu tiền đề (Ordered precursors).
- **Ứng dụng trong ROS 2**: Theo dõi xu hướng tăng dần của độ trễ callback và độ biến thiên chu kỳ tin nhắn. Nếu nhận thấy chuỗi tăng đơn điệu trong 10 giây liên tiếp, mô hình phát cảnh báo suy thoái phần cứng trước khi xảy ra sập nguồn (Driver Crash).
