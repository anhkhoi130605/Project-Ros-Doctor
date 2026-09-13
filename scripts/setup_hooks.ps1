# Install git commit-msg and pre-push hooks for local repo validation/logging.
# Run once after cloning: powershell -ExecutionPolicy Bypass -File scripts\setup_hooks.ps1

$ErrorActionPreference = 'Stop'

$HookDir = '.git/hooks'
New-Item -ItemType Directory -Path $HookDir -Force | Out-Null

# commit-msg hook for Conventional Commit checking
$CommitMsgHook = Join-Path $HookDir 'commit-msg'
$CommitMsgBody = @'
#!/usr/bin/env bash
repo_root=$(git rev-parse --show-toplevel)
bash "$repo_root/Coding-Convention/check-commit.sh" "$1"
'@
Set-Content -Path $CommitMsgHook -Value $CommitMsgBody -Encoding UTF8 -NoNewline
Write-Host "[commit-msg] Git commit-msg hook installed."

# pre-push hook for AI log submission
$PrePushHook = Join-Path $HookDir 'pre-push'
$PrePushBody = @'
#!/usr/bin/env bash
# Pre-push: sweep recent Antigravity / Gemini prompts, then submit AI logs.
# Uses the cross-platform Python launcher so it works whether the user
# has python3, python, or only the `py` launcher (Windows).
bash scripts/_pyrun.sh scripts/log_antigravity.py --auto || true
bash scripts/_pyrun.sh scripts/submit_log.py || true
exit 0  # Never block push, even if either step fails
'@
Set-Content -Path $PrePushHook -Value $PrePushBody -Encoding UTF8 -NoNewline
Write-Host "[ai-log] Git pre-push hook installed."

if (-not (Test-Path .ai-log)) { New-Item -ItemType Directory -Path .ai-log | Out-Null }
if (-not (Test-Path .ai-log/.gitkeep)) { New-Item -ItemType File -Path .ai-log/.gitkeep | Out-Null }

Write-Host "[ai-log] Setup complete. Configure AI_LOG_SERVER in your .env file."
