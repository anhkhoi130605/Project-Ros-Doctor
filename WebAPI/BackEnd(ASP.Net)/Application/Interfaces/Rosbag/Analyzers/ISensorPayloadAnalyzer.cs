using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Application.Features.Rosbags.DTOs;

namespace Application.Interfaces.Rosbag.Analyzers
{
	/// <summary>
	/// TẦNG 2: Giải mã nhị phân CDR của topic cảm biến (sensor_msgs/msg/Imu) để kiểm tra:
	/// Sensor Stuck/Frozen (phương sai bằng 0), Shock Spikes (gia tốc cực đại 40g/50g),
	/// Bão hòa Gyro (>=30 rad/s), Trôi dạt Yaw (Gyro Bias Drift), và Sập Node hoàn toàn (Total Node Crash).
	/// </summary>
	public interface ISensorPayloadAnalyzer
	{
		Task<List<RosbagAnomalyDto>> AnalyzeAsync(RosbagAnalysisContext context, CancellationToken cancellationToken = default);
	}
}
