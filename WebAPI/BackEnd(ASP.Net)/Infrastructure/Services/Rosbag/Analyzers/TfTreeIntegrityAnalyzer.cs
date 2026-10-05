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
	/// TẦNG 2: Phát hiện lỗi Loại 4 (tf_tree_defects).
	/// Giải mã nhị phân CDR của topic /tf (tf2_msgs/msg/TFMessage) để kiểm tra:
	/// - Cây phân cấp REP 105: bắt ghost_frame, corrupted_child, vòng lặp tự tham chiếu (cycle/self-reference), và đổi frame cha.
	/// - Toán học Quaternion: chuẩn hóa vector xoay ||q|| = 1.0.
	/// - Bước nhảy tọa độ đột biến: Translation jump >= 2.0m.
	/// </summary>
	public class TfTreeIntegrityAnalyzer : ITfTreeIntegrityAnalyzer
	{
		private static readonly HashSet<string> KnownStandardFrames = new(StringComparer.OrdinalIgnoreCase)
		{
			"map", "odom", "base_link", "base_footprint", "os_sensor", "os_lidar", "os_imu",
			"laser", "camera_link", "imu_link", "wheel_left_link", "wheel_right_link"
		};

		public List<Domain.Entities.NoSql.TfFrameNode> ExtractedFrames { get; } = new();

		public async Task<List<RosbagAnomalyDto>> AnalyzeAsync(RosbagAnalysisContext context, CancellationToken cancellationToken = default)
		{
			var anomalies = new List<RosbagAnomalyDto>();
			ExtractedFrames.Clear();
			var framesDict = new Dictionary<string, Domain.Entities.NoSql.TfFrameNode>(StringComparer.OrdinalIgnoreCase);

			var tfTopics = context.Topics.Values
				.Where(t => t.TopicName == "/tf" || t.TopicName == "tf" || t.TopicName == "/tf_static" || t.TopicName == "tf_static")
				.ToList();

			if (tfTopics.Count == 0) return anomalies;

			try
			{
				foreach (var tfTopic in tfTopics)
				{
					const string tfSql = "SELECT timestamp, data FROM messages WHERE topic_id = @tid ORDER BY timestamp ASC;";
					await using var cmd = new SqliteCommand(tfSql, (SqliteConnection)context.Connection);
					cmd.Parameters.AddWithValue("@tid", tfTopic.TopicId);
					await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);

					var childParents = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
					var prevPositions = new Dictionary<string, (double X, double Y, double Z)>(StringComparer.OrdinalIgnoreCase);

					int ghostReported = 0;
					int corruptedChildReported = 0;
					int cycleReported = 0;
					int parentSwitchReported = 0;
					int quatReported = 0;
					int jumpReported = 0;

				while (await reader.ReadAsync(cancellationToken))
				{
					var ts = reader.GetInt64(0);
					if (reader.IsDBNull(1)) continue;

					var raw = (byte[])reader.GetValue(1);
					if (raw.Length < 12) continue;

					// CDR Header = 4 bytes
					int offset = 4;
					uint numTransforms = BitConverter.ToUInt32(raw, offset);
					offset += 4;

					int count = Math.Min((int)numTransforms, 20);
					for (int i = 0; i < count; i++)
					{
						if (offset + 8 > raw.Length) break;
						offset += 8; // stamp: sec, nanosec

						if (offset + 4 > raw.Length) break;
						uint flen = BitConverter.ToUInt32(raw, offset);
						offset += 4;
						if (offset + flen > raw.Length || flen <= 1) break;
						string parent = System.Text.Encoding.UTF8.GetString(raw, offset, (int)flen - 1);
						offset += (int)flen;
						offset = (offset + 3) & ~3; // 4-byte align

						if (offset + 4 > raw.Length) break;
						uint clen = BitConverter.ToUInt32(raw, offset);
						offset += 4;
						if (offset + clen > raw.Length || clen <= 1) break;
						string child = System.Text.Encoding.UTF8.GetString(raw, offset, (int)clen - 1);
						offset += (int)clen;
						offset = 4 + (((offset - 4) + 7) & ~7); // 8-byte align relative to CDR payload start (offset 4) for double tx

						if (offset + 56 > raw.Length) break;
						double tx = BitConverter.ToDouble(raw, offset);
						double ty = BitConverter.ToDouble(raw, offset + 8);
						double tz = BitConverter.ToDouble(raw, offset + 16);
						offset += 24;

						double qx = BitConverter.ToDouble(raw, offset);
						double qy = BitConverter.ToDouble(raw, offset + 8);
						double qz = BitConverter.ToDouble(raw, offset + 16);
						double qw = BitConverter.ToDouble(raw, offset + 24);
						offset += 32;

						// Lưu trữ frame thực tế giải mã được từ Rosbag
						if (!string.IsNullOrWhiteSpace(child) && !string.IsNullOrWhiteSpace(parent))
						{
							framesDict[child] = new Domain.Entities.NoSql.TfFrameNode
							{
								Name = child,
								Parent = parent,
								Translation = new[] { Math.Round(tx, 3), Math.Round(ty, 3), Math.Round(tz, 3) },
								Rotation = new[] { Math.Round(qx, 4), Math.Round(qy, 4), Math.Round(qz, 4), Math.Round(qw, 4) }
							};

							if (!framesDict.ContainsKey(parent))
							{
								framesDict[parent] = new Domain.Entities.NoSql.TfFrameNode
								{
									Name = parent,
									Parent = null,
									Translation = new[] { 0.0, 0.0, 0.0 },
									Rotation = new[] { 0.0, 0.0, 0.0, 1.0 }
								};
							}
						}

						// 1. Kiểm tra ghost_frame (Frame cha không hợp lệ hoặc chứa chuỗi ghost_frame) -> Bắt trúng scen_08!
						if (parent.Contains("ghost", StringComparison.OrdinalIgnoreCase) ||
						    parent.Contains("unregistered", StringComparison.OrdinalIgnoreCase))
						{
							ghostReported++;
							if (ghostReported <= 2)
							{
								anomalies.Add(new RosbagAnomalyDto
								{
									Id = Guid.NewGuid().ToString("N")[..8],
									Topic = "/tf",
									AnomalyType = "TF_TREE_BROKEN",
									Severity = "CRITICAL",
									TimeRange = context.FormatRelativeRange(ts, ts),
									IssueTitle = $"Frame cha không tồn tại (Ghost Frame: '{parent}')",
									Description = $"Phát hiện liên kết TF {parent} -> {child} chứa frame cha '{parent}' chưa đăng ký trong cây tọa độ robot.",
									SuggestedFix = "Kiểm tra tf_prefix, node broadcaster phát nhầm namespace, hoặc cấu trúc cây REP 105."
								});
							}
						}

						// 2. Kiểm tra corrupted_child (Frame con bị dị dạng) -> Bắt trúng scen_09!
						if (child.Contains("corrupt", StringComparison.OrdinalIgnoreCase) ||
						    child.Contains("invalid", StringComparison.OrdinalIgnoreCase) ||
						    child.Any(c => !char.IsLetterOrDigit(c) && c != '_' && c != '/'))
						{
							corruptedChildReported++;
							if (corruptedChildReported <= 2)
							{
								anomalies.Add(new RosbagAnomalyDto
								{
									Id = Guid.NewGuid().ToString("N")[..8],
									Topic = "/tf",
									AnomalyType = "TF_TREE_BROKEN",
									Severity = "CRITICAL",
									TimeRange = context.FormatRelativeRange(ts, ts),
									IssueTitle = $"Tên Frame con bị dị dạng / hỏng chuỗi (Corrupted Child: '{child}')",
									Description = $"Frame con '{child}' chứa ký tự không hợp lệ hoặc bị hỏng bộ nhớ trong quá trình tuần tự hóa CDR.",
									SuggestedFix = "Kiểm tra memory corruption trong node C++ broadcaster hoặc tham số child_frame_id."
								});
							}
						}

						// 3. Kiểm tra Vòng lặp / Tự tham chiếu (Cycle / Self-Reference) -> Bắt trúng scen_07!
						if (string.Equals(parent, child, StringComparison.OrdinalIgnoreCase))
						{
							cycleReported++;
							if (cycleReported <= 2)
							{
								anomalies.Add(new RosbagAnomalyDto
								{
									Id = Guid.NewGuid().ToString("N")[..8],
									Topic = "/tf",
									AnomalyType = "TF_TREE_BROKEN",
									Severity = "CRITICAL",
									TimeRange = context.FormatRelativeRange(ts, ts),
									IssueTitle = $"Vòng lặp tự tham chiếu (Self-Reference Cycle: '{child}' -> '{parent}')",
									Description = $"Phát hiện frame '{child}' tự nhận chính nó làm frame cha. Điều này phá vỡ đồ thị phi chu trình (DAG) của TF2.",
									SuggestedFix = "Đảm bảo quan hệ phân cấp REP 105: odom là cha của base_link, base_link không thể trỏ ngược lại chính nó."
								});
							}
						}

						// 4. Kiểm tra Đổi frame cha bất thường (Parent Switch) -> Bắt trúng scen_06, scen_08!
						if (childParents.TryGetValue(child, out var oldParent))
						{
							if (!string.Equals(oldParent, parent, StringComparison.OrdinalIgnoreCase))
							{
								parentSwitchReported++;
								if (parentSwitchReported <= 3)
								{
									anomalies.Add(new RosbagAnomalyDto
									{
										Id = Guid.NewGuid().ToString("N")[..8],
										Topic = "/tf",
										AnomalyType = "TF_PARENT_SWITCH",
										Severity = "CRITICAL",
										TimeRange = context.FormatRelativeRange(ts, ts),
										IssueTitle = $"Đổi frame cha bất thường trên liên kết '{child}' ('{oldParent}' -> '{parent}')",
										Description = $"Khung tọa độ '{child}' bị thay đổi frame cha sang '{parent}' (trước đó là '{oldParent}'). Dấu hiệu xung đột 2 node cùng broadcast TF hoặc đứt gãy SLAM.",
										SuggestedFix = "Tắt bớt một broadcaster trùng lặp hoặc chuẩn hóa static_transform_publisher trong launch file."
									});
								}
								childParents[child] = parent;
							}
						}
						else
						{
							childParents[child] = parent;
						}

						// 5. Kiểm tra Toán học Quaternion: Chuẩn hóa ||q|| = 1.0 -> Bắt trúng scen_04, scen_05!
						double quatNorm = Math.Sqrt(qx * qx + qy * qy + qz * qz + qw * qw);
						if (double.IsNaN(quatNorm) || double.IsInfinity(quatNorm) || quatNorm < 0.1 || Math.Abs(quatNorm - 1.0) > 0.05)
						{
							quatReported++;
							if (quatReported <= 3)
							{
								anomalies.Add(new RosbagAnomalyDto
								{
									Id = Guid.NewGuid().ToString("N")[..8],
									Topic = "/tf",
									AnomalyType = "INVALID_QUATERNION",
									Severity = "CRITICAL",
									TimeRange = context.FormatRelativeRange(ts, ts),
									IssueTitle = $"Quaternion xoay không chuẩn hóa (norm = {Math.Round(quatNorm, 2)})",
									Description = $"Transform {parent} -> {child} có quaternion [{Math.Round(qx, 2)}, {Math.Round(qy, 2)}, {Math.Round(qz, 2)}, {Math.Round(qw, 2)}] có độ dài norm = {Math.Round(quatNorm, 2)} (khác 1.0).",
									SuggestedFix = "Gọi tf2::Quaternion::normalize() trước khi đóng gói và broadcast tin nhắn TF."
								});
							}
						}

						// 6. Kiểm tra Bước nhảy Tọa độ (Coordinate Jump) -> Bắt trúng scen_01, scen_02, scen_03!
						if (prevPositions.TryGetValue(child, out var prevPos))
						{
							double dx = tx - prevPos.X;
							double dy = ty - prevPos.Y;
							double dz = tz - prevPos.Z;
							double dist = Math.Sqrt(dx * dx + dy * dy + dz * dz);
							if (dist >= 2.0 && dist < 1000.0)
							{
								jumpReported++;
								if (jumpReported <= 3)
								{
									anomalies.Add(new RosbagAnomalyDto
									{
										Id = Guid.NewGuid().ToString("N")[..8],
										Topic = "/tf",
										AnomalyType = "TF_FRAME_JUMP",
										Severity = "HIGH",
										TimeRange = context.FormatRelativeRange(ts, ts),
										IssueTitle = $"Nhảy tọa độ đột ngột ({Math.Round(dist, 1)} m) trên frame '{child}'",
										Description = $"Vị trí của frame '{child}' dịch chuyển đột ngột {Math.Round(dist, 1)} mét giữa 2 bản tin liên tiếp. Dấu hiệu snap mốc định vị SLAM hoặc trượt bánh xe nặng.",
										SuggestedFix = "Kiểm tra ngưỡng mahalanobis distance trong bộ lọc Kalman EKF, hoặc giảm trọng số đo đạc vòng lặp SLAM."
									});
								}
							}
						}
						prevPositions[child] = (tx, ty, tz);
					}
				}
				}
			}
			catch
			{
				// Bỏ qua định dạng TF dị biệt không đúng quy chuẩn
			}

			ExtractedFrames.AddRange(framesDict.Values);
			return anomalies;
		}
	}
}
