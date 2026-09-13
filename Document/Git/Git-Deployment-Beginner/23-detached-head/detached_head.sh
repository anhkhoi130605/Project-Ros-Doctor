#!/usr/bin/env bash
# "You are in 'detached HEAD' state" -- dong canh bao lam nhieu nguoi moi hoc so nhat.
# No khong phai loi. No chi co nghia: HEAD dang tro thang vao mot commit thay vi tro vao
# ten nhanh. Bai nay vao trang thai do, commit trong do, roi cuu lai commit vua tao.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

cd "$(new_sandbox_repo)"

commit_file app.js "v1" "feat: phien ban 1"
commit_file app.js "v2" "feat: phien ban 2"
commit_file app.js "v3" "feat: phien ban 3"
commit_cu="$(git rev-parse HEAD~2)"
dinh_main="$(git rev-parse main)"

# --- Binh thuong: HEAD tro vao TEN NHANH ---
[ "$(cat .git/HEAD)" = "ref: refs/heads/main" ] || die "binh thuong HEAD phai tro vao ten nhanh"

# --- Vao trang thai detached: checkout thang mot commit ---
git checkout -q "$commit_cu"

# Gio HEAD chua truc tiep hash, khong con qua ten nhanh nao nua.
[ "$(cat .git/HEAD)" = "$commit_cu" ] || die "detached thi HEAD phai chua truc tiep hash"
git symbolic-ref -q HEAD >/dev/null && die "detached thi HEAD khong con la symbolic ref"

# Cach kiem tra trong script: --show-current tra ve chuoi RONG khi detached.
[ -z "$(git branch --show-current)" ] || die "detached thi --show-current phai rong"

# File tren dia da la ban cua commit cu -- day chinh la cai huu ich cua detached HEAD:
# xem lai code tai mot thoi diem trong qua khu ma khong pha gi.
[ "$(cat app.js)" = "v1" ] || die "phai dang xem ban v1"

# --- Commit trong trang thai detached: van commit duoc, nhung khong nhanh nao ghi nhan ---
commit_file app.js "v1-thu-nghiem" "feat: thu mot y tuong"
commit_mo_coi="$(git rev-parse HEAD)"

# main khong he dich -- day la cho nguy hiem: ban lam viec ca buoi, commit deu, ma
# khong co nhanh nao tien theo.
[ "$(git rev-parse main)" = "$dinh_main" ] || die "main khong duoc dich khi ta commit o detached"

# Khong nhanh nao voi tay den commit vua tao.
# Dung for-each-ref chu khong dung `git branch --contains`: o trang thai detached, lenh do
# tu them mot dong gia "* (HEAD detached from ...)" cho chinh HEAD, nen ket qua khong bao
# gio rong va khong dung duoc de tra loi "co nhanh nao giu commit nay khong".
nhanh_giu() { git for-each-ref --contains "$1" refs/heads/ --format='%(refname:short)'; }

[ -z "$(nhanh_giu "$commit_mo_coi")" ] || die "khong nhanh nao duoc chua commit vua tao"

# --- Thoat ra ma KHONG mat viec: dat mot cai ten cho no truoc khi di ---
git switch -q -c cuu-y-tuong
[ "$(git branch --show-current)" = "cuu-y-tuong" ] || die "phai dang o nhanh cuu-y-tuong"
[ "$(git rev-parse HEAD)" = "$commit_mo_coi" ] || die "nhanh moi phai tro vao commit vua tao"

# Gio commit do da co nhanh giu, khong con mo coi nua.
nhanh_giu "$commit_mo_coi" | chua 'cuu-y-tuong' || die "commit phai duoc nhanh cuu-y-tuong giu"

# --- Truong hop nguoc lai: thoat ra ma khong dat ten ---
git checkout -q "$commit_cu"
commit_file app.js "v1-bo-di" "feat: thu y tuong thu hai"
commit_bo_lai="$(git rev-parse HEAD)"

git switch -q main            # di thang ve main, khong dat ten cho commit vua tao

# Git da in canh bao khi ta roi di. Commit chua mat -- nhung duong duy nhat de tim lai
# la reflog, va no chi giu khoang 90 ngay.
[ -z "$(nhanh_giu "$commit_bo_lai")" ] || die "commit nay dang le mo coi"
git cat-file -e "$commit_bo_lai" || die "commit van phai con trong repo"

# Tim lai bang reflog: dong nao co ghi commit do.
git reflog | chua "$(git rev-parse --short "$commit_bo_lai")" \
  || die "reflog phai con dau vet commit bi bo lai"

# Va cuu duoc bang cach dat ten cho no, y nhu tren.
git branch cuu-lan-hai "$commit_bo_lai"
[ "$(git rev-parse cuu-lan-hai)" = "$commit_bo_lai" ] || die "phai cuu lai duoc commit bo lai"

# --- Khi nao detached HEAD la binh thuong, khong phai su co ---
# CI thuong checkout dung mot commit (khong phai nhanh) de build dung ma da duoc test.
# Nen thay dong "detached HEAD" trong log CI la chuyen thuong.
git checkout -q "$dinh_main"
[ -z "$(git branch --show-current)" ] || die "vi du CI: dang o detached la dung"
git switch -q main

echo "OK"
