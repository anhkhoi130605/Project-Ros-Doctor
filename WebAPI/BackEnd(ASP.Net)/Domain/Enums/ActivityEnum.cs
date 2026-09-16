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

        // Admin
        BanUser,
        UnbanUser,
        AssignRole,

        Other
    }

   
}
