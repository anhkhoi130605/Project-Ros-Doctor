namespace Domain.Enums
{
    public enum UserActionType
    {
        // Auth
        Register,
        Login,
        Logout,
        ChangePassword,
        UpdateProfile,

        // Admin & Management
        BanUser,
        UnbanUser,
        AssignRole,
        UpdateAiConfig,
        UpdateSystemSettings,

        // Rosbags
        UploadRosbag,
        DeleteRosbag,
        ViewRosbag,
        PublishRosbag,

        // Analysis & Sessions
        StartAnalysis,
        CancelAnalysis,
        ViewSession,

        // HITL Reviews & Decisions
        SubmitReview,
        ApproveFinding,
        RejectFinding,

        // Reports
        CreateReport,
        PublishReport,
        ExportReport,

        // Agent Chat
        ChatAgent,

        Other,
        CreateRosbag,
        InspectRosbag,
        RequestReviewChanges,
        ViewReview,
        ViewReport,
        ViewDashboard,
        ViewMembers,
        ViewSystemLogs,
        ViewAiConfig,
        ViewAiUsage,
        ViewSystem,
        TriggerSystemError,
        UpdateLocalSettings
    } 
}
