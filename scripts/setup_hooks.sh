#!/usr/bin/env bash
# Install git pre-push hook for AI log submission and commit-msg hook
# for Conventional Commit validation, plus block direct push to main.
# Run once after cloning: bash scripts/setup_hooks.sh
set -e

HOOK_DIR=".git/hooks"
mkdir -p "$HOOK_DIR"

# Install commit-msg hook for conventional commit validation
COMMIT_MSG_HOOK="$HOOK_DIR/commit-msg"
cat > "$COMMIT_MSG_HOOK" <<'EOF'
#!/usr/bin/env bash
repo_root=$(git rev-parse --show-toplevel)
bash "$repo_root/Coding-Convention/check-commit.sh" "$1"
EOF
chmod +x "$COMMIT_MSG_HOOK"
echo "[commit-msg] Git commit-msg hook installed."

# Install pre-push hook for AI log submission and direct-main push protection
PRE_PUSH_HOOK="$HOOK_DIR/pre-push"
cat > "$PRE_PUSH_HOOK" <<'EOF'
#!/usr/bin/env bash
repo_root=$(git rev-parse --show-toplevel)

# Block direct push to main before AI logging side effects.
bash "$repo_root/Coding-Convention/check-push.sh" "$@" || exit 1

# AI logging hook continues after branch guard passes.
bash scripts/_pyrun.sh scripts/log_antigravity.py --auto || true
bash scripts/_pyrun.sh scripts/submit_log.py || true
exit 0  # Never block push, even if either step fails
EOF

chmod +x "$PRE_PUSH_HOOK"
chmod +x scripts/_pyrun.sh 2>/dev/null || true
echo "[ai-log] Git pre-push hook installed."

mkdir -p .ai-log
touch .ai-log/.gitkeep

echo "[ai-log] Setup complete. Configure AI_LOG_SERVER in your .env file."
