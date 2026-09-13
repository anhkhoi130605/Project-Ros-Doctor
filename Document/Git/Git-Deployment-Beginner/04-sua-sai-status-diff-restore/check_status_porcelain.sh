#!/usr/bin/env bash
# Doc 2 ky tu dau cua 1 dong "git status --porcelain" va tra ve ten trang thai.
set -euo pipefail

parse_status_code() {
  local line="$1"
  local code="${line:0:2}"

  case "$code" in
    "??") echo "untracked" ;;
    "M ") echo "staged" ;;
    " M") echo "unstaged" ;;
    "MM") echo "staged-va-unstaged" ;;
    "A ") echo "staged-moi" ;;
    "D ") echo "staged-xoa" ;;
    " D") echo "unstaged-xoa" ;;
    *)    echo "khong-xac-dinh" ;;
  esac
}

selfcheck() {
  local result

  result="$(parse_status_code '?? new-file.js')"
  [ "$result" = "untracked" ] || { echo "FAIL: untracked sai ($result)"; exit 1; }

  result="$(parse_status_code 'M  src/app.js')"
  [ "$result" = "staged" ] || { echo "FAIL: staged sai ($result)"; exit 1; }

  result="$(parse_status_code ' M src/app.js')"
  [ "$result" = "unstaged" ] || { echo "FAIL: unstaged sai ($result)"; exit 1; }

  result="$(parse_status_code 'MM src/app.js')"
  [ "$result" = "staged-va-unstaged" ] || { echo "FAIL: staged-va-unstaged sai ($result)"; exit 1; }

  result="$(parse_status_code 'A  src/new.js')"
  [ "$result" = "staged-moi" ] || { echo "FAIL: staged-moi sai ($result)"; exit 1; }

  echo "OK"
}

selfcheck
