#!/usr/bin/env bash
# Nhieu nguoi hinh dung branch la mot "ban copy cua code". Thuc te no la mot FILE VAN BAN
# chua dung mot dong: hash cua commit. Hieu dieu nay thi tu nhien khong con so tao nhanh,
# xoa nhanh, hay doi nhanh nua -- vi tat ca chi la ghi lai mot dong chu.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

cd "$(new_sandbox_repo)"

commit_file app.js "v1" "feat: phien ban 1"
commit_file app.js "v2" "feat: phien ban 2"
hash_hien_tai="$(git rev-parse HEAD)"

# --- Nhanh nam o dau tren dia ---
[ -f .git/refs/heads/main ] || die "phai co file .git/refs/heads/main"

# Noi dung file do dung bang hash cua commit, khong hon.
[ "$(cat .git/refs/heads/main)" = "$hash_hien_tai" ] \
  || die "file nhanh phai chua dung hash commit"

# 40 ky tu hash + 1 ky tu xuong dong = 41 byte. Do la toan bo "chi phi" cua mot nhanh.
so_byte="$(wc -c < .git/refs/heads/main | tr -d ' ')"
[ "$so_byte" = "41" ] || die "mong doi 41 byte, nhan duoc $so_byte"

# --- Tao nhanh = ghi them mot file nua voi cung hash ---
git branch tinh-nang-moi
[ "$(cat .git/refs/heads/tinh-nang-moi)" = "$hash_hien_tai" ] \
  || die "nhanh moi phai tro vao dung commit dang dung"

# Nen tao nhanh khong copy file nao, khong ton dung luong dang ke, va tuc thi --
# du repo co 10 nam lich su. Khong co ly do gi de tiec khi tao nhanh.

# --- HEAD la con tro tro vao... mot con tro khac ---
# Day la cho hay nham: HEAD khong tro thang vao commit, no tro vao TEN NHANH.
[ "$(cat .git/HEAD)" = "ref: refs/heads/main" ] || die "HEAD phai tro vao ten nhanh, khong phai hash"
[ "$(git symbolic-ref --short HEAD)" = "main" ] || die "symbolic-ref phai tra ve main"

# Nen "dang o nhanh nao" thuc chat la: HEAD dang tro vao ten nao.
git checkout -q tinh-nang-moi
[ "$(cat .git/HEAD)" = "ref: refs/heads/tinh-nang-moi" ] || die "checkout phai doi noi dung HEAD"
git checkout -q main

# --- Commit lam gi voi con tro ---
# Commit = tao object commit moi, roi GHI DE hash moi vao file cua nhanh dang dung.
commit_file app.js "v3" "feat: phien ban 3"
hash_moi="$(git rev-parse HEAD)"

[ "$(cat .git/refs/heads/main)" = "$hash_moi" ] || die "main phai da tien len commit moi"
# Nhanh kia khong he bi anh huong, van dung o cho cu.
[ "$(cat .git/refs/heads/tinh-nang-moi)" = "$hash_hien_tai" ] \
  || die "nhanh khac khong duoc dich khi ta commit tren main"

# --- Doi nhanh = ghi lai con tro, khong cham gi den commit ---
git branch -f tinh-nang-moi main
[ "$(git rev-parse tinh-nang-moi)" = "$hash_moi" ] || die "branch -f phai dich con tro"

# --- Xoa nhanh KHONG xoa commit ---
git branch -D tinh-nang-moi >/dev/null
[ ! -f .git/refs/heads/tinh-nang-moi ] || die "xoa nhanh phai xoa file con tro"

# Commit van con nguyen, doc duoc bang hash. Cai bi xoa chi la cai TEN.
git cat-file -e "$hash_moi" || die "commit phai van con sau khi xoa nhanh"
[ "$(git log -1 --format=%s "$hash_moi")" = "feat: phien ban 3" ] || die "commit phai giu message"

# --- Vi sao doi khi git bao "nhanh chua duoc merge, khong xoa duoc" ---
git checkout -q -b thu-nghiem
commit_file thu.js "chi co o nhanh nay" "feat: thu nghiem gi do"
hash_rieng="$(git rev-parse HEAD)"
git checkout -q main

# Commit hash_rieng chi co the voi tay tu nhanh thu-nghiem. Xoa nhanh do bang -d thi
# khong con duong nao den commit -> git tu choi, vi day la luc thuc su co the mat viec.
git branch -d thu-nghiem 2>/dev/null && die "git dang le phai tu choi xoa nhanh chua merge"

# -D (chu hoa) la "toi biet toi dang lam gi". Commit van chua mat ngay -- no vao reflog
# va con o do khoang 90 ngay truoc khi bi don rac (bai 24).
git branch -D thu-nghiem >/dev/null
git cat-file -e "$hash_rieng" || die "commit van phai con trong repo sau khi xoa nhanh bang -D"

echo "OK"
