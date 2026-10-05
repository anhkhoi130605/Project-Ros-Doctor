using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;
using Domain.Common;

namespace Application.Interfaces.ManageTransaction
{
	public interface IPaginationRepository<T> where T : class
	{
		Task<PaginationResult<T>> GetPaginatedAsync(
			int pageNumber = 1,
			int pageSize = 10,
			Expression<Func<T, bool>>? filter = null,
			Func<IQueryable<T>, IOrderedQueryable<T>>? orderBy = null,
			Func<IQueryable<T>, IQueryable<T>>? includes = null,
			CancellationToken cancellationToken = default);
	}
}
