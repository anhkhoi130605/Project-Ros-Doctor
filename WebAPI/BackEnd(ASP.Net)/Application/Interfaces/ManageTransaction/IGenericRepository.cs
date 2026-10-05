using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;
using Domain.Common;

namespace Application.Interfaces.ManageTransaction
{
	public interface IGenericRepository<T> where T : BaseEntity
	{
		Task<IEnumerable<T>> GetAllAsync(Expression<Func<T, bool>>? filter = null, Func<IQueryable<T>, IQueryable<T>>? includes = null, CancellationToken cancellationToken = default);
		Task<T?> GetAsync(Expression<Func<T, bool>> filter, Func<IQueryable<T>, IQueryable<T>>? includes = null, CancellationToken cancellationToken = default);
		Task<T?> GetByIdAsync(string id, CancellationToken cancellationToken = default);
		Task CreateAsync(T entity, CancellationToken cancellationToken = default);
		Task UpdateAsync(T entity, CancellationToken cancellationToken = default);
		Task RemoveAsync(T entity, CancellationToken cancellationToken = default);
		Task<int> CountAsync(Expression<Func<T, bool>>? predicate = null, CancellationToken cancellationToken = default);
		Task<long> SumLongAsync(Expression<Func<T, long>> selector, Expression<Func<T, bool>>? predicate = null, CancellationToken cancellationToken = default);
		Task<decimal> SumDecimalAsync(Expression<Func<T, decimal>> selector, Expression<Func<T, bool>>? predicate = null, CancellationToken cancellationToken = default);
		Task<double> AverageDoubleAsync(Expression<Func<T, double>> selector, Expression<Func<T, bool>>? predicate = null, double defaultValue = 0, CancellationToken cancellationToken = default);
		Task<List<TResult>> SelectAsync<TResult>(Expression<Func<T, TResult>> selector, Expression<Func<T, bool>>? filter = null, Func<IQueryable<T>, IOrderedQueryable<T>>? orderBy = null, int? skip = null, int? take = null, CancellationToken cancellationToken = default);
	}
}
