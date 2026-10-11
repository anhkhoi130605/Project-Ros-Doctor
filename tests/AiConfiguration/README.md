# AI configuration mapping regression test

Run from the repository root:

```powershell
dotnet run --project tests/AiConfiguration/AiConfiguration.csproj
```

Checks that `AiSetting.UserId` maps to the existing `ai_settings.user_id`
column, retains its constraints and relationship, and produces the correct
MySQL SELECT. This test does not connect to or modify a database.
