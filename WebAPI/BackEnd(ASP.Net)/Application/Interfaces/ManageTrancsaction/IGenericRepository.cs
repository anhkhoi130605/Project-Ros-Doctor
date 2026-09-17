using System;
using System.Collections.Generic;
using System.Linq.Expressions;
using System.Text;
using Domain.Entities.Config;

namespace Application.Interfaces.ManageTrancsaction
{
	public interface IGenericRepository<T> where T : BaseEntity
	{
		Task<IEnumerable<T>> GetAllAsync(Expression<Func<T, bool>>? filter = null, Func<IQueryable<T>, IQueryable<T>>? includes = null);
		Task<T?> GetAsync(Expression<Func<T, bool>> filter, Func<IQueryable<T>, IQueryable<T>>? includes = null);
		Task<T?> GetByIdAsync(string id);
		Task CreateAsync(T entity);
		// Note: For Add-only semantics where caller controls SaveChanges use CreateAsync then call IUnitOfWork.SaveChangesAsync
		Task UpdateAsync(T entity);
		Task RemoveAsync(T entity);
		Task<int> CountAsync(Expression<Func<T, bool>>? predicate = null);
	}
}
