#!/usr/bin/env bash
# Remote chi la mot cai TEN gan voi mot URL, luu trong .git/config. Hieu vay thi doi tu HTTPS
# sang SSH, tro sang server khac, hay lam viec voi nhieu remote deu tro thanh sua mot dong chu.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

may_chu_a="$(new_bare_remote)"
may_chu_b="$(new_bare_remote)"

cd "$(new_sandbox_repo)"
commit_file app.js "phien ban 1" "feat: khoi tao"

# Git CHUAN HOA duong dan cuc bo theo kieu cua tung he dieu hanh (tren Windows, /tmp/x
# duoc ghi lai thanh C:/Users/.../Temp/x). Nen so ca duong dan se sai tuy may -- so ten
# thu muc cuoi thi on dinh o moi noi.
tro_toi() {
  local mong_doi="$1"; shift
  git remote get-url "$@" origin | chua "$(basename "$mong_doi")"
}

# --- Them, doc, doi ten, xoa ---
git remote add origin "$may_chu_a"
[ "$(git remote)" = "origin" ] || die "phai co remote ten origin"
tro_toi "$may_chu_a" || die "URL phai tro vao may chu A"

# Ten "origin" khong he dac biet -- chi la ten mac dinh `git clone` dat cho. Doi duoc:
git remote rename origin may-chu-chinh
[ "$(git remote)" = "may-chu-chinh" ] || die "phai doi duoc ten remote"
git remote rename may-chu-chinh origin

# Tat ca chi nam trong .git/config, khong co gi tren server:
git config --get remote.origin.url | chua "$(basename "$may_chu_a")" || die "config phai ghi URL"

# --- set-url: doi HTTPS sang SSH (viec hay lam nhat) ---
git remote set-url origin "$may_chu_b"
tro_toi "$may_chu_b" || die "set-url phai doi duoc dich"
git remote set-url origin "$may_chu_a"

# Tren du an that:
#   git remote set-url origin git@github.com:congty/du-an.git     # HTTPS -> SSH
# Khong can clone lai, khong mat gi -- commit nam trong .git, khong nam o remote.

# --- URL day va URL keo co the KHAC nhau ---
# Dung khi ban keo tu mot guong nhanh nhung day len may chu chinh.
git remote set-url --push origin "$may_chu_b"
tro_toi "$may_chu_a"        || die "URL keo van phai la A"
tro_toi "$may_chu_b" --push || die "URL day phai la B"

git push -q origin main
git -C "$may_chu_b" rev-parse --verify -q refs/heads/main >/dev/null \
  || die "push phai di den may chu B"
git -C "$may_chu_a" rev-parse --verify -q refs/heads/main >/dev/null \
  && die "may chu A khong duoc nhan gi vi URL day tro sang B"

# `git remote -v` in ca hai dong (fetch va push) chinh la de thay cho lech nay.
[ "$(git remote -v | wc -l)" = "2" ] || die "remote -v phai in 2 dong: fetch va push"
git remote -v | chua 'push' || die "phai co dong danh dau push"

# Bo cau hinh rieng cho push, tro lai dung mot URL.
git remote set-url --delete --push origin "$may_chu_b"
tro_toi "$may_chu_a" --push || die "phai tro lai dung mot URL"

# --- Nhieu remote cung luc ---
git remote add du-phong "$may_chu_b"
[ "$(git remote | sort | tr '\n' ' ')" = "du-phong origin " ] || die "phai co hai remote"

# Moi remote co khong gian ten rieng cho nhanh remote-tracking.
git push -q origin main
git fetch -q --all
git rev-parse --verify -q origin/main   >/dev/null || die "phai co origin/main"
git rev-parse --verify -q du-phong/main >/dev/null || die "phai co du-phong/main"

# Nen hai nhanh cung ten o hai remote khong he dam nhau.
[ "$(git rev-parse origin/main)" = "$(git rev-parse du-phong/main)" ] \
  || die "o day hai ben dang cung noi dung"

# --- Xem chi tiet mot remote ---
# `git remote show` hoi thang server nen no biet ca nhanh nao da chet.
git remote show origin | chua 'main' || die "remote show phai liet ke nhanh"

# --- Xoa remote ---
git remote remove du-phong
[ "$(git remote)" = "origin" ] || die "phai xoa duoc remote"
# Xoa remote KHONG xoa gi tren server, cung khong xoa commit -- chi bo cai ten va cac
# nhanh remote-tracking di kem.
git rev-parse --verify -q du-phong/main >/dev/null && die "nhanh remote-tracking phai bi don theo"
git -C "$may_chu_b" rev-parse --verify -q refs/heads/main >/dev/null \
  || die "du lieu tren may chu B van phai con nguyen"

echo "OK"
