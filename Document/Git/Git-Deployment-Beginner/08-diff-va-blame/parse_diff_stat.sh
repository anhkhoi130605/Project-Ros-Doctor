#!/usr/bin/env bash
# Tach 1 dong "git diff --stat" thanh: ten file, tong so dong thay doi, so dau +, so dau -.
#
# Can phan biet ro: cot so (12) la so dong thay doi THAT, con day +++--- chi la thanh
# bieu dien. Khi diff lon, git nen thanh nay cho vua be ngang terminal nen so dau +
# va - KHONG con bang so dong nua -- xem case "diff lon" trong self-check. Muon so dong
# them/bot chinh xac thi dung `git diff --numstat`, khong phai `--stat`.
set -euo pipefail

parse_diff_stat_line() {
  local line="$1"

  if [[ "$line" =~ ^[[:space:]]*(.+[^[:space:]])[[:space:]]*\|[[:space:]]*([0-9]+)[[:space:]]*(\+*)(\-*)[[:space:]]*$ ]]; then
    local file="${BASH_REMATCH[1]}"
    local total="${BASH_REMATCH[2]}"
    local plus="${BASH_REMATCH[3]}"
    local minus="${BASH_REMATCH[4]}"
    echo "$file $total ${#plus} ${#minus}"
    return 0
  fi

  return 1
}

selfcheck() {
  local result

  result="$(parse_diff_stat_line ' src/app.js | 12 +++++-------')"
  [ "$result" = "src/app.js 12 5 7" ] || { echo "FAIL: dong thuong sai ($result)"; exit 1; }

  result="$(parse_diff_stat_line ' README.md | 3 +++')"
  [ "$result" = "README.md 3 3 0" ] || { echo "FAIL: chi them dong sai ($result)"; exit 1; }

  result="$(parse_diff_stat_line ' old.js | 4 ----')"
  [ "$result" = "old.js 4 0 4" ] || { echo "FAIL: chi bot dong sai ($result)"; exit 1; }

  result="$(parse_diff_stat_line ' src/empty.js | 0')"
  [ "$result" = "src/empty.js 0 0 0" ] || { echo "FAIL: khong doi dong sai ($result)"; exit 1; }

  # Diff lon: git nen thanh +/- lai, tong 900 nhung chi con 77 ky tu bieu dien.
  # Test nay chot lai rang ham tra ve DO DAI THANH, khong phai so dong.
  result="$(parse_diff_stat_line ' big.js | 900 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-----')"
  [ "$result" = "big.js 900 72 5" ] || { echo "FAIL: dong diff lon sai ($result)"; exit 1; }

  # File nhi phan khong co thanh +/- nen khong parse duoc -- dung, va phai bao loi
  # ro rang chu khong tra ve so 0 lam nguoi doc tuong file khong doi.
  parse_diff_stat_line ' logo.png | Bin 0 -> 1234 bytes' >/dev/null 2>&1 \
    && { echo "FAIL: dong file nhi phan (Bin) khong duoc coi la parse thanh cong"; exit 1; }

  parse_diff_stat_line ' 3 files changed, 20 insertions(+), 5 deletions(-)' >/dev/null 2>&1 \
    && { echo "FAIL: dong tong ket bi nhan nham la dong 1 file"; exit 1; }

  echo "OK"
}

if [ "$#" -eq 0 ]; then
  selfcheck
else
  if result="$(parse_diff_stat_line "$1")"; then
    echo "$result"
  else
    echo "Khong nhan dang duoc dong diff --stat: \"$1\""
    exit 1
  fi
fi
