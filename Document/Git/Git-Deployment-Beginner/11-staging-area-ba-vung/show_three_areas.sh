#!/usr/bin/env bash
# Dung mot file duy nhat mang ba noi dung khac nhau o ba vung cua git cung luc,
# de thay ro: HEAD (commit cuoi), index (vung cho commit), working tree (file tren dia)
# la ba thu tach biet -- khong phai ba cach goi cua cung mot thu.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

cd "$(new_sandbox_repo)"

# --- Dung tinh huong: cung file config.js, ba phien ban o ba vung ---
commit_file config.js "timeout = 1000" "feat: them config"     # -> HEAD

printf '%s\n' "timeout = 2000" > config.js
git add config.js                                              # -> index

printf '%s\n' "timeout = 3000" > config.js                     # -> working tree

# --- Doc tung vung ---
# Cu phap tham chieu khac nhau cho tung vung, day la phan hay bi nham nhat:
#   HEAD:duong-dan  -> ban trong commit cuoi
#   :duong-dan      -> ban trong index (khong co gi truoc dau hai cham)
#   cat duong-dan   -> ban tren dia
trong_head="$(git show HEAD:config.js)"
trong_index="$(git show :config.js)"
tren_dia="$(cat config.js)"

[ "$trong_head"  = "timeout = 1000" ] || die "HEAD phai giu ban 1000, dang la: $trong_head"
[ "$trong_index" = "timeout = 2000" ] || die "index phai giu ban 2000, dang la: $trong_index"
[ "$tren_dia"    = "timeout = 3000" ] || die "file tren dia phai la 3000, dang la: $tren_dia"

# --- Hai lenh diff so hai cap vung khac nhau ---
# `git diff` KHONG phai "xem toi da doi gi" nhu nhieu nguoi tuong. No so
# index <-> working tree, tuc la phan ban CHUA add.
git diff --unified=0 | chua '^+timeout = 3000' || die "git diff phai cho thay ban 3000 (index <-> dia)"

# Con phan da add thi phai xem bang --staged (ten cu: --cached).
git diff --staged --unified=0 | chua '^+timeout = 2000' \
  || die "git diff --staged phai cho thay ban 2000 (HEAD <-> index)"

# Suy ra mot dieu quan trong: `git diff` mot minh KHONG he bao gom phan da add.
# Ai chi go `git diff` roi ket luan "khong con gi de commit" la dang bo sot.
git diff --quiet && die "git diff dang bao khong co gi, trong khi tren dia van khac index"

# --- git status --porcelain doc duoc ca hai vung mot luot ---
# Ky tu thu nhat = trang thai o index, ky tu thu hai = trang thai o working tree.
# Vay "MM" nghia la: da add mot lan, roi lai sua tiep sau khi add.
trang_thai="$(git status --porcelain config.js)"
[ "${trang_thai:0:2}" = "MM" ] || die "mong doi ma MM (sua o ca hai vung), nhan duoc: $trang_thai"

# --- reset --mixed keo index ve bang HEAD, khong cham file tren dia ---
git reset -q config.js
[ "$(git show :config.js)" = "timeout = 1000" ] || die "sau reset, index phai bang HEAD"
[ "$(cat config.js)" = "timeout = 3000" ] || die "reset khong duoc sua file tren dia"

echo "OK"
