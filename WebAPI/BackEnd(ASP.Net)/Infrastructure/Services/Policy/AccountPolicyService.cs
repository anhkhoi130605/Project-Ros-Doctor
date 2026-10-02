using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Application.Interfaces.ManageForRole;
using Domain.Entities.Identity;
using Domain.Enums;
using Infrastructure.Persistence;
using static Domain.Enums.UserEnum;

namespace Infrastructure.Policy.Services
{
	public class AccountPolicyService : IAccountPolicyService
	{
		private readonly AppDbContext _context;
		private readonly ILogger<AccountPolicyService> _logger;

		public AccountPolicyService(AppDbContext context, ILogger<AccountPolicyService> logger)
		{
			_context = context ?? throw new ArgumentNullException(nameof(context));
			_logger = logger ?? throw new ArgumentNullException(nameof(logger));
		}

		public async Task<bool> HasPolicyAsync(string userId, string policyName, CancellationToken cancellationToken = default)
		{
			if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(policyName))
			{
				return false;
			}

			// 1. Kiểm tra chính sách riêng trong bảng AccountPolicy
			var customPolicy = await _context.AccountPolicies
				.AsNoTracking()
				.FirstOrDefaultAsync(p => p.UserId == userId && p.PolicyName == policyName, cancellationToken);

			if (customPolicy != null)
			{
				if (string.Equals(customPolicy.PolicyRule, "deny", StringComparison.OrdinalIgnoreCase))
				{
					return false;
				}

				if (string.Equals(customPolicy.PolicyRule, "allow", StringComparison.OrdinalIgnoreCase) ||
					!string.IsNullOrWhiteSpace(customPolicy.PolicyRule))
				{
					return true;
				}
			}

			// 2. Fallback: Kiểm tra Role của User
			var user = await _context.Users
				.AsNoTracking()
				.Include(u => u.Role)
				.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

			if (user?.Role?.RoleName == null)
			{
				return false;
			}

			var allowedRoles = RolePolicyDefaults.GetAllowedRolesForPolicy(policyName);
			return allowedRoles.Any(r => string.Equals(r, user.Role.RoleName.Value.ToString(), StringComparison.OrdinalIgnoreCase));
		}

		public async Task<IReadOnlyList<string>> GetEffectivePoliciesAsync(string userId, CancellationToken cancellationToken = default)
		{
			if (string.IsNullOrWhiteSpace(userId))
			{
				return Array.Empty<string>();
			}

			var user = await _context.Users
				.AsNoTracking()
				.Include(u => u.Role)
				.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

			var effective = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

			// 1. Thêm các quyền theo Role
			if (user?.Role?.RoleName != null)
			{
				var rolePolicies = RolePolicyDefaults.GetPoliciesForRole(user.Role.RoleName.Value);
				foreach (var p in rolePolicies)
				{
					effective.Add(p);
				}
			}

			// 2. Áp dụng các quyền tùy biến trong AccountPolicy (allow thì thêm, deny thì gỡ bỏ)
			var customPolicies = await _context.AccountPolicies
				.AsNoTracking()
				.Where(p => p.UserId == userId)
				.ToListAsync(cancellationToken);

			foreach (var custom in customPolicies)
			{
				if (string.Equals(custom.PolicyRule, "deny", StringComparison.OrdinalIgnoreCase))
				{
					effective.Remove(custom.PolicyName);
				}
				else if (string.Equals(custom.PolicyRule, "allow", StringComparison.OrdinalIgnoreCase) ||
					!string.IsNullOrWhiteSpace(custom.PolicyRule))
				{
					effective.Add(custom.PolicyName);
				}
			}

			return effective.ToList();
		}

		public async Task AssignDefaultPoliciesAsync(string userId, RoleEnum role, CancellationToken cancellationToken = default)
		{
			if (string.IsNullOrWhiteSpace(userId)) return;

			// Xóa các quyền cũ nếu có
			var existing = await _context.AccountPolicies
				.Where(p => p.UserId == userId)
				.ToListAsync(cancellationToken);

			if (existing.Count > 0)
			{
				_context.AccountPolicies.RemoveRange(existing);
			}

			var defaultPolicies = RolePolicyDefaults.CreateDefaultAccountPolicies(userId, role);
			await _context.AccountPolicies.AddRangeAsync(defaultPolicies, cancellationToken);
			await _context.SaveChangesAsync(cancellationToken);

			_logger.LogInformation("Assigned {Count} default policies for user {UserId} with role {Role}",
				defaultPolicies.Count, userId, role);
		}

		public async Task SetPolicyRuleAsync(string userId, string policyName, string rule, CancellationToken cancellationToken = default)
		{
			if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(policyName)) return;

			var existing = await _context.AccountPolicies
				.FirstOrDefaultAsync(p => p.UserId == userId && p.PolicyName == policyName, cancellationToken);

			if (existing != null)
			{
				existing.PolicyRule = rule;
				existing.UpdatedAt = DateTime.UtcNow;
			}
			else
			{
				var newPolicy = new AccountPolicy
				{
					UserId = userId,
					PolicyName = policyName,
					PolicyRule = rule
				};
				await _context.AccountPolicies.AddAsync(newPolicy, cancellationToken);
			}

			await _context.SaveChangesAsync(cancellationToken);
		}

		public async Task RemovePolicyAsync(string userId, string policyName, CancellationToken cancellationToken = default)
		{
			if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(policyName)) return;

			var existing = await _context.AccountPolicies
				.FirstOrDefaultAsync(p => p.UserId == userId && p.PolicyName == policyName, cancellationToken);

			if (existing != null)
			{
				_context.AccountPolicies.Remove(existing);
				await _context.SaveChangesAsync(cancellationToken);
			}
		}
	}
}
