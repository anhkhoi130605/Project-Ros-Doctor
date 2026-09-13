#!/usr/bin/env bash
# cherry-pick lay MOT commit (hoac mot day) tu nhanh khac ap vao nhanh dang dung. No khong
# "sao chep commit" ma ap lai THAY DOI cua commit do len noi dung hien tai -- nen ket qua co
# the khac, va hash thi chac chan khac.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

cd "$(new_sandbox_repo)"
commit_file app.js "phien ban 1" "feat: khoi tao"
goc="$(git rev-parse HEAD)"

git checkout -q -b feat/dang-lam
commit_file tinh-nang.js "tinh nang dang lam" "feat: tinh nang chua xong"
hash_tinh_nang="$(git rev-parse HEAD)"
commit_file loi.js "sua loi quan trong" "fix: sua loi dang nhap"
hash_ban_va="$(git rev-parse HEAD)"
commit_file tinh-nang.js "tinh nang dang lam
lam tiep" "feat: lam tiep tinh nang"

# --- Tinh huong: can GAP ban va len main, nhung tinh nang thi chua xong ---
git checkout -q main
git cherry-pick "$hash_ban_va" >/dev/null 2>&1 || die "cherry-pick phai chay duoc"

[ -f loi.js ] || die "ban va phai duoc ap vao main"
[ -f tinh-nang.js ] && die "khong duoc keo theo tinh nang chua xong"
[ "$(git log -1 --format=%s)" = "fix: sua loi dang nhap" ] || die "message duoc giu nguyen"

# Hash khac -- day la commit MOI voi cung noi dung thay doi.
hash_tren_main="$(git rev-parse HEAD)"
[ "$hash_tren_main" != "$hash_ban_va" ] || die "cherry-pick tao commit moi"

# --- -x: ghi lai nguon goc ---
# Khong bat buoc nhung rat nen dung khi lay commit tu nhanh khac: sau nay doc log con biet
# commit nay tu dau ra.
git checkout -q -b thu-x "$goc"
git cherry-pick -x "$hash_ban_va" >/dev/null 2>&1 || die "cherry-pick -x phai chay duoc"
git log -1 --format=%B | chua 'cherry picked from commit' || die "-x phai ghi nguon vao message"

# --- Mot DAY commit ---
git checkout -q -b thu-day "$goc"
git cherry-pick "$goc..feat/dang-lam" >/dev/null 2>&1 || die "cherry-pick mot day phai chay duoc"
[ "$(git rev-list --count "$goc..HEAD")" = "3" ] || die "phai ap ca 3 commit"

# Chu y dau cham: `A..B` khong bao gom A. Muon lay ca A thi dung `A^..B`.
# Nen o day phai la commit da co tinh-nang.js: commit thu hai trong day co sua file do, ap len
# mot nen khong co no la conflict ngay. cherry-pick chi troi chay khi nen du gan voi nguon.
git checkout -q -b thu-day-2 "$hash_tinh_nang"
git cherry-pick "$hash_ban_va^..feat/dang-lam" >/dev/null 2>&1 || die "day tu ban va tro di"
[ "$(git rev-list --count "$hash_tinh_nang..HEAD")" = "2" ] || die "phai ap 2 commit cuoi"

# --- Conflict khi ap ---
git checkout -q -b thu-conflict main
printf '%s\n' "main da sua file nay theo cach khac" > loi.js
git commit -qam "fix: main tu sua loi theo cach khac"

git cherry-pick "$hash_ban_va" >/dev/null 2>&1 && die "phai conflict"
[ -f .git/CHERRY_PICK_HEAD ] || die "dang cherry-pick do dang"
grep -q '<<<<<<<' loi.js || die "phai co dau conflict"

# Ba duong ra, giong nhu merge (bai 29):
git cherry-pick --abort
[ ! -f .git/CHERRY_PICK_HEAD ] || die "--abort phai don sach"
[ "$(cat loi.js)" = "main da sua file nay theo cach khac" ] || die "quay ve trang thai truoc"

# --- Cai bay: cherry-pick roi merge -> commit bi nhan doi? ---
# Ban va da nam tren main (qua cherry-pick). Gio merge ca nhanh feat/dang-lam vao main.
git checkout -q main
git merge -q --no-ff feat/dang-lam -m "merge: gop tinh nang" >/dev/null 2>&1 \
  || die "merge phai chay duoc"

# Git nhan ra thay doi da co san nen KHONG nhan doi noi dung file.
[ "$(grep -c 'sua loi quan trong' loi.js)" = "1" ] || die "noi dung khong duoc nhan doi"

# Nhung LICH SU thi co hai commit cung mot y nghia: ban cherry-pick va ban goc.
[ "$(git log --format=%s | grep -c 'fix: sua loi dang nhap' || true)" = "2" ] \
  || die "message xuat hien 2 lan trong lich su"

# `git cherry` tra loi cau hoi "commit nao cua nhanh kia da co mat o day roi":
# dau `-` = da co (theo noi dung thay doi), dau `+` = chua co.
git checkout -q -b kiem-tra "$goc"
git cherry-pick "$hash_ban_va" >/dev/null 2>&1
ket_qua="$(git cherry kiem-tra feat/dang-lam)"
chua '^- ' <<< "$ket_qua" || die "phai co it nhat mot commit duoc danh dau da ap roi"

# Do la ly do nen cherry-pick CANG IT CANG TOT: moi lan pick la mot ban sao noi dung ton tai
# song song, va sau nay khong ai biet hai commit do co that su giong nhau khong.
# Dung khi: hotfix can len production ngay, hoac lay mot commit tu nhanh sap bi bo.

echo "OK"
