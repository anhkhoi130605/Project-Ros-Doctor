#!/usr/bin/env bash
# `git pull` = `git fetch` + `git merge`. Cau do ai cung thuoc nhung it ai dung dung, vi no bo
# qua phan quan trong nhat: giua hai buoc do co mot cho de ban NHIN truoc khi nhap. Bai nay tach
# doi hai buoc de thay ro nhanh remote-tracking (origin/main) la mot con tro rieng.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

remote="$(new_bare_remote)"

# Hai ban sao cua cung mot repo: cua ban, va cua dong doi.
cd "$(new_sandbox_repo)"
git remote add origin "$remote"
commit_file app.js "phien ban 1" "feat: khoi tao"
git push -q -u origin main
cua_ban="$PWD"

cua_dong_doi="$(sandbox_clone "$remote" "$SANDBOX_ROOT/dong-doi")"

# Dong doi day len mot commit moi.
printf '%s\n' "phien ban 2 (cua dong doi)" > "$cua_dong_doi/app.js"
git -C "$cua_dong_doi" commit -qam "feat: dong doi sua app"
git -C "$cua_dong_doi" push -q origin main

# --- Truoc khi fetch: may ban KHONG he biet co gi moi ---
cd "$cua_ban"
[ "$(cat app.js)" = "phien ban 1" ] || die "file cua ban chua doi"
[ "$(git rev-parse main)" = "$(git rev-parse origin/main)" ] \
  || die "truoc fetch, main va origin/main phai bang nhau"

# `origin/main` KHONG phai "nhanh main tren server". No la ghi nho cuc bo: "lan cuoi toi noi
# chuyen voi server, main cua no o day". Khong co mang thi no van doc duoc, va no cu.

# --- fetch: tai ve, cap nhat origin/main, KHONG dung den nhanh cua ban ---
git fetch -q origin

[ "$(git rev-parse main)" != "$(git rev-parse origin/main)" ] \
  || die "sau fetch, origin/main phai da tien len"
[ "$(cat app.js)" = "phien ban 1" ] || die "fetch khong duoc dung den file cua ban"
[ "$(git log -1 --format=%s main)" = "feat: khoi tao" ] || die "fetch khong duoc dich nhanh main"

# Day chinh la cho de NHIN truoc khi nhap -- thu ma `git pull` lam ban mat:
[ "$(git rev-list --count main..origin/main)" = "1" ] || die "phai thay 1 commit moi o phia truoc"
git log --oneline main..origin/main | chua 'dong doi sua app' || die "phai doc duoc commit sap nhap"

# Va xem truoc no se doi gi:
git diff main origin/main --name-only | chua 'app.js' || die "phai xem truoc duoc file bi doi"

# --- merge: gio moi nhap vao nhanh cua ban ---
git merge -q origin/main >/dev/null
[ "$(cat app.js)" = "phien ban 2 (cua dong doi)" ] || die "sau merge moi lay noi dung moi"
[ "$(git rev-parse main)" = "$(git rev-parse origin/main)" ] || die "main phai bat kip origin/main"

# --- pull: lam ca hai buoc mot lan ---
printf '%s\n' "phien ban 3 (cua dong doi)" > "$cua_dong_doi/app.js"
git -C "$cua_dong_doi" commit -qam "feat: dong doi sua tiep"
git -C "$cua_dong_doi" push -q origin main

git pull -q origin main >/dev/null 2>&1
[ "$(cat app.js)" = "phien ban 3 (cua dong doi)" ] || die "pull phai lay ve va nhap luon"

# --- fetch --all va fetch --prune ---
# Dong doi tao roi xoa mot nhanh tren server.
git -C "$cua_dong_doi" checkout -q -b thu-nghiem
git -C "$cua_dong_doi" push -q origin thu-nghiem
git fetch -q origin
git rev-parse --verify -q origin/thu-nghiem >/dev/null || die "phai thay nhanh moi sau fetch"

git -C "$cua_dong_doi" push -q origin --delete thu-nghiem

# Fetch thuong KHONG don cac nhanh remote-tracking da bi xoa tren server -- chung nam lai
# lam ban tuong nhanh do con song. Day la ly do `git branch -r` cua repo lau ngay day nhanh ma.
git fetch -q origin
git rev-parse --verify -q origin/thu-nghiem >/dev/null \
  || die "fetch thuong dang le van giu nhanh remote-tracking da chet"

git fetch -q --prune origin
git rev-parse --verify -q origin/thu-nghiem >/dev/null \
  && die "--prune phai don nhanh remote-tracking da bi xoa tren server"

echo "OK"
