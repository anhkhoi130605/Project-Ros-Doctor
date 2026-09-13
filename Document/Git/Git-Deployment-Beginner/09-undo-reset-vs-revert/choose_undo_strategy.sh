#!/usr/bin/env bash
# Chon chien luoc undo phu hop: reset --soft/--mixed/--hard hoac revert.
set -euo pipefail

choose_undo_strategy() {
  local pushed="$1" keep="${2:-}"

  if [ "$pushed" = "yes" ]; then
    echo "revert"
    return 0
  fi

  if [ "$pushed" != "no" ]; then
    return 1
  fi

  case "$keep" in
    staged)   echo "reset --soft" ;;
    unstaged) echo "reset --mixed" ;;
    none)     echo "reset --hard" ;;
    *)        return 1 ;;
  esac
}

selfcheck() {
  local result

  result="$(choose_undo_strategy yes -)"
  [ "$result" = "revert" ] || { echo "FAIL: da push phai luon la revert ($result)"; exit 1; }

  result="$(choose_undo_strategy no staged)"
  [ "$result" = "reset --soft" ] || { echo "FAIL: giu staged sai ($result)"; exit 1; }

  result="$(choose_undo_strategy no unstaged)"
  [ "$result" = "reset --mixed" ] || { echo "FAIL: giu unstaged sai ($result)"; exit 1; }

  result="$(choose_undo_strategy no none)"
  [ "$result" = "reset --hard" ] || { echo "FAIL: bo het sai ($result)"; exit 1; }

  choose_undo_strategy no banana >/dev/null 2>&1 \
    && { echo "FAIL: gia tri keep khong hop le van duoc chap nhan"; exit 1; }

  echo "OK"
}

if [ "$#" -eq 0 ]; then
  selfcheck
else
  if result="$(choose_undo_strategy "$@")"; then
    echo "Nen dung: $result"
  else
    echo "Tham so khong hop le: pushed phai la yes/no, keep phai la staged/unstaged/none khi pushed=no"
    exit 1
  fi
fi
