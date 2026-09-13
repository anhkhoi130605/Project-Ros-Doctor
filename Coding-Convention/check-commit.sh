#!/bin/bash

# Nếu có file commit-msg truyền từ Git Hook thì đọc từ file đó, ngược lại lấy từ git log (khi chạy CI)
if [ -n "$1" ] && [ -f "$1" ]; then
    COMMIT_MSG=$(head -n 1 "$1")
else
    COMMIT_MSG=$(git log -1 --pretty=%s)
fi

echo "----------------------------------------"
echo "Dang kiem tra commit message: $COMMIT_MSG"
echo "----------------------------------------"

# Bỏ qua kiểm tra nếu là commit Merge tự động
if [[ "$COMMIT_MSG" =~ ^Merge[[:space:]] ]]; then
  echo "✅ Day la merge commit tu dong. Bo qua kiem tra quy chuan."
  exit 0
fi

shopt -s nocasematch
PATTERN="^([0-9]+-)?(feat|fix|hotfix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-zA-Z0-9_\-\/]+\))?: .+"

if [[ $COMMIT_MSG =~ $PATTERN ]]; then
    echo "SUCCESS: Commit message hop le!"
    exit 0
else
    echo "ERROR: Commit message SAI quy chuan Conventional Commits!"
    echo "Dinh dang dung: <type>(scope): <mo ta noi dung> hoac <so>-<type>: <mo ta>"
    echo "Vi du:"
    echo "  feat: add login api"
    echo "  2-hotfix: update Readme and .sh"
    exit 1
fi