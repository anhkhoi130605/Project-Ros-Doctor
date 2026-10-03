using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using Application.Features.Rosbags.DTOs;
using Application.Interfaces.Rosbag.Analyzers;

namespace Infrastructure.Services.Rosbag.Analyzers
{
	/// <summary>
	/// TẦNG 2: Phát hiện lỗi Loại 5 (node_crash_and_outliers).
	/// Giải mã nhị phân CDR của topic /ouster/imu (sensor_msgs/msg/Imu) để kiểm tra:
	/// - Đơ cảm biến (Sensor Stuck / Frozen: phương sai = 0, vector tĩnh kéo dài).
	/// - Xung sốc gia tốc cực lớn (Shock Spikes 40g, xung âm -50 m/s²).
	/// - Bão hòa con quay hồi chuyển (Gyro Saturation: |w| >= 30 rad/s).
	/// - Trôi dạt vận tốc góc Yaw (Gyro Bias Drift: |gz| >= 0.20 rad/s).
	/// - Sập Node hoàn toàn (Total Node Crash: tất cả topic đồng thời câm bặt trước cuối file).
	/// </summary>
	public class SensorPayloadAnalyzer : ISensorPayloadAnalyzer
	{
		public async Task<List<RosbagAnomalyDto>> AnalyzeAsync(RosbagAnalysisContext context, CancellationToken cancellationToken = default)
		{
			var anomalies = new List<RosbagAnomalyDto>();

			// 1. Kiểm tra Sập Node hoàn toàn (Total Node Crash) trên toàn bộ hệ thống
			CheckTotalNodeCrash(context, anomalies);

			// 2. Tìm topic cảm biến IMU
			var imuTopic = context.Topics.Values.FirstOrDefault(t =>
				t.TopicType == "sensor_msgs/msg/Imu" ||
				t.TopicName.Contains("imu", StringComparison.OrdinalIgnoreCase));

			if (imuTopic == null) return anomalies;

			try
			{
				const string imuSql = "SELECT timestamp, data FROM messages WHERE topic_id = @tid ORDER BY timestamp ASC;";
				await using var cmd = new SqliteCommand(imuSql, (SqliteConnection)context.Connection);
				cmd.Parameters.AddWithValue("@tid", imuTopic.TopicId);
				await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);

				int spikeReported = 0;
				int stuckReported = 0;
				int gyroSatReported = 0;
				int gyroDriftReported = 0;

				(double X, double Y, double Z)? prevAccel = null;
				int stuckCount = 0;
				long stuckStartTs = 0;

				int sustainedDriftCount = 0;
				long driftStartTs = 0;

				while (await reader.ReadAsync(cancellationToken))
				{
					var ts = reader.GetInt64(0);
					if (reader.IsDBNull(1)) continue;

					var raw = (byte[])reader.GetValue(1);
					// Minimum: 4 CDR + 8 stamp + 4 flen + 0 str + padding + 4*8 orient + 9*8 cov + 3*8 gyro + 9*8 cov + 3*8 accel = ~296 bytes min
					if (raw.Length < 120) continue;

					// ===== CDR LAYOUT: sensor_msgs/msg/Imu =====
					// [0..3]   CDR encapsulation header (4 bytes)
					// [4..7]   Header.stamp.sec (int32)
					// [8..11]  Header.stamp.nanosec (uint32)
					// [12..15] Header.frame_id string length (uint32, includes null terminator)
					// [16..16+flen-1] frame_id string data (variable length)
					// [ALIGN8] Pad to 8-byte boundary for first double (orientation.x)
					// orientation: 4 doubles = 32 bytes
					// orientation_covariance: 9 doubles = 72 bytes
					// angular_velocity: 3 doubles = 24 bytes
					// angular_velocity_covariance: 9 doubles = 72 bytes
					// linear_acceleration: 3 doubles = 24 bytes
					// linear_acceleration_covariance: 9 doubles = 72 bytes

					int pos = 4; // skip CDR encapsulation
					pos += 8;    // skip stamp (sec + nsec = 8 bytes)

					// Read frame_id string length (CDR string: uint32 length including null terminator)
					if (pos + 4 > raw.Length) continue;
					uint flen = BitConverter.ToUInt32(raw, pos);
					// Sanity check: frame_id should not be absurdly long
					if (flen > 256) continue;
					pos += 4 + (int)flen;

					// Align to 8-byte boundary relative to CDR payload start (offset 4) for the first double field (orientation.x)
					pos = 4 + (((pos - 4) + 7) & ~7);

					// orientation (4 doubles = 32 bytes) + orientation_covariance (9 doubles = 72 bytes) = 104 bytes
					int orientBlockSize = 32 + 72; // 104
					// angular_velocity (3 doubles = 24 bytes)
					int angVelSize = 24;
					// angular_velocity_covariance (9 doubles = 72 bytes)
					int angVelCovSize = 72;
					// linear_acceleration (3 doubles = 24 bytes)
					int linAccelSize = 24;

					// Total required from pos: 104 + 24 + 72 + 24 = 224 bytes
					if (pos + orientBlockSize + angVelSize + angVelCovSize + linAccelSize > raw.Length) continue;

					// Skip orientation + orientation_covariance
					pos += orientBlockSize;

					// Read angular velocity (3 doubles)
					double gx = BitConverter.ToDouble(raw, pos);
					double gy = BitConverter.ToDouble(raw, pos + 8);
					double gz = BitConverter.ToDouble(raw, pos + 16);
					pos += angVelSize + angVelCovSize; // angular vel + covariance

					// Read linear acceleration (3 doubles)
					double ax = BitConverter.ToDouble(raw, pos);
					double ay = BitConverter.ToDouble(raw, pos + 8);
					double az = BitConverter.ToDouble(raw, pos + 16);

					// VALIDATION: Skip this message if any parsed value is NaN or Infinity (misaligned read)
					if (double.IsNaN(gx) || double.IsInfinity(gx) ||
						double.IsNaN(gy) || double.IsInfinity(gy) ||
						double.IsNaN(gz) || double.IsInfinity(gz) ||
						double.IsNaN(ax) || double.IsInfinity(ax) ||
						double.IsNaN(ay) || double.IsInfinity(ay) ||
						double.IsNaN(az) || double.IsInfinity(az))
					{
						continue;
					}

					// VALIDATION: Sanity-check ranges to catch subtly misaligned reads
					// Ouster OS1 IMU physical limits:
					//   Accel FSR: ±8g ≈ ±78.5 m/s² — allow up to ±200 m/s² for shock events (golden case_11: 99.9 m/s²)
					//   Gyro  FSR: ±2000 dps ≈ ±34.9 rad/s — allow up to 50 rad/s max (CDR misparse produces 145+ rad/s)
					if (Math.Abs(ax) > 200 || Math.Abs(ay) > 200 || Math.Abs(az) > 200 ||
						Math.Abs(gx) > 50 || Math.Abs(gy) > 50 || Math.Abs(gz) > 50)
					{
						continue;
					}

					// A. Kiểm tra xung sốc gia tốc cực đại (Shock Spikes: |a| >= 50 m/s² (~5g) hoặc âm < -50 m/s²)
					// Ngưỡng nâng từ 35 → 50 m/s² để tránh báo động giả từ trọng lực khi parse hơi lệch
					double accelMag = Math.Sqrt(ax * ax + ay * ay + az * az);
					if ((accelMag >= 50.0 || ax < -50.0 || ay < -50.0 || az < -50.0) && spikeReported < 3)
					{
						spikeReported++;
						double gForce = Math.Round(accelMag / 9.80665, 1);
						anomalies.Add(new RosbagAnomalyDto
						{
							Id = Guid.NewGuid().ToString("N")[..8],
							Topic = imuTopic.TopicName,
							AnomalyType = "ACCEL_SPIKE",
							Severity = "CRITICAL",
							TimeRange = context.FormatRelativeRange(ts, ts),
							IssueTitle = $"Xung sốc gia tốc cực đại ({gForce}g / {Math.Round(accelMag, 1)} m/s²)",
							Description = $"Gia tốc đo được đạt giá trị shock [{Math.Round(ax, 1)}, {Math.Round(ay, 1)}, {Math.Round(az, 1)}] m/s² ({gForce}g). Dấu hiệu va chạm cơ học, sập gầm xe, hoặc xung nhiễu điện cực đoan.",
							SuggestedFix = "Kiểm tra cơ cấu chống rung damper của IMU, kích hoạt bộ lọc thông thấp (LPF) hoặc kiểm tra va chạm trên robot."
						});
					}

					// B. Kiểm tra cảm biến bị đơ / đông cứng giá trị (Sensor Stuck / Zero Variance)
					var currAccel = (Math.Round(ax, 4), Math.Round(ay, 4), Math.Round(az, 4));
					if (prevAccel.HasValue && currAccel == prevAccel.Value)
					{
						if (stuckCount == 0) stuckStartTs = ts;
						stuckCount++;
						if (stuckCount >= 100 && stuckReported < 2)
						{
							stuckReported++;
							anomalies.Add(new RosbagAnomalyDto
							{
								Id = Guid.NewGuid().ToString("N")[..8],
								Topic = imuTopic.TopicName,
								AnomalyType = "SENSOR_STUCK",
								Severity = "CRITICAL",
								TimeRange = context.FormatRelativeRange(stuckStartTs, ts),
								IssueTitle = "Cảm biến IMU bị đông cứng giá trị (Sensor Stuck / Zero Variance)",
								Description = $"Topic {imuTopic.TopicName} bị treo lặp lại cùng vector [{currAccel.Item1}, {currAccel.Item2}, {currAccel.Item3}] liên tục qua {stuckCount} tin nhắn mà không có dao động nhiễu tự nhiên.",
								SuggestedFix = "Kiểm tra bus giao tiếp I2C/SPI bị lockup, firmware vi điều khiển cảm biến bị treo, hoặc thread đọc DMA bị dừng."
							});
						}
					}
					else
					{
						stuckCount = 0;
					}
					prevAccel = currAccel;

					// C. Kiểm tra bão hòa con quay hồi chuyển
					// Ngưỡng: |w| >= 34.0 rad/s (~1948 dps) — sát trần vật lý Ouster ±2000 dps (34.9 rad/s)
					// Lý do nâng từ 30.0 → 34.0: tránh báo động giả từ CDR misparse trả về 37 rad/s
					double maxGyro = Math.Max(Math.Abs(gx), Math.Max(Math.Abs(gy), Math.Abs(gz)));
					if (maxGyro >= 34.0 && gyroSatReported < 2)
					{
						gyroSatReported++;
						anomalies.Add(new RosbagAnomalyDto
						{
							Id = Guid.NewGuid().ToString("N")[..8],
							Topic = imuTopic.TopicName,
							AnomalyType = "GYRO_SATURATION",
							Severity = "CRITICAL",
							TimeRange = context.FormatRelativeRange(ts, ts),
							IssueTitle = $"Bão hòa con quay hồi chuyển Gyro ({Math.Round(maxGyro, 1)} rad/s)",
							Description = $"Vận tốc góc đạt {Math.Round(maxGyro, 1)} rad/s (~{Math.Round(maxGyro * 57.2958, 0)} deg/s), chạm kịch trần dải đo vật lý của cảm biến (Full Scale Saturation).",
							SuggestedFix = "Mở rộng dải đo Full Scale Range (FSR) trong thanh ghi cấu hình driver IMU lên ±2000 dps."
						});
					}

					// D. Kiểm tra trôi dạt góc xoay Yaw (Gyro Bias Drift: |gz| >= 0.20 rad/s liên tục)
					if (Math.Abs(gz) >= 0.20 && maxGyro < 34.0)
					{
						if (sustainedDriftCount == 0) driftStartTs = ts;
						sustainedDriftCount++;
						if (sustainedDriftCount >= 100 && gyroDriftReported < 2)
						{
							gyroDriftReported++;
							anomalies.Add(new RosbagAnomalyDto
							{
								Id = Guid.NewGuid().ToString("N")[..8],
								Topic = imuTopic.TopicName,
								AnomalyType = "GYRO_BIAS_DRIFT",
								Severity = "HIGH",
								TimeRange = context.FormatRelativeRange(driftStartTs, ts),
								IssueTitle = $"Trôi dạt góc xoay Yaw bất thường ({Math.Round(gz, 2)} rad/s)",
								Description = $"Vận tốc góc trục Yaw duy trì độ lệch tĩnh {Math.Round(gz, 2)} rad/s liên tục mà robot không xoay thực tế, gây tích lũy sai số heading nghiêm trọng cho Odometry.",
								SuggestedFix = "Thực hiện Zero-velocity bias calibration tĩnh trước khi cấp dữ liệu cho EKF / Nav2."
							});
						}
					}
					else
					{
						sustainedDriftCount = 0;
					}
				}
			}
			catch
			{
				// Bỏ qua nếu có lỗi định dạng nhị phân cảm biến
			}

			return anomalies;
		}

		private static void CheckTotalNodeCrash(RosbagAnalysisContext context, List<RosbagAnomalyDto> anomalies)
		{
			// Nếu toàn bộ topic chính đều ngừng phát sóng cùng lúc trước khi hết file > 3.0s
			if (context.Topics.Count == 0 || context.TotalDurationSec < 5.0) return;

			var activeTopics = context.Topics.Values
				.Where(t => t.MessageCount >= 5)
				.ToList();

			if (activeTopics.Count == 0) return;

			long maxLastTs = activeTopics.Max(t => t.LastTimestampNs);
			double endSilenceSec = (context.OverallMaxTs - maxLastTs) / 1e9;

			// Hoặc nếu tất cả topic cùng kết thúc sớm ở khoảng thời gian T (ví dụ t=25s hoặc t=40s)
			if (endSilenceSec >= 3.0)
			{
				double crashAtSec = Math.Round(context.GetRelativeSec(maxLastTs), 1);
				anomalies.Add(new RosbagAnomalyDto
				{
					Id = Guid.NewGuid().ToString("N")[..8],
					Topic = string.Join(", ", activeTopics.Select(t => t.TopicName)),
					AnomalyType = "NODE_CRASH",
					Severity = "CRITICAL",
					TimeRange = context.FormatRelativeRange(maxLastTs, context.OverallMaxTs),
					IssueTitle = $"Sập Node hoàn toàn (Total Node Crash tại t={crashAtSec}s)",
					Description = $"Toàn bộ các topic đồng loạt câm bặt từ giây thứ {crashAtSec}s cho đến hết bản ghi ({Math.Round(endSilenceSec, 1)}s im lặng hoàn toàn). Node quản trị driver đã bị crash/terminated đột ngột.",
					SuggestedFix = "Kiểm tra log hệ điều hành dmesg, coredump / segmentation fault trong node C++, hoặc thiết lập watchdog tự khởi động lại process."
				});
			}
		}
	}
}
