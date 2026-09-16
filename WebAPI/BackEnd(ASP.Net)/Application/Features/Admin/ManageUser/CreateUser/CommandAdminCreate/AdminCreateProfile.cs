using System;
using System.Collections.Generic;
using System.Text;
using AutoMapper;
using DomainUser = Domain.Entities.AboutUser.User;

namespace Application.Features.Admin.ManageUser.CreateUser.CommandAdminCreate
{
	public class AdminCreateProfile : Profile
	{
		public AdminCreateProfile()
		{
			CreateMap<DomainUser, AdminCreateDTO>();
		}
	}
}