using System;
using System.Collections.Generic;
using System.Text;

namespace Domain.Enums
{
    public enum NotificationType
    {
		SystemError,
		UserRegistered,
		AccountBan,
		AccountUnban,
		SystemBroadcast,
		NewChatMessage,
		Other
    }
}
