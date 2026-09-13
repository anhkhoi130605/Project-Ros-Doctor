using System;
using System.Collections.Generic;
using System.Text;

namespace Application.DTOs.Authentication
{
	public class LoginRequestDTO
	{
		public string Email { get; set; } = default!;
		public string Password { get; set; } = default!;
	}
}
