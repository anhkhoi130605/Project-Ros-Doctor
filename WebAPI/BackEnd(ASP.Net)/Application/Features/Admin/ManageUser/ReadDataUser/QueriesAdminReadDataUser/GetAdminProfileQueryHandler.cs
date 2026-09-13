using System;
using System.Collections.Generic;
using System.Text;
// removed AutoMapper dependency - mapping done manually
using MediatR;
using Microsoft.IdentityModel.Tokens;
using Application.Features.Admin.ManageUser.ReadDataUser.CommandAdminReadDataUser;
using Application.Interfaces.ManageForRole.Admin;
using Application.Interfaces.ManageTrancsaction;

namespace Application.Features.Admin.ManageUser.ReadDataUser.QueriesAdminReadDataUser
{
	public class GetAdminProfileQueryHandler : IRequestHandler<GetAdminProfileQuery, AdminReadDataUserDTO>
	{
    private readonly IUnitOfWork _unitOfWork;
	public GetAdminProfileQueryHandler(IUnitOfWork unitOfWork)
	{
		this._unitOfWork = unitOfWork;
	}

		public async Task<AdminReadDataUserDTO> Handle(GetAdminProfileQuery request, CancellationToken cancellationToken)
		{
			var user = await _unitOfWork.User.GetByIdAsync(request.UserId);
			if (user == null)
			{
				return null;
	  		}
            return new AdminReadDataUserDTO
			{
				Email = user.Email,
				FullName = user.FullName,
				Phone = user.Phone,
				Status = user.Status,
				Gender = user.Gender,
				MemberInOrOutClub = user.MemberInOrOutClub,
				Role = user.Role,
				Bio = user.Bio
			};
		}
	}
}
