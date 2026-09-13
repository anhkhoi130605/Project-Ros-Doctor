using MediatR;
using Application.DTOs.Authentication;
using System.Security.Claims;

namespace Application.Features.Authentication.Register.Handler;

// Ý nghĩa: Nhận "thẻ căn cước" Google để làm thủ tục tạo tài khoản mới độc lập
public record GoogleRegisterCommand(ClaimsPrincipal Principal) : IRequest<LoginResponseDTO>;