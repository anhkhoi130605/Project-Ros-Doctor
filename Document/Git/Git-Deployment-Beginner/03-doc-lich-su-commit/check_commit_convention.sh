#!/usr/bin/env bash
# Kiem tra 1 commit message co dung dinh dang Conventional Commits rut gon:
# "<type>(scope)?: <mo ta>", type nam trong danh sach cho phep.
set -euo pipefail

VALID_TYPES="feat|fix|docs|chore|refactor|test|style|perf"

is_conventional_commit() {
  local msg="$1"
  [[ "$msg" =~ ^($VALID_TYPES)(\([a-z0-9_-]+\))?:\ .+ ]]
}

selfcheck() {
  is_conventional_commit "feat: them form dang nhap" \
    || { echo "FAIL: feat hop le bi tu choi"; exit 1; }
  is_conventional_commit "fix(cart): sua loi crash khi gio hang rong" \
    || { echo "FAIL: fix co scope bi tu choi"; exit 1; }
  is_conventional_commit "update code" \
    && { echo "FAIL: message khong co type van duoc chap nhan"; exit 1; }
  is_conventional_commit "feat:them form" \
    && { echo "FAIL: thieu dau cach sau dau : van duoc chap nhan"; exit 1; }
  is_conventional_commit "banana: them thu gi do" \
    && { echo "FAIL: type khong hop le van duoc chap nhan"; exit 1; }
  echo "OK"
}

if [ "$#" -eq 0 ]; then
  selfcheck
else
  if is_conventional_commit "$1"; then
    echo "Dung dinh dang: \"$1\""
  else
    echo "Sai dinh dang: \"$1\" -- can dang <type>: <mo ta>"
    exit 1
  fi
fi
