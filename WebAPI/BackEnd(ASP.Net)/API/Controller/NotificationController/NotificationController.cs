using System.Security.Claims;
using System.Threading.Tasks;
using API.Controller.Common;
using Application.Features.SystemModule.Notification;
using Application.Interfaces.Notifications;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controller.NotificationController
{
    [Route("api/notifications")]
    [ApiController]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public class NotificationController : BaseController
    {
        private readonly INotificationService _notificationService;

        public NotificationController(INotificationService notificationService)
        {
            _notificationService = notificationService;
        }

        [HttpGet]
        public async Task<IActionResult> GetNotifications([FromQuery] int take = 50)
        {
            if (string.IsNullOrEmpty(CurrentUserId)) return Unauthorized();

            var role = User.FindFirst(ClaimTypes.Role)?.Value
                       ?? User.FindFirst("role")?.Value;

            var result = await _notificationService.GetNotificationsForUserAsync(CurrentUserId, role, take);
            return Ok(result);
        }

        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(string id)
        {
            if (string.IsNullOrEmpty(CurrentUserId)) return Unauthorized();
            var success = await _notificationService.MarkAsReadAsync(id, CurrentUserId);
            return Ok(new { success });
        }

        [HttpPut("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            if (string.IsNullOrEmpty(CurrentUserId)) return Unauthorized();
            var success = await _notificationService.MarkAllAsReadAsync(CurrentUserId);
            return Ok(new { success });
        }
    }
}
