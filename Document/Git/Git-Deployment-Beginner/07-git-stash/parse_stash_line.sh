#!/usr/bin/env bash
# Tach 1 dong "git stash list" thanh index / branch / message.
# Ho tro ca 2 dang: "On <branch>: <msg>" (co -m) va "WIP on <branch>: <msg>" (mac dinh).
set -euo pipefail

parse_stash_line() {
  local line="$1"

  if [[ "$line" =~ ^stash@\{([0-9]+)\}:\ (WIP\ on|On)\ ([^:]+):\ (.*)$ ]]; then
    echo "${BASH_REMATCH[1]} ${BASH_REMATCH[3]} ${BASH_REMATCH[4]}"
    return 0
  fi

  return 1
}

selfcheck() {
  local result

  result="$(parse_stash_line 'stash@{0}: On feature-login: wip form dang nhap')"
  [ "$result" = "0 feature-login wip form dang nhap" ] \
    || { echo "FAIL: dang On sai ($result)"; exit 1; }

  result="$(parse_stash_line 'stash@{1}: WIP on main: 5d3f2a1 sua gio hang')"
  [ "$result" = "1 main 5d3f2a1 sua gio hang" ] \
    || { echo "FAIL: dang WIP on sai ($result)"; exit 1; }

  parse_stash_line 'khong-phai-dong-stash' >/dev/null 2>&1 \
    && { echo "FAIL: chuoi rac van duoc chap nhan"; exit 1; }

  echo "OK"
}

if [ "$#" -eq 0 ]; then
  selfcheck
else
  if result="$(parse_stash_line "$1")"; then
    echo "$result"
  else
    echo "Khong nhan dang duoc dong stash: \"$1\""
    exit 1
  fi
fi
