#!/usr/bin/env bash
# Khi ban va dong doi cung day len mot nhanh, `git pull` mac dinh tao mot commit merge
# "Merge branch 'main' of ..." khong mang thong tin gi. `git pull --rebase` cho lich su thang.
# Nhung no VIET LAI commit cua ban, nen phai biet ro minh dang doi gi lay gi.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

remote="$(new_bare_remote)"

cd "$(new_sandbox_repo)"
git remote add origin "$remote"
commit_file app.js "phien ban 1" "feat: khoi tao"
git push -q -u origin main
goc="$(git rev-parse HEAD)"
cua_ban="$PWD"

dong_doi="$(sandbox_clone "$remote" "$SANDBOX_ROOT/dong-doi")"

# Ham dung lai tinh huong "hai ben cung tien len" de thu duoc nhieu cach xu ly.
dung_tinh_huong_re_nhanh() {
  git -C "$cua_ban" reset -q --hard "$goc"
  git -C "$cua_ban" push -q --force origin main
  git -C "$dong_doi" fetch -q origin
  git -C "$dong_doi" reset -q --hard origin/main

  # Dong doi day len truoc.
  printf '%s\n' "dong doi sua" > "$dong_doi/ho.js"
  git -C "$dong_doi" add ho.js
  git -C "$dong_doi" commit -qm "feat: viec cua dong doi"
  git -C "$dong_doi" push -q origin main

  # Ban commit tai cho, chua biet gi.
  cd "$cua_ban"
  commit_file toi.js "toi sua" "feat: viec cua toi"
  return 0
}

# --- Cach 1: pull mac dinh -> sinh commit merge ---
dung_tinh_huong_re_nhanh
git pull -q --no-rebase origin main >/dev/null 2>&1

[ -n "$(git rev-list --merges -1 HEAD)" ] || die "pull mac dinh phai tao commit merge"
git log -1 --format=%s | chua 'Merge' || die "message tu sinh phai la dang Merge..."
# Ca hai file deu co mat -- ket qua dung, chi la lich su co them mot nut khong noi len dieu gi.
[ -f toi.js ] && [ -f ho.js ] || die "phai co ca hai file"

# --- Cach 2: pull --rebase -> lich su thang ---
dung_tinh_huong_re_nhanh
hash_truoc_rebase="$(git rev-parse HEAD)"

git pull -q --rebase origin main >/dev/null 2>&1

[ -z "$(git rev-list --merges HEAD)" ] || die "--rebase khong duoc sinh commit merge nao"
[ -f toi.js ] && [ -f ho.js ] || die "phai co ca hai file"

# Commit cua ban duoc PHAT LAI len tren commit cua dong doi -> noi dung giu nguyen nhung
# hash doi. Day la diem phai hieu: rebase viet lai commit cua ban.
[ "$(git rev-parse HEAD)" != "$hash_truoc_rebase" ] || die "rebase phai cho commit hash moi"
[ "$(git log -1 --format=%s)" = "feat: viec cua toi" ] || die "commit cua ban phai nam tren cung"
[ "$(git log -1 --format=%s HEAD~1)" = "feat: viec cua dong doi" ] \
  || die "commit cua dong doi phai nam duoi"

# Vi commit cua ban CHUA tung duoc push nen viet lai chung khong anh huong den ai.
# Do la ranh gioi an toan cua --rebase: chi viet lai phan lich su rieng cua ban.

# --- Cach 3: --ff-only -> khong tu quyet, bat ban chon ---
dung_tinh_huong_re_nhanh
truoc_ff="$(git rev-parse HEAD)"      # phai lay lai o day: canh vua duoc dung lai nen hash da khac
git pull -q --ff-only origin main >/dev/null 2>&1 && die "da re nhanh thi --ff-only phai that bai"

# Repo khong bi de lai trang thai do dang nao.
[ ! -f .git/MERGE_HEAD ] || die "--ff-only that bai khong duoc de lai merge do dang"
[ "$(git rev-parse HEAD)" = "$truoc_ff" ] || die "HEAD phai giu nguyen sau khi --ff-only tu choi"

# --- Chon mac dinh cho may cua ban ---
# Git tu 2.27 canh bao neu ban chua chon, vi ba kieu tren cho ba lich su khac nhau.
git config pull.rebase true
[ "$(git config pull.rebase)" = "true" ] || die "phai dat duoc pull.rebase"

dung_tinh_huong_re_nhanh
git pull -q origin main >/dev/null 2>&1
[ -z "$(git rev-list --merges HEAD)" ] || die "co config roi thi pull tran phai la rebase"

# Ba lua chon, dat toan cuc mot lan:
#   git config --global pull.rebase true    -> lich su thang (pho bien nhat)
#   git config --global pull.ff only        -> khong tu quyet, bao loi de ban chon
#   git config --global pull.rebase false   -> giu kieu merge cu

echo "OK"
