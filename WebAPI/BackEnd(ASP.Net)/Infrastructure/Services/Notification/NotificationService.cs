using Application.Features.SystemModule.Notification;
using Application.Interfaces.ManageTrancsaction;
using Application.Interfaces.Notifications;
using NotificationEntity = Domain.Entities.Config.Notification;

namespace Infrastructure.Services.Notification
{
    public class NotificationService : INotificationService
    {
        private readonly IUnitOfWork _unitOfWork;

        public NotificationService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task SendNotificationAsync(SendNotificationRequest request)
        {
            // Resolve user entity by receiver id and set navigation property
            var user = string.IsNullOrWhiteSpace(request.ReceiverId)
                ? null
                : await _unitOfWork.User.GetByIdAsync(request.ReceiverId);

            var notification = new NotificationEntity
            {
                User = user,
                Title = request.Title,
                Message = request.Message,
                Type = request.Type.ToString(),
                RelatedEntityId = request.RelatedEntityId,
                IsRead = false
            };

            await _unitOfWork.Notifications.CreateAsync(notification);
            await _unitOfWork.SaveChangesAsync();
        }
    }
}
