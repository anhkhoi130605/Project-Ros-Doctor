using System;
using System.Collections.Generic;
using System.Text;

namespace Domain.Enums
{
	public class SystemLog
	{
		public enum SystemLogStatusEnum	
		{
			Success = 200,
			BadRequest = 400,
			Unauthorized = 401,
			Forbidden = 403,
			NotFound = 404,
			ServerError = 500
		}
	}
}
