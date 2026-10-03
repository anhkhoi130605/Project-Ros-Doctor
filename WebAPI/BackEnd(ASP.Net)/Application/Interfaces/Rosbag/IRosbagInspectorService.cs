using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Application.Features.Rosbags.DTOs;

namespace Application.Interfaces.Rosbag
{
	public interface IRosbagInspectorService
	{
		Task<RosbagInspectionReportDto> InspectBagAsync(string bagPath, CancellationToken cancellationToken = default);
		Task<RosbagInspectionReportDto> InspectSampleAsync(string? sampleName = null, CancellationToken cancellationToken = default);
		Task<IReadOnlyList<SampleBagInfoDto>> GetSampleBagsAsync(CancellationToken cancellationToken = default);
		Task<RosbagInspectionReportDto> InspectUploadedFileAsync(Stream fileStream, string fileName, Stream? yamlStream = null, string? yamlFileName = null, CancellationToken cancellationToken = default);
	}
}
