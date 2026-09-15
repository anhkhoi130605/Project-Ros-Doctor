using System.Text.RegularExpressions;
using FluentValidation;
using Application.DTOs.Authentication.Register;

namespace Application.Features.Authentication.Register.Validattion
{
	public class RegisterUserRequestDTOValidator : AbstractValidator<RegisterUserRequestDTO>
	{
		public RegisterUserRequestDTOValidator()
		{
        RuleFor(x => x.Password)
				.NotEmpty().WithMessage("Mật khẩu là bắt buộc.")
				.MinimumLength(6).WithMessage("Mật khẩu phải có ít nhất 6 ký tự.");

		RuleFor(x => x.ConfirmPassword)
				.Equal(x => x.Password).WithMessage("Mật khẩu và xác nhận mật khẩu không khớp.");

			// các rule khác: Email, etc.
		}
	}
}
