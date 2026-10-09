using System;
using System.Collections.Generic;
using System.Text;
using Application.DTOs.Authentication;
using Application.DTOs.Authentication.Register;

namespace Application.Features.Authentication.Register
{
	public class RegisterResponse
	{
		public string? AccessToken { get; set; }
		public string RefreshToken { get; set; } = default!;
		public RegisterUserRequestDTO User { get; set; } = default!;
        public string UserId { get; set; } = string.Empty;
        public bool RequiresApproval { get; set; }
	}
}
