using System;
using System.Collections.Generic;
using System.Text;
using AutoMapper;
using Domain.Entities.AboutUser;

namespace Application.Features.Admin.ManageUser.CreateUser.CommandAdminCreate
{
	public class AdminCreateProfile : Profile
	{
		public AdminCreateProfile()
		{
			CreateMap<User, AdminCreateDTO>();
		}
	}
}