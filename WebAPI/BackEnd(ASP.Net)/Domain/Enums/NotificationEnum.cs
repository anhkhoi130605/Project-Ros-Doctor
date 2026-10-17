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

    public enum AdminNotificationType
    {
        SystemError,
        UserRegistered,
        AccountBan,
        AccountUnban,
        SystemBroadcast,
        NewChatMessage,
        ReceivedRequest,
        ReceivedMessage,
        Other
    }

    public enum EngineerNotificationType
    {
        SystemError,
        RosbagUploaded,
        AnalysisCompleted,
        DiagnosticAnomalyDetected,
        ReviewRequired,
        AccountApproved,
        NewChatMessage,
        SystemBroadcast,
        Other
    }

    public enum UserNotificationType
    {
        RosbagProcessed,
        ReportReady,
        VehicleAlert,
        AccountApproved,
        AccountBan,
        AccountUnban,
        NewChatMessage,
        SystemBroadcast,
        Other
    }
}

