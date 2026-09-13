#!/usr/bin/env bash
# Pull Request khong phai mot khai niem cua git -- git khong biet PR la gi. No la tinh nang cua
# GitHub/GitLab, va ben duoi chi la mot cau hoi: "lay nhung gi nhanh A co ma nhanh B chua co".
# Bai nay dung lai cau hoi do bang git thuan, va lam ro cho nham lon nhat: hai cham vs ba cham.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

cd "$(new_sandbox_repo)"
commit_file app.js "phien ban 1" "feat: khoi tao"
commit_file doc.md "tai lieu" "docs: them tai lieu"
diem_tach="$(git rev-parse HEAD)"

# Ban tach nhanh va lam viec cua minh.
git checkout -q -b feat/gio-hang
commit_file gio-hang.js "chuc nang gio hang" "feat: them gio hang"
commit_file gio-hang.js "chuc nang gio hang
co them nut xoa" "feat: them nut xoa khoi gio hang"

# Trong luc do main di tiep -- dong doi merge PR khac vao.
git checkout -q main
commit_file thanh-toan.js "chuc nang thanh toan" "feat: them thanh toan cua dong doi"
commit_file app.js "phien ban 2" "refactor: don app cua dong doi"

git checkout -q feat/gio-hang

# --- Cau hoi 1: PR nay gom nhung commit nao? ---
# Dung HAI cham: "co o feat/gio-hang ma khong co o main".
[ "$(git rev-list --count main..feat/gio-hang)" = "2" ] || die "PR phai gom dung 2 commit cua ban"
git log --format=%s main..feat/gio-hang | chua 'them gio hang' || die "phai co commit gio hang"
git log --format=%s main..feat/gio-hang | chua 'thanh toan' && die "khong duoc lan commit cua dong doi"

# --- Cau hoi 2: PR nay doi nhung gi? Day la cho de sai ---
# BA cham: so tu DIEM TACH NHANH den dinh nhanh cua ban.
file_ba_cham="$(git diff --name-only main...feat/gio-hang | sort | tr '\n' ' ')"
[ "$file_ba_cham" = "gio-hang.js " ] || die "diff ba cham chi duoc co file cua ban, dang la: $file_ba_cham"

# HAI cham: so thang dinh main voi dinh nhanh -> lan ca thay doi cua dong doi, dao nguoc dau.
file_hai_cham="$(git diff --name-only main..feat/gio-hang | sort | tr '\n' ' ')"
[ "$file_hai_cham" = "app.js gio-hang.js thanh-toan.js " ] \
  || die "diff hai cham lan ca file cua dong doi, dang la: $file_hai_cham"

# Xem cu the cho dao nguoc: `app.js` bi bao la lui tu "phien ban 2" ve "phien ban 1",
# trong khi ban chua he dong vao file do.
git diff main..feat/gio-hang -- app.js | chua '^-phien ban 2' \
  || die "hai cham bao ban da xoa thay doi cua dong doi"
git diff main...feat/gio-hang -- app.js | chua . \
  && die "ba cham khong duoc bao gi ve app.js vi ban khong dong vao no"

# Ba cham dung diem tach nhanh lam moc, va do chinh la diem tach nhanh:
[ "$(git merge-base main feat/gio-hang)" = "$diem_tach" ] || die "merge-base phai la diem tach"
git diff --name-only "$diem_tach" feat/gio-hang | sort | tr '\n' ' ' | chua 'gio-hang.js' \
  || die "ba cham tuong duong voi diff tu merge-base"

# --- De nho ---
#   git log  main..nhanh    -> commit cua PR   (HAI cham)
#   git diff main...nhanh   -> thay doi cua PR (BA cham)
# Dau cham nguoc nhau giua hai lenh, va do la ly do nhieu nguoi go nham. Giao dien
# GitHub/GitLab luon hien ban BA cham -- nen khi diff tren may khac tren web, gan nhu chac chan
# la ban dang go hai cham.

# --- Cau hoi 3: PR co merge sach khong (cai o dau PR ghi "Able to merge") ---
# `merge-tree --write-tree` thu merge trong bo nho: khong dung den thu muc lam viec, khong tao
# commit, khong de lai gi. Tra ve 0 = sach, khac 0 = co conflict.
git checkout -q main
if git_at_least 2 38; then
  git merge-tree --write-tree main feat/gio-hang >/dev/null 2>&1 \
    || die "PR nay dang le merge sach"

  # Va phai chung minh phep thu tren that su phat hien duoc conflict, khong phai luon tra ve 0.
  git checkout -q -b feat/dung-do main
  commit_file gio-hang.js "ban khac han cua gio hang" "feat: cung sua gio-hang.js"
  git checkout -q main
  # So voi main thi nhanh nay van sach -- main chua he co gio-hang.js. Cho dung do la voi
  # CHINH nhanh kia: hai ben cung them mot file, noi dung khac nhau.
  git merge-tree --write-tree feat/gio-hang feat/dung-do >/dev/null 2>&1 \
    && die "hai nhanh cung them gio-hang.js khac noi dung thi phai bao conflict"
fi

# --- Mo PR that bang gh ---
# Toan bo phan tren khong can mang va khong can tai khoan. Mo PR that thi:
#   gh pr create --base main --head feat/gio-hang --title "..." --body "..."
#   gh pr diff        # xem dung ban BA cham
#   gh pr checks      # trang thai CI

echo "OK"
