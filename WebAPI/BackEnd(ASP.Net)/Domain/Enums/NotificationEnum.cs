using System;
using System.Collections.Generic;
using System.Text;

namespace Domain.Enums
{
    public enum NotificationType
    {
        SystemBroadcast,
        ClubActivity,
        EventReminder,
        JoinRequestApproved,
        JoinRequestRejected,
        NewPost,
        MentionInComment,
        AdminAlert,
        Other
    }
}
