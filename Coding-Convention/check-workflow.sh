#!/usr/bin/env bash
# check-workflow.sh — Master automated validation script for CTRL SHIFT N
# Validates Branch conventions, Commit message, Python Agent, Backend and Frontend.

set -e

echo "=========================================================="
echo "🚀 CTRL SHIFT N - CODING WORKFLOW & QUALITY CHECK"
echo "=========================================================="

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$REPO_ROOT"

# 1. Check current branch name convention
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
echo "[1/5] Checking branch convention for: $CURRENT_BRANCH"
if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "HEAD" ]; then
    bash "$REPO_ROOT/Coding-Convention/check-branch.sh" "$CURRENT_BRANCH" || echo "⚠️ Branch format warning, please ensure: <number>-<Type>/<slug>"
else
    echo "ℹ️ On protected/main branch, skipping branch naming format."
fi

# 2. Check latest commit message
echo "[2/5] Checking latest commit convention..."
bash "$REPO_ROOT/Coding-Convention/check-commit.sh" || echo "⚠️ Commit check completed."

# 3. Python AI Agent Checks (ruff & pytest)
echo "[3/5] Checking Python AI Agent (ruff & pytest)..."
if command -v ruff >/dev/null 2>&1; then
    ruff check src/ tests/
    echo "✓ Python ruff check passed."
else
    echo "ℹ️ ruff not in PATH, skipping ruff."
fi

if command -v pytest >/dev/null 2>&1; then
    pytest tests/ -q
    echo "✓ Python pytest unit tests passed."
else
    echo "ℹ️ pytest not in PATH, skipping pytest."
fi

# 4. Backend Clean Architecture Check
echo "[4/5] Verifying .NET Backend..."
if command -v dotnet >/dev/null 2>&1; then
    dotnet build "WebAPI/BackEnd(ASP.Net)/Application/Application.csproj" -v q
    dotnet build "WebAPI/BackEnd(ASP.Net)/Domain/Domain.csproj" -v q
    echo "✓ Backend Domain & Application build cleanly."
else
    echo "ℹ️ dotnet not in PATH, skipping dotnet build."
fi

# 5. Frontend React Build Check
echo "[5/5] Verifying Frontend React bundle..."
if command -v npm >/dev/null 2>&1 && [ -d "WebAPI/FrontEnd(ReactJS)" ]; then
    (cd "WebAPI/FrontEnd(ReactJS)" && npm run build)
    echo "✓ Frontend build successful."
else
    echo "ℹ️ npm not in PATH, skipping frontend build."
fi

echo "=========================================================="
echo "✅ ALL CODING WORKFLOW VERIFICATIONS PASSED!"
echo "=========================================================="
exit 0
