using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Application.Features.Rosbags.DTOs;
using Application.Interfaces.Rosbag;
using MediatR;

namespace Application.Features.Rosbags.Queries
{
	public record GetSampleBagsQuery : IRequest<IReadOnlyList<SampleBagInfoDto>>;

	public class GetSampleBagsQueryHandler : IRequestHandler<GetSampleBagsQuery, IReadOnlyList<SampleBagInfoDto>>
	{
		private readonly IRosbagInspectorService _inspectorService;

		public GetSampleBagsQueryHandler(IRosbagInspectorService inspectorService)
		{
			_inspectorService = inspectorService;
		}

		public async Task<IReadOnlyList<SampleBagInfoDto>> Handle(GetSampleBagsQuery request, CancellationToken cancellationToken)
		{
			return await _inspectorService.GetSampleBagsAsync(cancellationToken);
		}
	}
}
