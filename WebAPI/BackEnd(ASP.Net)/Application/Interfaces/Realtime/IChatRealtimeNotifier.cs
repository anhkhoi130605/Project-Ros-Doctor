using System.Threading.Tasks;

namespace Application.Interfaces.Realtime
{
    /// <summary>
    /// Output port abstraction để đẩy sự kiện tin nhắn thời gian thực qua WebSocket/SignalR
    /// mà không phụ thuộc trực tiếp vào ASP.NET SignalR Hub trong tầng Application.
    /// </summary>
    public interface IChatRealtimeNotifier
    {
        Task SendMessageToRoleAsync(string targetRole, object messagePayload);
        Task SendMessageToUserAsync(string userId, object messagePayload);
    }
}
