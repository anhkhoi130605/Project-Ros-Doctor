#!/usr/bin/env bash
# Conflict trong rebase khac conflict trong merge o hai diem lam nguoi ta lung tung nhat:
# no dung lai NHIEU LAN (moi commit mot lan), va "ours/theirs" bi dao nguoc. Bai nay di qua
# ca ba duong ra -- continue, skip, abort -- tren mot rebase that co hai lan dung.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

cd "$(new_sandbox_repo)"
commit_file cau-hinh.js "const timeout = 1000" "feat: khoi tao"
goc="$(git rev-parse HEAD)"

# main doi gia tri do theo mot huong.
commit_file cau-hinh.js "const timeout = 9000" "feat: main dat timeout 9000"

# Nhanh cua ta co HAI commit deu cham vao dong do -> rebase se dung lai hai lan.
git checkout -q -b feat/cua-toi "$goc"
commit_file cau-hinh.js "const timeout = 2000" "feat: buoc 1 dat 2000"
commit_file cau-hinh.js "const timeout = 3000" "feat: buoc 2 dat 3000"

luu_dinh="$(git rev-parse feat/cua-toi)"   # de dung lai canh cho tung duong ra

# ============ Duong ra 1: --abort ============
git rebase main >/dev/null 2>&1 && die "phai conflict o commit dau tien"
[ -d .git/rebase-merge ] || [ -d .git/rebase-apply ] || die "phai dang o giua rebase"

git rebase --abort
[ "$(git rev-parse HEAD)" = "$luu_dinh" ] || die "--abort phai tra ve dung truoc rebase"
[ -z "$(git status --porcelain)" ] || die "--abort phai tra repo ve sach"

# ============ Duong ra 2: --continue, giai tung lan ============
git rebase main >/dev/null 2>&1 && die "van phai conflict"

# --- ours/theirs DAO NGUOC trong rebase ---
# Rebase phat lai commit CUA BAN len tren nhanh nen. Voi git, "ours" la cai da co san o do --
# tuc la NHANH NEN (main) -- con "theirs" moi la commit cua ban dang duoc ap vao.
[ "$(git show :2:cau-hinh.js)" = "const timeout = 9000" ] \
  || die "stage 2 (ours) trong rebase la nhanh NEN chu khong phai commit cua ta"
[ "$(git show :3:cau-hinh.js)" = "const timeout = 2000" ] \
  || die "stage 3 (theirs) moi la commit cua ta"

# Doc dau conflict cung cho ket qua tuong ung.
sed -n '/^<<<<<<</,/^=======/p' cau-hinh.js | chua '9000' \
  || die "phan tren dau conflict la nhanh nen"

# Vi vay `git checkout --ours` o day se lay MAIN, khong phai viec cua ban -- nguoc han
# truc giac. Cach an toan: doc dau conflict, hoac dung so hieu stage nhu tren.

# Lan dung thu nhat: giai bang mot quyet dinh rieng -- lay 5000 thay vi 2000 hay 9000.
#
# Chinh cach giai nay quyet dinh co dung lai lan hai hay khong. Neu ta giai thanh dung "2000"
# thi commit thu hai (doi 2000 -> 3000) ap sach va rebase chay thang mot mach. Con giai thanh
# gia tri khac thi patch cua no khong con khop, va git phai hoi tiep.
printf '%s\n' "const timeout = 5000" > cau-hinh.js
git add cau-hinh.js
GIT_EDITOR=true git rebase --continue >/dev/null 2>&1 && die "con commit thu hai, phai conflict tiep"

# Lan dung thu hai -- day la dieu khac merge: merge chi dung MOT lan cho ca nhanh,
# con rebase dung o TUNG commit co tranh chap.
[ -d .git/rebase-merge ] || [ -d .git/rebase-apply ] || die "van dang trong rebase"
[ "$(git show :3:cau-hinh.js)" = "const timeout = 3000" ] || die "gio dang ap commit thu hai"

printf '%s\n' "const timeout = 3000" > cau-hinh.js
git add cau-hinh.js
GIT_EDITOR=true git rebase --continue >/dev/null 2>&1 || die "lan nay phai xong"

[ ! -d .git/rebase-merge ] && [ ! -d .git/rebase-apply ] || die "rebase phai ket thuc"
[ "$(git rev-list --count main..HEAD)" = "2" ] || die "giu ca hai commit cua ta"
[ "$(cat cau-hinh.js)" = "const timeout = 3000" ] || die "ket qua cuoi la ban da giai"

# ============ Duong ra 3: --skip, va vi sao no nguy hiem ============
# --skip VUT HAN commit dang bi ket, khong hoi lai. Dung khi commit do da thua that su
# (vd thay doi cua no da co san tren nhanh nen). Dung nham la mat viec, im lang.
git checkout -q -B feat/thu-skip "$luu_dinh"
git rebase main >/dev/null 2>&1 && die "phai conflict"

git rebase --skip >/dev/null 2>&1 && die "con commit thu hai nen van conflict"
git rebase --skip >/dev/null 2>&1 || die "skip not commit thu hai thi rebase phai ket thuc"

[ ! -d .git/rebase-merge ] && [ ! -d .git/rebase-apply ] || die "rebase phai ket thuc"
[ "$(git rev-list --count main..HEAD)" = "0" ] || die "skip het thi khong con commit nao cua ta"
[ "$(cat cau-hinh.js)" = "const timeout = 9000" ] || die "chi con noi dung cua main"

# Ca hai commit da bien mat khoi nhanh -- va git khong he canh bao gi them.

# ============ rerere lo ho nhung lan sau ============
# Rebase mot nhanh dai co the gap CUNG mot conflict o nhieu commit lien tiep. Bat rerere
# (bai 32) la tu lan thu hai tro di git tu dien ban giai.
git config rerere.enabled true
git checkout -q -B feat/thu-rerere "$luu_dinh"
git rebase main >/dev/null 2>&1 && die "phai conflict"
# Lan nay giai thanh dung 2000 -- va nhu da thay o tren, the la commit thu hai ap sach
# nen rebase chay het mot mach, khong dung lai lan nao nua.
printf '%s\n' "const timeout = 2000" > cau-hinh.js
git add cau-hinh.js
GIT_EDITOR=true git rebase --continue >/dev/null 2>&1 \
  || die "giai thanh 2000 thi commit thu hai ap sach, rebase phai chay het"

[ ! -d .git/rebase-merge ] && [ ! -d .git/rebase-apply ] || die "rebase phai ket thuc"
[ -d .git/rr-cache ] || die "rerere phai ghi lai cach giai"

# ============ Tranh conflict tu dau ============
# Rebase som va thuong xuyen: nhanh cang lac hau thi cang nhieu commit cham vao cung mot cho.
#   git fetch && git rebase origin/main      -> lam moi ngay thay vi doi den luc mo PR
# Va tach commit cho gon (bai 18): commit nho thi moi lan dung lai chi phai giai mot viec.

echo "OK"
