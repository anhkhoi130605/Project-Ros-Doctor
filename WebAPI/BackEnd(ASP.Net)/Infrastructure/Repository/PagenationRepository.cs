using System;
using System.Collections.Generic;
using System.Linq.Dynamic.Core;
using System.Linq.Expressions;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Domain.Common;
using Infrastructure.Persistence;
using Application.Interfaces.ManageTransaction;

namespace Infrastructure.Repository
{
	public class PaginationRepository<T> : IPaginationRepository<T> where T : class
	{
		protected readonly AppDbContext _context;
		internal DbSet<T> _dbSet;

		public PaginationRepository(AppDbContext context)
		{
			_context = context;
			_dbSet = _context.Set<T>();
		}

		public async Task<PaginationResult<T>> GetPaginatedAsync(
			int pageNumber = 1,
			int pageSize = 10,
			Expression<Func<T, bool>>? filter = null,
			Func<IQueryable<T>, IOrderedQueryable<T>>? orderBy = null,
			Func<IQueryable<T>, IQueryable<T>>? includes = null,
			CancellationToken cancellationToken = default)
		{
			// Validation: pageSize capped at 100, pageNumber at minimum 1
			pageNumber = Math.Max(1, pageNumber);
			pageSize = Math.Clamp(pageSize, 1, 100);

			IQueryable<T> query = _dbSet.AsNoTracking();

			if (filter != null)
			{
				query = query.Where(filter);
			}
			if (includes != null)
			{
				query = includes(query);
			}

			var totalCount = await query.CountAsync(cancellationToken);

			if (orderBy != null)
			{
				query = orderBy(query);
			}

			IEnumerable<T> totalItems = await query
				.Skip((pageNumber - 1) * pageSize)
				.Take(pageSize)
				.ToListAsync(cancellationToken);

			return new PaginationResult<T>(totalItems, totalCount, pageNumber, pageSize);
		}
	}
}
