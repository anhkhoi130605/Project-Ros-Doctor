#!/usr/bin/env bash
# So khop 1 duong dan voi 1 pattern kieu .gitignore (ban rut gon: ho tro *, va
# pattern ket thuc bang / nghia la khop ca thu muc con ben trong).
set -euo pipefail

is_ignored() {
  local pattern="$1" path="$2"

  if [[ "$pattern" == */ ]]; then
    # $dir de KHONG trong nhay kep la co y: can bash coi * la ky tu thay the, de
    # pattern kieu `build*/` bat duoc `build-prod/`. Boc nhay kep vao thi nhanh nay
    # mat glob trong khi nhanh duoi van con -> hai kieu pattern hanh xu khac nhau.
    local dir="${pattern%/}"
    [[ "$path" == $dir || "$path" == $dir/* ]]
  else
    # [[ ]] tu no da la dung/sai, khong can `&& return 0; return 1` cho dai them.
    [[ "$path" == $pattern ]]
  fi
}

any_ignored() {
  local path="$1"; shift
  local pattern
  for pattern in "$@"; do
    is_ignored "$pattern" "$path" && return 0
  done
  return 1
}

GITIGNORE=("node_modules/" ".env" "*.log" "dist/")

selfcheck() {
  any_ignored "node_modules/express/index.js" "${GITIGNORE[@]}" \
    || { echo "FAIL: node_modules khong bi chan"; exit 1; }
  any_ignored ".env" "${GITIGNORE[@]}" \
    || { echo "FAIL: .env khong bi chan"; exit 1; }
  any_ignored "npm-debug.log" "${GITIGNORE[@]}" \
    || { echo "FAIL: *.log khong chan duoc npm-debug.log"; exit 1; }
  any_ignored "dist/app.js" "${GITIGNORE[@]}" \
    || { echo "FAIL: dist/ khong bi chan"; exit 1; }
  any_ignored "build-prod/app.js" "build*/" \
    || { echo "FAIL: pattern thu muc co * (build*/) khong bat duoc build-prod/"; exit 1; }
  any_ignored "node_modules_old/x.js" "${GITIGNORE[@]}" \
    && { echo "FAIL: node_modules_old bi chan nham -- node_modules/ chi bat dung ten do"; exit 1; }
  any_ignored "src/index.js" "${GITIGNORE[@]}" \
    && { echo "FAIL: src/index.js bi chan nham"; exit 1; }
  any_ignored ".env.example" "${GITIGNORE[@]}" \
    && { echo "FAIL: .env.example bi chan nham (chi .env moi dung bi chan)"; exit 1; }
  echo "OK"
}

selfcheck
