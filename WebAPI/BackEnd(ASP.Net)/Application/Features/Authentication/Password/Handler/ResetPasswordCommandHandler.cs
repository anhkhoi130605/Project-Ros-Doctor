using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Application.Interfaces;
using Application.Interfaces.Authentication;
using Application.Interfaces.ManageTrancsaction;

namespace Application.Features.Authentication.Password.Handler
{
	public record ResetPasswordCommand(ResetPasswordRequestDTO Dto) : IRequest<ResetPasswordResponse>;

	public class ResetPasswordCommandHandler : IRequestHandler<ResetPasswordCommand, ResetPasswordResponse>
	{
		private readonly IUnitOfWork _unitOfWork;
		private readonly IPasswordHasher _passwordHasher;
		private readonly IOtpService _otpService;

		public ResetPasswordCommandHandler(
			IUnitOfWork unitOfWork,
			IPasswordHasher passwordHasher,
			IOtpService otpService)
		{
			_unitOfWork = unitOfWork;
			_passwordHasher = passwordHasher;
			_otpService = otpService;
		}

		public async Task<ResetPasswordResponse> Handle(ResetPasswordCommand request, CancellationToken cancellationToken)
		{
			var email = request.Dto.Email.Trim().ToLowerInvariant();

			// 1. Xác thực mã OTP trong Redis Cache
			bool isValidOtp = await _otpService.ValidateOtpAsync(email, request.Dto.OtpCode);
			if (!isValidOtp)
			{
				return new ResetPasswordResponse
				{
					Success = false,
					Message = "Mã OTP không chính xác hoặc đã hết hạn."
				};
			}

			// 2. Tìm người dùng theo email
			var user = await _unitOfWork.User.FindByEmailAsync(email);
			if (user == null)
			{
				return new ResetPasswordResponse
				{
					Success = false,
					Message = "Không tìm thấy tài khoản người dùng."
				};
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
