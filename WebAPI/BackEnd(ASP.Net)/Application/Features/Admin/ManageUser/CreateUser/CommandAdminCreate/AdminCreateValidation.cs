using FluentValidation;// lưu ý cái này
namespace Application.Features.Admin.ManageUser.CreateUser.CommandAdminCreate
{
	public class AdminCreateValidation : AbstractValidator<AdminCreateDTO>
	{
		public AdminCreateValidation()
		{
			RuleFor(x => x.Email)
			.NotEmpty().WithMessage("Email không được để trống.")
			.EmailAddress().WithMessage("Email không đúng định dạng.")
			.MaximumLength(256).WithMessage("Email không được vượt quá 256 ký tự.");

			RuleFor(x => x.FullName)
				.NotEmpty().WithMessage("Họ và tên không được để trống.")
				.MinimumLength(2).WithMessage("Họ và tên quá ngắn.")
				.MaximumLength(100).WithMessage("Họ và tên quá dài.");

			RuleFor(x => x.PasswordHash)
				.NotEmpty().WithMessage("Mật khẩu không được để trống.")
				.MinimumLength(8).WithMessage("Mật khẩu phải có ít nhất 8 ký tự.")
				.Matches("[A-Z]").WithMessage("Mật khẩu phải chứa ít nhất 1 chữ viết hoa.")
				.Matches("[a-z]").WithMessage("Mật khẩu phải chứa ít nhất 1 chữ viết thường.")
				.Matches("[0-9]").WithMessage("Mật khẩu phải chứa ít nhất 1 chữ số.")
				.Matches("[^a-zA-Z0-9]").WithMessage("Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt.");
			RuleFor(x => x.Role)
				.IsInEnum().WithMessage("Vai trò không hợp lệ.");
		}
	}
}
