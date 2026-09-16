using System;
using System.Collections.Generic;
using System.Text;
using AutoMapper;
using DomainUser = Domain.Entities.AboutUser.User;
using Application.Features.Admin.ManageUser.ReadDataUser.CommandAdminReadDataUser;
using Application.Features.Admin.ManageUser.CreateUser.CommandAdminCreate;
namespace Application.Features.Admin.ManageUser.ReadDataUser.CommandAdminReadDataUser
{
	public class AdminReadDataProfile : Profile
	{
	   public AdminReadDataProfile() {
			CreateMap<(DomainUser,Profile Profile), AdminReadDataUserDTO>()
			        .ForMember(dest=>dest.Email, opt=>opt.MapFrom(src=>src.Item1.Email))
			        .ForMember(dest=>dest.FullName, opt=>opt.MapFrom(src=>src.Item1.FullName))
			        .ForMember(dest=>dest.Phone, opt=>opt.MapFrom(src=>src.Item1.Phone))
			        .ForMember(dest=>dest.Status, opt=>opt.MapFrom(src=>src.Item1.Status))
			        .ForMember(dest=>dest.Gender, opt=>opt.MapFrom(src=>src.Item1.Gender))
			        .ForMember(dest=>dest.Role, opt=>opt.MapFrom(src=>src.Item1.Role))
			        .ForMember(dest=>dest.Bio, opt=>opt.MapFrom(src=>src.Item1.Bio));
		}
	}
}
