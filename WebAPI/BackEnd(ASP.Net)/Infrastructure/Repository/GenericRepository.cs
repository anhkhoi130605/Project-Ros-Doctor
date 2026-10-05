using Microsoft.EntityFrameworkCore;
using Domain.Common;
using Infrastructure.Persistence;
using Application.Interfaces.ManageTransaction;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;

namespace Infrastructure.Repository
{
	public class GenericRepository<T> : IGenericRepository<T> where T : BaseEntity
	{
		protected readonly AppDbContext _context;
		internal DbSet<T> _dbSet;

		public GenericRepository(AppDbContext context)
		{
			_context = context;
			_dbSet = _context.Set<T>();
		}

		public async Task<IEnumerable<T>> GetAllAsync(
			Expression<Func<T, bool>>? filter = null,
			Func<IQueryable<T>, IQueryable<T>>? includes = null,
			CancellationToken cancellationToken = default)
		{
			IQueryable<T> query = _dbSet.AsNoTracking();
			if (filter != null) query = query.Where(filter);
			if (includes != null) query = includes(query);
			return await query.ToListAsync(cancellationToken);
		}

		public async Task<T?> GetAsync(
			Expression<Func<T, bool>> filter,
			Func<IQueryable<T>, IQueryable<T>>? includes = null,
			CancellationToken cancellationToken = default)
		{
			IQueryable<T> query = _dbSet.AsNoTracking().Where(filter);
			if (includes != null) query = includes(query);
			return await query.FirstOrDefaultAsync(cancellationToken);
		}

		public async Task<T?> GetByIdAsync(string id, CancellationToken cancellationToken = default)
		{
			return await _dbSet.FindAsync(new object?[] { id }, cancellationToken);
		}

		public async Task CreateAsync(T entity, CancellationToken cancellationToken = default)
		{
			await _dbSet.AddAsync(entity, cancellationToken);
		}

		public Task UpdateAsync(T entity, CancellationToken cancellationToken = default)
		{
			_dbSet.Attach(entity);
			_context.Entry(entity).State = EntityState.Modified;
			return Task.CompletedTask;
		}

		public Task RemoveAsync(T entity, CancellationToken cancellationToken = default)
		{
			_dbSet.Remove(entity);
			return Task.CompletedTask;
		}

		public async Task<int> CountAsync(
			Expression<Func<T, bool>>? predicate = null,
			CancellationToken cancellationToken = default)
		{
			IQueryable<T> query = _dbSet.AsNoTracking();
			if (predicate != null) query = query.Where(predicate);
			return await query.CountAsync(cancellationToken);
		}

		public async Task<long> SumLongAsync(
			Expression<Func<T, long>> selector,
			Expression<Func<T, bool>>? predicate = null,
			CancellationToken cancellationToken = default)
		{
			IQueryable<T> query = _dbSet.AsNoTracking();
			if (predicate != null) query = query.Where(predicate);
			return await query.SumAsync(selector, cancellationToken);
		}

		public async Task<decimal> SumDecimalAsync(
			Expression<Func<T, decimal>> selector,
			Expression<Func<T, bool>>? predicate = null,
			CancellationToken cancellationToken = default)
		{
			IQueryable<T> query = _dbSet.AsNoTracking();
			if (predicate != null) query = query.Where(predicate);
			return await query.SumAsync(selector, cancellationToken);
		}

		public async Task<double> AverageDoubleAsync(
			Expression<Func<T, double>> selector,
			Expression<Func<T, bool>>? predicate = null,
			double defaultValue = 0,
			CancellationToken cancellationToken = default)
		{
			IQueryable<T> query = _dbSet.AsNoTracking();
			if (predicate != null) query = query.Where(predicate);
			var hasAny = await query.AnyAsync(cancellationToken);
			if (!hasAny) return defaultValue;
			return await query.AverageAsync(selector, cancellationToken);
		}

		public async Task<List<TResult>> SelectAsync<TResult>(
			Expression<Func<T, TResult>> selector,
			Expression<Func<T, bool>>? filter = null,
			Func<IQueryable<T>, IOrderedQueryable<T>>? orderBy = null,
			int? skip = null,
			int? take = null,
			CancellationToken cancellationToken = default)
		{
			IQueryable<T> query = _dbSet.AsNoTracking();
			if (filter != null) query = query.Where(filter);
			if (orderBy != null) query = orderBy(query);
			if (skip.HasValue && skip.Value > 0) query = query.Skip(skip.Value);
			if (take.HasValue && take.Value > 0) query = query.Take(take.Value);
			return await query.Select(selector).ToListAsync(cancellationToken);
		}
	}
}
