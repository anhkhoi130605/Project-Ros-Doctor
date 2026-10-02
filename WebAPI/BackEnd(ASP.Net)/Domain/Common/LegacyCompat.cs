using System;
using System.Collections.Generic;

namespace Domain.Entities.Config
{
	[Obsolete("Use Domain.Common.BaseEntity instead")]
	public abstract class BaseEntity : Domain.Common.BaseEntity { }

	[Obsolete("Use Domain.Common.PaginationResult<T> instead")]
	public class PaginationResult<T> : Domain.Common.PaginationResult<T>
	{
		public PaginationResult(IEnumerable<T> data, int totalCount, int pageNumber, int pageSize)
			: base(data, totalCount, pageNumber, pageSize) { }
	}
}
