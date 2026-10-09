using Application.DTOs.Authentication.Register;
using Application.Features.Authentication.Register.Handler;
using Application.Interfaces.Authentication;
using Application.Interfaces.Logging;
using Application.Interfaces.ManageTransaction;
using Domain.Entities.Identity;
using Infrastructure.Persistence;
using Infrastructure.Repository;
using Microsoft.EntityFrameworkCore;
using static Domain.Enums.UserEnum;

/// <summary>
/// Runs the real email/password handler and EF repository graph tracking.
/// Only reads and SaveChanges are simulated; no connection to any database is opened.
/// </summary>
public static class RegistrationEfRegression
{
    public static async Task RunAsync(IPasswordHasher hasher, IJWTTokenGenerator tokens, Action<bool, string> check)
    {
        foreach (var roleName in new[] { RoleEnum.User, RoleEnum.Engineering })
        foreach (var roleExists in new[] { true, false })
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseMySql("Server=127.0.0.1;Database=unused_test;User=unused;Password=unused", ServerVersion.Parse("8.4.8-mysql"))
                .Options;
            await using var db = new AppDbContext(options);
            // Simulates a Role returned by GenericRepository.GetAsync(AsNoTracking).
            var existingRole = new Role { RoleName = roleName };
            var realUsers = new UserRepository(db);
            var realRoles = new GenericRepository<Role>(db);
            var userRepository = FakeProxy.Create<IUserRepository>((method, args) =>
                method.Name == "FindByEmailAsync" ? Task.FromResult<User?>(null)
                    : method.Invoke(realUsers, args));
            var roleRepository = FakeProxy.Create<IGenericRepository<Role>>((method, args) =>
                method.Name == "GetAsync" ? Task.FromResult<Role?>(roleExists ? existingRole : null)
                    : method.Invoke(realRoles, args));
            var savedUsers = new List<User>();
            var saves = 0;
            var label = $"EF {roleName}, role {(roleExists ? "exists" : "missing")}";
            var unit = FakeProxy.Create<IUnitOfWork>((method, _) =>
            {
                if (method.Name == "get_User") return userRepository;
                if (method.Name == "get_Roles") return roleRepository;
                if (method.Name == "Dispose") return null;
                if (method.Name != "SaveChangesAsync") throw new NotSupportedException(method.Name);
                var roleInserts = db.ChangeTracker.Entries<Role>().Count(e => e.State == EntityState.Added);
                var userInserts = db.ChangeTracker.Entries<User>().Where(e => e.State == EntityState.Added).ToArray();
                check(roleInserts == (!roleExists && saves == 0 ? 1 : 0), label + ": no duplicate Role INSERT");
                savedUsers.AddRange(userInserts.Select(e => e.Entity));
                saves++;
                // Simulate the post-save state, without calling db.SaveChanges or querying SQL.
                db.ChangeTracker.AcceptAllChanges();
                return Task.FromResult(1);
            });
            var logger = FakeProxy.Create<IUserActivityLogService>((_, _) => Task.CompletedTask);
            var handler = new RegisterCommandHandler(unit, tokens, hasher, logger);
            var response = await handler.Handle(new RegisterCommand(new RegisterUserRequestDTO
            {
                Email = "ef-regression@example.test", FullName = "EF Regression",
                Password = "Test-only-123456", ConfirmPassword = "Test-only-123456", Role = roleName.ToString()
            }), CancellationToken.None);
            var user = savedUsers.Single();
            check(saves == (roleExists ? 1 : 2) && !string.IsNullOrWhiteSpace(user.RoleId)
                && (!roleExists || user.RoleId == existingRole.Id), label + ": correct User foreign key and save sequence");
            check(user.Status == (roleName == RoleEnum.User ? UserStatusEnum.Active : UserStatusEnum.PendingApproval)
                && response.RequiresApproval == (roleName == RoleEnum.Engineering)
                && string.IsNullOrEmpty(response.AccessToken) == (roleName == RoleEnum.Engineering),
                label + ": activation and JWT rules unchanged");
        }
    }
}
