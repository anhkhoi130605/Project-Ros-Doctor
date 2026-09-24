using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Application.Interfaces;
using Application.Interfaces.ManageTrancsaction;

namespace Application.Features.Authentication.Password.Handler
{
	public record ForgotPasswordCommand(ForgotPasswordRequestDTO Dto) : IRequest<ForgotPasswordResponse>;

	public class ForgotPasswordCommandHandler : IRequestHandler<ForgotPasswordCommand, ForgotPasswordResponse>
	{
		private readonly IUnitOfWork _unitOfWork;
		private readonly IEmailService _emailService;
		private readonly IOtpService _otpService;

		public ForgotPasswordCommandHandler(
			IUnitOfWork unitOfWork,
			IEmailService emailService,
			IOtpService otpService)
		{
			_unitOfWork = unitOfWork;
			_emailService = emailService;
			_otpService = otpService;
		}

		public async Task<ForgotPasswordResponse> Handle(ForgotPasswordCommand request, CancellationToken cancellationToken)
		{
			var email = request.Dto.Email.Trim().ToLowerInvariant();

			if (string.IsNullOrWhiteSpace(email))
			{
				return new ForgotPasswordResponse
				{
					Success = false,
					Message = "Email không hợp lệ."
				};
			}

			var user = await _unitOfWork.User.FindByEmailAsync(email);
			// Chống User Enumeration: Nếu không có user, giả vờ thành công nhưng không gửi mail
			if (user == null)
			{
				return new ForgotPasswordResponse
				{
					Success = true,
					Message = "Nếu email hợp lệ và tồn tại trên hệ thống, mã OTP đã được gửi đến hòm thư của bạn.",
					Email = email
				};
			}

			// Sinh mã OTP và lưu vào Redis Cache (IDistributedCache)
			string otpCode = await _otpService.GenerateAndSaveOtpAsync(email);

			// Gửi Email HTML bằng SmtpEmailService ở tầng Infrastructure
			try
			{
				string userName = user.FullName ?? user.Email;
				await _emailService.SendOtpEmailAsync(user.Email, userName, otpCode);
			}
			catch (Exception)
			{
				return new ForgotPasswordResponse
				{
					Success = false,
					Message = "Không thể gửi email OTP vào lúc này. Vui lòng kiểm tra lại cấu hình hoặc thử lại sau.",
					Email = email
				};
			}

			return new ForgotPasswordResponse
			{
				Success = true,
				Message = $"Đã gửi mã OTP về Email ({email}) thành công. Vui lòng kiểm tra hộp thư Hộp thư đến (Inbox) hoặc Thư rác (Spam).",
				Email = email,
			};
		}
	}
}
