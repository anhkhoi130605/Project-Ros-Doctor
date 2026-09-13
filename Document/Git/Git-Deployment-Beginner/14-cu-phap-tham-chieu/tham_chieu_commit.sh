#!/usr/bin/env bash
# `HEAD~2` va `HEAD^2` khac nhau hoan toan, va go nham la mot trong nhung ly do pho bien
# nhat khien nguoi ta reset di dung cho. Bai nay dung mot lich su co merge -- vi chi khi
# co commit hai cha thi su khac nhau moi hien ra -- roi giai tung tham chieu.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

cd "$(new_sandbox_repo)"

# --- Dung lich su:
#
#   A - B - C - D - M   <- main
#        \         /
#         ------- E     <- feature
#
commit_file so.txt "A" "feat: A"
a="$(git rev-parse HEAD)"
commit_file so.txt "B" "feat: B"
b="$(git rev-parse HEAD)"

git checkout -q -b feature
commit_file khac.txt "E" "feat: E tren nhanh feature"
e="$(git rev-parse HEAD)"

git checkout -q main
commit_file so.txt "C" "feat: C"
c="$(git rev-parse HEAD)"
commit_file so.txt "D" "feat: D"
d="$(git rev-parse HEAD)"

git merge -q --no-ff feature -m "merge: dua feature vao main"
m="$(git rev-parse HEAD)"

# Ham so sanh cho gon, in ra ca hai ben khi lech de de tim loi.
la() {
  local bieu_thuc="$1" mong_doi="$2" ten="$3" thuc_te
  thuc_te="$(git rev-parse "$bieu_thuc")"
  [ "$thuc_te" = "$mong_doi" ] \
    || die "$bieu_thuc phai la $ten ($(git rev-parse --short "$mong_doi")), nhan duoc $(git rev-parse --short "$thuc_te")"
}

# --- Dau ^ : CHON CHA NAO trong so cac cha cua commit ---
# Commit merge co hai cha. ^1 la cha thu nhat = nhanh dang dung khi go merge (main).
# ^2 la cha thu hai = nhanh duoc merge vao (feature).
la "HEAD"    "$m" "commit merge"
la "HEAD^"   "$d" "D, cha thu nhat"
la "HEAD^1"  "$d" "D, cha thu nhat"
la "HEAD^2"  "$e" "E, cha thu hai -- dinh cua nhanh duoc merge"

# --- Dau ~ : DI LEN BAO NHIEU BUOC, luon theo cha thu nhat ---
# Nen ~ khong bao gio re sang nhanh feature, du lich su co merge.
la "HEAD~1"  "$d" "D"
la "HEAD~2"  "$c" "C"
la "HEAD~3"  "$b" "B"
la "HEAD~4"  "$a" "A"

# Ghep lai thi doc tu trai sang phai, tung buoc mot:
la "HEAD^^"    "$c" "C (len 1 buoc hai lan)"
la "HEAD~2^"   "$b" "B (len 2 buoc roi lay cha)"
la "HEAD^2^"   "$b" "B (sang nhanh feature roi len 1 buoc)"

# Vay `HEAD~2` va `HEAD^2` tro vao hai commit hoan toan khac nhau:
[ "$(git rev-parse HEAD~2)" != "$(git rev-parse HEAD^2)" ] || die "~2 va ^2 phai khac nhau"

# --- @{...} : quay lai theo THOI GIAN, khong phai theo lich su ---
# HEAD@{1} = cho HEAD dung mot buoc di chuyen truoc day. Cai nay doc tu reflog nen no
# biet ca nhung thao tac khong de lai dau trong lich su (checkout, reset, merge).
git checkout -q feature
la "HEAD@{1}" "$m" "vi tri HEAD truoc khi checkout"
git checkout -q main

# --- Dung de doc noi dung file o mot thoi diem ---
[ "$(git show HEAD~4:so.txt)" = "A" ] || die "so.txt o commit A phai la A"
[ "$(git show HEAD^2:khac.txt)" = "E" ] || die "khac.txt chi ton tai tren nhanh feature"

# --- Khoang: hai dau cham = tu day den kia, khong tinh dau ben trai ---
[ "$(git rev-list --count "$b..$d")" = "2" ] || die "b..d phai gom dung C va D"
# Ba dau cham = phan rieng cua ca hai ben (doi xung).
[ "$(git rev-list --count "$d...$e")" = "3" ] || die "d...e phai gom C, D va E"

echo "OK"
