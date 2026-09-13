#!/usr/bin/env bash
# Tra 1 alias git quen thuoc ra lenh git day du tuong ung.
set -euo pipefail

expand_alias() {
  local alias_name="$1"

  case "$alias_name" in
    st) echo "status" ;;
    co) echo "checkout" ;;
    ci) echo "commit" ;;
    br) echo "branch" ;;
    lg) echo "log --oneline --graph --all" ;;
    *)  return 1 ;;
  esac
}

selfcheck() {
  local result

  result="$(expand_alias st)"
  [ "$result" = "status" ] || { echo "FAIL: st sai ($result)"; exit 1; }

  result="$(expand_alias co)"
  [ "$result" = "checkout" ] || { echo "FAIL: co sai ($result)"; exit 1; }

  result="$(expand_alias lg)"
  [ "$result" = "log --oneline --graph --all" ] || { echo "FAIL: lg sai ($result)"; exit 1; }

  expand_alias xyz >/dev/null 2>&1 \
    && { echo "FAIL: alias khong ton tai van tra ve lenh"; exit 1; }

  echo "OK"
}

if [ "$#" -eq 0 ]; then
  selfcheck
else
  if result="$(expand_alias "$1")"; then
    echo "git $1  ->  git $result"
  else
    echo "Khong tim thay alias: \"$1\""
    exit 1
  fi
fi
