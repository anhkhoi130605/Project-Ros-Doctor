using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Application.Interfaces.Authentication;
using Application.Interfaces.ManageTrancsaction;

namespace Application.Features.Authentication.Password.Handler
{
	public record ResetPasswordCommand(ResetPasswordRequestDTO Dto) : IRequest<ResetPasswordResponse>;

	public class ResetPasswordCommandHandler : IRequestHandler<ResetPasswordCommand, ResetPasswordResponse>
	{
		private readonly IUnitOfWork _unitOfWork;
		private readonly IPasswordHasher _passwordHasher;

		public ResetPasswordCommandHandler(IUnitOfWork unitOfWork, IPasswordHasher passwordHasher)
		{
			_unitOfWork = unitOfWork;
			_passwordHasher = passwordHasher;
		}

		public async Task<ResetPasswordResponse> Handle(ResetPasswordCommand request, CancellationToken cancellationToken)
		{
			var email = request.Dto.Email.Trim();

			// 1. Xác thực OTP
			bool isValidOtp = OtpStore.ValidateOtp(email, request.Dto.OtpCode);
			if (!isValidOtp)
			{
				throw new Exception("Mã OTP không chính xác hoặc đã hết hạn.");
			}

			// 2. Tìm người dùng theo email
			var user = await _unitOfWork.User.FindByEmailAsync(email);
			if (user == null)
			{
				throw new Exception("Không tìm thấy tài khoản người dùng.");
			}

			// 3. Đổi mật khẩu
			user.PasswordHash = _passwordHasher.HashPassword(request.Dto.NewPassword);
			user.UpdatedAt = DateTime.UtcNow;

			await _unitOfWork.SaveChangesAsync();

			return new ResetPasswordResponse
			{
				Success = true,
				Message = "Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại."
			};
		}
	}
}
