# Evaluation Report — CI/CD Benchmark Pipeline

> Báo cáo tự động đánh giá chất lượng AI Diagnostic Agent theo tiêu chí Tier C & Ban Tổ Chức.
> Cập nhật lần cuối: **2026-10-18T21:06:12.501751**

---

## 1. Metrics Tổng Thể (Quality Gates)

| Metric | Target | Actual | Status |
|--------|--------|--------|:------:|
| **Diagnostic Accuracy** | >80.0% | **100.0%** | ✅ |
| **Response Latency (Avg)** | <3.0s | **0.005s** | ✅ |
| **Response Latency (P95)** | <3.0s | **0.006s** | ✅ |
| **Total Test Cases Evaluated** | 100+ | **110** | ✅ |
| **CI/CD Quality Gate** | PASS | **PASSED** | ✅ |

---

## 2. Phân Tích Chi Tiết Theo 6 Miền Lỗi (Fault Domains)

| Fault Domain | Tổng Số Test Cases | Số Ca Đoán Đúng | Độ Chính Xác (%) | Trạng Thái |
|:---|:---:|:---:|:---:|:---:|
| `nominal` | 10 | 10 | 100.0% | ✅ |
| `topic_dropout` | 20 | 20 | 100.0% | ✅ |
| `frequency_drop` | 20 | 20 | 100.0% | ✅ |
| `timestamp_anomaly` | 20 | 20 | 100.0% | ✅ |
| `tf_tree_inconsistency` | 20 | 20 | 100.0% | ✅ |
| `sensor_anomaly` | 20 | 20 | 100.0% | ✅ |

---

## 3. Phân Tích Độ Phủ Theo Nền Tảng (Vehicles & Drones)

| Nền Tảng Thiết Bị | Số Ca Kiểm Thử | Số Ca Đạt | Tỉ Lệ Đạt (%) | Đánh Giá |
|:---|:---:|:---:|:---:|:---:|
| Autonomous Vehicles (AV) | 55 | 55 | 100.0% | ✅ |
| Commercial Drones (UAV) | 55 | 55 | 100.0% | ✅ |

---

## 4. Chi Tiết Kịch Bản Thử Nghiệm Gần Nhất (Sample)

| Case Code | Expected Label | Agent Prediction | Latency | Result |
|:---|:---|:---|:---:|:---:|
| `tier_c_001_av_autoware_robotaxi_scen_00_nominal_clean` | `nominal` | `nominal` | 6.79ms | ✅ |
| `tier_c_002_av_autoware_robotaxi_scen_01_transient_imu_dropout` | `topic_dropout` | `topic_dropout` | 5.45ms | ✅ |
| `tier_c_003_av_autoware_robotaxi_scen_02_permanent_lidar_dropout` | `topic_dropout` | `topic_dropout` | 5.59ms | ✅ |
| `tier_c_004_av_autoware_robotaxi_scen_03_severe_frequency_drop` | `frequency_drop` | `frequency_drop` | 5.45ms | ✅ |
| `tier_c_005_av_autoware_robotaxi_scen_04_burst_packet_loss` | `frequency_drop` | `frequency_drop` | 5.26ms | ✅ |
| `tier_c_006_av_autoware_robotaxi_scen_05_timestamp_inversion` | `timestamp_anomaly` | `timestamp_anomaly` | 5.11ms | ✅ |
| `tier_c_007_av_autoware_robotaxi_scen_06_linear_clock_drift` | `timestamp_anomaly` | `timestamp_anomaly` | 5.48ms | ✅ |
| `tier_c_008_av_autoware_robotaxi_scen_07_tf_frame_jump` | `tf_tree_inconsistency` | `tf_tree_inconsistency` | 5.4ms | ✅ |
| `tier_c_009_av_autoware_robotaxi_scen_08_disconnected_tf_tree` | `tf_tree_inconsistency` | `tf_tree_inconsistency` | 5.25ms | ✅ |
| `tier_c_010_av_autoware_robotaxi_scen_09_accel_shock_spike` | `sensor_anomaly` | `sensor_anomaly` | 5.52ms | ✅ |

---

## 5. Kết Luận & Hành Động Tiếp Theo

- Toàn bộ **110 kịch bản kiểm thử** từ 10 dòng xe tự hành và thiết bị bay thương mại đã hoàn tất đánh giá.
- Pipeline kiểm thử benchmark tự động đã được tích hợp trực tiếp vào quy trình CI/CD nhằm bảo vệ chống hồi quy chất lượng AI Agent.
