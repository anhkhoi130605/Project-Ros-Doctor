using System;
using System.Collections.Generic;
using System.Text;
using MediatR;
using Application.Features.Admin.ManageUser.ReadDataUser.DTOs;

namespace Application.Features.Admin.ManageUser.ReadDataUser.QueriesAdminReadDataUser
{
	public class GetAdminProfileQuery : IRequest<AdminReadDataUserDTO>
	{
	     public string UserId { get; set; }
		 public GetAdminProfileQuery(string userId) 
		 {
		     UserId = userId;
		 }
	}
}
