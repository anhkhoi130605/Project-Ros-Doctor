using System;
using System.Collections.Generic;
using System.Text;

namespace Application.DTOs.Authentication.Register
{
	public class RegisterUserRequestDTO
	{
	    public string? FullName { get; set; }
	    public string? Email { get; set; }
        public string? Password { get; set; }

	   // ConfirmPassword is required for matching on registration
	    public string? ConfirmPassword { get; set; }
	}
}
