using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Application.Features.Admin.AiConfig.DTOs;
using Application.Interfaces.ManageTransaction;
using Domain.Entities.Configuration;

namespace Application.Features.Admin.AiConfig.Queries
{
	public record GetAiConfigQuery() : IRequest<AiConfigDto>;

	public class GetAiConfigQueryHandler : IRequestHandler<GetAiConfigQuery, AiConfigDto>
	{
		private readonly IUnitOfWork _unitOfWork;

		public GetAiConfigQueryHandler(IUnitOfWork unitOfWork)
		{
			_unitOfWork = unitOfWork;
		}

		public async Task<AiConfigDto> Handle(GetAiConfigQuery request, CancellationToken cancellationToken)
		{
			var configs = await _unitOfWork.AiSettings.GetAllAsync(null, null, cancellationToken);
			var config = configs.FirstOrDefault();

			if (config == null)
			{
				return new AiConfigDto();
			}

			return new AiConfigDto
			{
				DailyRequests = config.DailyCallLimit,
				TokensPerRun = config.MaxTokensPerCall,
				RequestsPerMinute = config.RateLimitPerMin,
				MonthlyBudget = config.MonthlyBudgetUsd,
				VectorUrl = config.VectorDbUrl,
				Prompt = config.SystemPrompt ?? "Phân tích log ROS2 dựa trên bằng chứng."
			};
		}
	}

	public record GetAiUsageQuery() : IRequest<AiUsageSummaryDto>;

	public class GetAiUsageQueryHandler : IRequestHandler<GetAiUsageQuery, AiUsageSummaryDto>
	{
		private readonly IUnitOfWork _unitOfWork;

		public GetAiUsageQueryHandler(IUnitOfWork unitOfWork)
		{
			_unitOfWork = unitOfWork;
		}

		public async Task<AiUsageSummaryDto> Handle(GetAiUsageQuery request, CancellationToken cancellationToken)
		{
			var logs = (await _unitOfWork.AiUsageLogs.GetAllAsync(null, null, cancellationToken)).ToList();

			if (!logs.Any())
			{
				return new AiUsageSummaryDto
				{
					TotalCalls = 0,
					TotalPromptTokens = 0,
					TotalCompletionTokens = 0,
					TotalTokens = 0,
					TotalCostUsd = 0,
					AverageLatencyMs = 0,
					RecentLogs = new List<AiUsageItemDto>()
				};
			}

			var totalPrompt = logs.Sum(l => l.PromptTokens);
			var totalCompletion = logs.Sum(l => l.CompletionTokens);
			var totalCost = logs.Sum(l => l.CostUsd);
			var avgLatency = logs.Average(l => l.LatencyMs);

			var recent = logs.OrderByDescending(l => l.CreatedAt).Take(20).Select(l => new AiUsageItemDto
			{
				Id = l.Id,
				SessionId = l.SessionId,
				ModelName = l.ModelName,
				PromptTokens = l.PromptTokens,
				CompletionTokens = l.CompletionTokens,
				CostUsd = l.CostUsd,
				LatencyMs = l.LatencyMs,
				Timestamp = l.CreatedAt.ToString("o")
			}).ToList();

			return new AiUsageSummaryDto
			{
				TotalCalls = logs.Count,
				TotalPromptTokens = totalPrompt,
				TotalCompletionTokens = totalCompletion,
				TotalTokens = totalPrompt + totalCompletion,
				TotalCostUsd = totalCost,
				AverageLatencyMs = Math.Round(avgLatency, 2),
				RecentLogs = recent
			};
		}
	}

	public record GetWorkspaceMembersQuery() : IRequest<List<WorkspaceMemberDto>>;

	public class GetWorkspaceMembersQueryHandler : IRequestHandler<GetWorkspaceMembersQuery, List<WorkspaceMemberDto>>
	{
		private readonly IUnitOfWork _unitOfWork;

		public GetWorkspaceMembersQueryHandler(IUnitOfWork unitOfWork)
		{
			_unitOfWork = unitOfWork;
		}

		public async Task<List<WorkspaceMemberDto>> Handle(GetWorkspaceMembersQuery request, CancellationToken cancellationToken)
		{
			var members = (await _unitOfWork.WorkspaceMembers.GetAllAsync(null, null, cancellationToken)).ToList();
			var users = (await _unitOfWork.User.GetAllAsync(null, null, cancellationToken)).ToList();
			var roles = (await _unitOfWork.Roles.GetAllAsync(null, null, cancellationToken)).ToList();
			var workspaces = (await _unitOfWork.Workspaces.GetAllAsync(null, null, cancellationToken)).ToList();

			var userMap = users.ToDictionary(u => u.Id);
			var roleMap = roles.ToDictionary(r => r.Id);
			var wsMap = workspaces.ToDictionary(w => w.Id);

			if (members.Any())
			{
				return members.Select(m =>
				{
					userMap.TryGetValue(m.UserId, out var u);
					roleMap.TryGetValue(m.RoleId, out var r);
					wsMap.TryGetValue(m.WorkspaceId, out var w);

					return new WorkspaceMemberDto
					{
						Id = m.UserId,
						Name = u?.FullName ?? "Unknown",
						Email = u?.Email ?? "",
						Role = r?.RoleName.ToString() ?? "Engineer",
						Workspace = w?.Name ?? "Robotics Lab",
						Active = !(u?.IsBanned ?? false)
					};
				}).ToList();
			}

			// Fallback: return users directly
			return users.Select(u => new WorkspaceMemberDto
			{
				Id = u.Id,
				Name = u.FullName ?? u.Email,
				Email = u.Email,
				Role = u.Role?.RoleName.ToString() ?? "Engineer",
				Workspace = "Robotics Lab",
				Active = !(u.IsBanned ?? false)
			}).ToList();
		}
	}
}

namespace Application.Features.Admin.AiConfig.Commands
{
	public record UpdateAiConfigCommand(AiConfigDto Config, string UserId) : IRequest<AiConfigDto>;

	public class UpdateAiConfigCommandHandler : IRequestHandler<UpdateAiConfigCommand, AiConfigDto>
	{
		private readonly IUnitOfWork _unitOfWork;

		public UpdateAiConfigCommandHandler(IUnitOfWork unitOfWork)
		{
			_unitOfWork = unitOfWork;
		}

		public async Task<AiConfigDto> Handle(UpdateAiConfigCommand command, CancellationToken cancellationToken)
		{
			var configs = await _unitOfWork.AiSettings.GetAllAsync(null, null, cancellationToken);
			var config = configs.FirstOrDefault();

			if (config == null)
			{
				config = new AiSetting
				{
					Id = Guid.NewGuid().ToString(),
					UserId = command.UserId,
					DailyCallLimit = command.Config.DailyRequests,
					MaxTokensPerCall = command.Config.TokensPerRun,
					RateLimitPerMin = command.Config.RequestsPerMinute,
					MonthlyBudgetUsd = command.Config.MonthlyBudget,
					VectorDbUrl = command.Config.VectorUrl,
					SystemPrompt = command.Config.Prompt,
					CreatedAt = DateTime.UtcNow
				};
				await _unitOfWork.AiSettings.CreateAsync(config, cancellationToken);
			}
			else
			{
				config.DailyCallLimit = command.Config.DailyRequests;
				config.MaxTokensPerCall = command.Config.TokensPerRun;
				config.RateLimitPerMin = command.Config.RequestsPerMinute;
				config.MonthlyBudgetUsd = command.Config.MonthlyBudget;
				config.VectorDbUrl = command.Config.VectorUrl;
				config.SystemPrompt = command.Config.Prompt;
				await _unitOfWork.AiSettings.UpdateAsync(config, cancellationToken);
			}

			await _unitOfWork.SaveChangesAsync(cancellationToken);
			return command.Config;
		}
	}
}
