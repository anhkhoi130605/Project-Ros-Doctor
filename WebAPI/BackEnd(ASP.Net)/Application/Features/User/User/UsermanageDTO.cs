using System;
using System.Collections.Generic;
using System.Text;
using static Domain.Enums.UserEnum;
//Danh sách quản lý users hiển thị cho Admin
namespace Application.DTOs.User
{
	public class UsermanageDTO
	{
	public string Id { get; set; }
	public string? FullName { get; set; }

	public string? Email { get; set; }

	public string? Role { get; set; }
	}
}


