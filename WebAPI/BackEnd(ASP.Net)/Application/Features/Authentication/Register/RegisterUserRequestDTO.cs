using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
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
        [Required]
		[StringLength(8, MinimumLength = 8, ErrorMessage = "Mã sinh viên phải có 8 ký tự, ví dụ DE123456.")]
		[RegularExpression("^(DE|DS)\\d{6}$", ErrorMessage = "Mã sinh viên phải có định dạng DExxxxxx hoặc DSxxxxxx.")]
		public string? StudentId { get; set; }
	}
}
