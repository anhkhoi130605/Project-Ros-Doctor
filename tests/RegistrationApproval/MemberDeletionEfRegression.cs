using Application.Features.Admin.ManageUser.DeleteMember;
using Application.Interfaces.ManageTransaction;
using Domain.Entities.Identity;
using Infrastructure.Persistence;
using Infrastructure.Repository;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;
using static Domain.Enums.UserEnum;

// Real EF change tracking and repository update, isolated reads/save; never connects to SQL.
public static class MemberDeletionEfRegression
{
    public static async Task RunAsync(Action<bool, string> check)
    {
        foreach (var failSave in new[] { false, true })
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseMySql("Server=127.0.0.1;Database=unused_test;User=unused;Password=unused", ServerVersion.Parse("8.4.8-mysql")).Options;
            await using var db = new AppDbContext(options);
            var adminRole = new Role { RoleName = RoleEnum.Admin };
            var userRole = new Role { RoleName = RoleEnum.User };
            var actor = new User { RoleId = adminRole.Id, Status = UserStatusEnum.Active };
            var target = new User { RoleId = userRole.Id, Status = UserStatusEnum.Active };
            var committed = new User { Id = target.Id, RoleId = userRole.Id, Status = UserStatusEnum.Active };
            var rows = new List<User> { actor, target };
            var realUsers = new UserRepository(db);
            var repository = FakeProxy.Create<IUserRepository>((method, arguments) =>
                method.Name == "GetAsync"
                    ? Task.FromResult(rows.FirstOrDefault(((Expression<Func<User, bool>>)arguments![0]!).Compile()))
                    : method.Invoke(realUsers, arguments));
            var roleRepository = FakeRepository.Create<IGenericRepository<Role>, Role>([adminRole, userRole]);
            var saveCalls = 0;
            var unit = FakeProxy.Create<IUnitOfWork>((method, _) =>
            {
                if (method.Name == "get_User") return repository;
                if (method.Name == "get_Roles") return roleRepository;
                if (method.Name == "Dispose") return null;
                if (method.Name != "SaveChangesAsync") throw new NotSupportedException(method.Name);
                saveCalls++;
                check(db.Entry(target).State == EntityState.Modified
                    && !db.ChangeTracker.Entries().Any(e => e.State is EntityState.Added or EntityState.Deleted),
                    $"EF deletion ({(failSave ? "failure" : "success")}): UPDATE only, no hard deletion or duplicate role insertion");
                if (failSave) return Task.FromException<int>(new InvalidOperationException("Simulated save failure"));
                committed.DeletedAt = target.DeletedAt;
                committed.UpdatedBy = target.UpdatedBy;
                committed.Status = target.Status;
                db.ChangeTracker.AcceptAllChanges();
                return Task.FromResult(1);
            });
            var handler = new DeleteMemberCommandHandler(unit);
            try
            {
                var result = await handler.Handle(new DeleteMemberCommand(target.Id, actor.Id), CancellationToken.None);
                check(!failSave && result && saveCalls == 1 && committed.DeletedAt != null && committed.UpdatedBy == actor.Id,
                    "EF successful deletion waits for save and persists account marker");
            }
            catch (InvalidOperationException ex) when (failSave && ex.Message == "Simulated save failure")
            {
                check(saveCalls == 1 && committed.DeletedAt == null && committed.Status == UserStatusEnum.Active,
                    "EF failed save propagates failure, with no committed deletion or success response");
            }
        }
    }
}
