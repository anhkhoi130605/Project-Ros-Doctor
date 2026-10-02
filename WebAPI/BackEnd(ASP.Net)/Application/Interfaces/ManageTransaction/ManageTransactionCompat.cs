using System;

namespace Application.Interfaces.ManageTrancsaction
{
	[Obsolete("Misspelled interface namespace. Use Application.Interfaces.ManageTransaction instead.")]
	public interface IUnitOfWork : Application.Interfaces.ManageTransaction.IUnitOfWork { }

	[Obsolete("Misspelled interface namespace. Use Application.Interfaces.ManageTransaction instead.")]
	public interface IUserRepository : Application.Interfaces.ManageTransaction.IUserRepository { }

	[Obsolete("Misspelled interface namespace. Use Application.Interfaces.ManageTransaction instead.")]
	public interface IGenericRepository<T> : Application.Interfaces.ManageTransaction.IGenericRepository<T> where T : Domain.Common.BaseEntity { }

	[Obsolete("Misspelled interface namespace. Use Application.Interfaces.ManageTransaction instead.")]
	public interface IPaginationRepository<T> : Application.Interfaces.ManageTransaction.IPaginationRepository<T> where T : class { }

	[Obsolete("Misspelled interface namespace. Use Application.Interfaces.ManageTransaction instead.")]
	public interface IApplicationTransaction : Application.Interfaces.ManageTransaction.IApplicationTransaction { }
}
