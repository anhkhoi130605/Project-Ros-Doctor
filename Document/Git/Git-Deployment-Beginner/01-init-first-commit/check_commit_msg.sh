#!/usr/bin/env bash
# Cham 1 commit message co dat chuan toi thieu khong: khong rong, khong nam trong
# nhom message vo nghia hay gap, va co it nhat 3 tu.
#
# Ham tra ve ma loi khac nhau cho tung truong hop thay vi chi 0/1, vi "message rac"
# va "message qua ngan" can hai loi nhac khac nhau -- bao chung mot cau thi nguoi moi
# hoc doc xong van khong biet phai sua gi.
set -euo pipefail

BAD_MESSAGES=("asdf" "update" "commit" "fix" "wip" "test" "abc" "123" "sua loi")

# 0 = dat | 1 = rong | 2 = nam trong nhom message rac | 3 = it hon 3 tu
is_good_commit_msg() {
  # Tach thanh tu bang `read -a`: mot buoc lam luon ca ba viec -- bo space dau/cuoi,
  # gop space lap, va dem tu. Truoc day cho nay goi echo|sed, echo|tr, echo|wc
  # la ba subshell chi de lam dung viec nay.
  local -a words
  read -r -a words <<< "$1"
  [ "${#words[@]}" -gt 0 ] || return 1

  # Ha chu thuong bang tr chu khong bang "${lower,,}": cu phap do chi co tu bash 4, ma macOS
  # van giao bash 3.2 -- va no la loi CU PHAP, tuc script khong chay noi mot dong nao tren do.
  local lower
  lower="$(printf '%s' "${words[*]}" | tr '[:upper:]' '[:lower:]')"

  local bad
  for bad in "${BAD_MESSAGES[@]}"; do
    [ "$lower" = "$bad" ] && return 2
  done

  [ "${#words[@]}" -ge 3 ] || return 3
  return 0
}

# Kiem tra ca MA LOI, khong chi dung/sai: neu chi cham 0/1 thi nhom BAD_MESSAGES
# co bi xoa di cung khong test nao do (moi entry deu duoi 3 tu nen quy tac dem tu
# da chan het) -- va loi khuyen hien cho nguoi dung se sai.
expect_code() {
  local want="$1" msg="$2" got=0
  is_good_commit_msg "$msg" || got=$?
  [ "$got" = "$want" ] || { echo "FAIL: \"$msg\" cho ma $got, can $want"; exit 1; }
}

selfcheck() {
  expect_code 0 "feat: them form dang nhap"
  expect_code 0 "sua loi crash khi gio hang rong"
  expect_code 1 ""
  expect_code 1 "     "
  expect_code 2 "asdf"
  expect_code 2 "update"
  expect_code 2 "Update"
  expect_code 2 "sua loi"
  expect_code 3 "fix bug"
  echo "OK"
}

if [ "$#" -eq 0 ]; then
  selfcheck
else
  code=0
  is_good_commit_msg "$1" || code=$?
  case "$code" in
    0) echo "Dat: \"$1\"" ;;
    1) echo "Chua dat: message rong -- git can biet ban vua lam gi"; exit 1 ;;
    2) echo "Chua dat: \"$1\" la message rac kinh dien -- viet ban da doi CAI GI"; exit 1 ;;
    3) echo "Chua dat: \"$1\" moi co duoi 3 tu -- them ngu canh vao"; exit 1 ;;
  esac
fi
