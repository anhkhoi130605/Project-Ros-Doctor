using System;
using System.Collections.Generic;
using System.Text;

namespace Application.DTOs.Authentication
{
	public class LoginResponseDTO
	{
		public string AccessToken { get; set; } = default!;
		public string RefreshToken { get; set; } = default!;
		public LoggedinUserDTO User { get; set; } = default!;
        public bool RequiresApproval { get; set; }
	}
}
