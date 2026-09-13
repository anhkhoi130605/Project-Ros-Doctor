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

        // Club
        CreateClub,
        UpdateClub,
        DeleteClub,
        JoinClub,
        LeaveClub,
        ApproveJoinRequest,
        RejectJoinRequest,

        // Event
        CreateEvent,
        UpdateEvent,
        DeleteEvent,
        RegisterEvent,
        CancelEventRegistration,

        // Content / Resource
        UploadFile,
        DeleteFile,
        CreatePost,
        UpdatePost,
        DeletePost,

        // Admin
        BanUser,
        UnbanUser,
        AssignRole,

        Other
    }

   
}
