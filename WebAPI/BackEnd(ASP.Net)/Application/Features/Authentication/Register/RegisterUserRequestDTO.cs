using System;
using System.Collections.Generic;
using System.Text;
using Domain.Enums;
using static Domain.Enums.UserEnum;

namespace Application.DTOs.Authentication.Register
{
	public class RegisterUserRequestDTO
	{
	    public string? FullName { get; set; }
	    public string? Email { get; set; }
        public string? Password { get; set; }

	   // ConfirmPassword is required for matching on registration
	    public string? ConfirmPassword { get; set; }

	    public string? Phone { get; set; }
	    public Gender? Gender { get; set; }
	    public DateTime? DateOfBirth { get; set; }
	    public string? Bio { get; set; }
	}
}
