#!/usr/bin/env bash
# Chien luoc nhanh khong phai chuyen thi hieu -- no quyet dinh doi ngu ban merge bao nhieu lan
# mot ngay va conflict to co nao. Bai nay dung lai hai kieu pho bien tren repo that de thay
# khac biet do bang so, roi cham ten nhanh theo quy uoc.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

# ============ Phan 1: cham ten nhanh (logic thuan) ============
# Quy uoc pho bien: <loai>/<mo-ta-ngan-gach-noi>, chu thuong, khong dau.
LOAI_HOP_LE="feat|fix|hotfix|chore|docs|refactor|test|release"

ten_nhanh_hop_le() {
  local ten="$1"
  # Vai ten dac biet luon duoc chap nhan.
  case "$ten" in
    main|master|develop) return 0 ;;
  esac
  [[ "$ten" =~ ^($LOAI_HOP_LE)/[a-z0-9]+(-[a-z0-9]+)*$ ]]
}

for hop_le in "feat/gio-hang" "fix/crash-khi-dang-nhap" "hotfix/loi-thanh-toan" "main" "release/2-1-0"; do
  ten_nhanh_hop_le "$hop_le" || die "\"$hop_le\" dang le hop le"
done
for sai in "Feature/GioHang" "feat/gio hang" "gio-hang" "feat/" "feat/gio--hang" "banana/x"; do
  ten_nhanh_hop_le "$sai" && die "\"$sai\" dang le KHONG hop le"
done

# ============ Phan 2: hai chien luoc tren repo that ============
remote="$(new_bare_remote)"
cd "$(new_sandbox_repo)"
git remote add origin "$remote"
commit_file app.js "phien ban 1" "feat: khoi tao"
git push -q -u origin main
goc="$(git rev-parse HEAD)"

# Ba nguoi cung lam, moi nguoi mot file rieng -> khong ai conflict voi ai o day.
lam_viec_cua() {
  local ai="$1" nen="$2"
  git checkout -q -b "feat/viec-cua-$ai" "$nen"
  commit_file "$ai.js" "viec cua $ai" "feat: them phan cua $ai"
  git checkout -q main
  return 0
}

# --- Kieu 1: trunk-based -- nhanh song ngan, merge thang vao main nhieu lan trong ngay ---
for ai in an binh chi; do
  lam_viec_cua "$ai" main
  git merge -q --no-ff "feat/viec-cua-$ai" -m "merge: phan cua $ai" >/dev/null
  git push -q origin main
done

[ "$(git rev-list --count main)" = "7" ] || die "3 commit viec + 3 commit merge + 1 goc"
for ai in an binh chi; do
  [ -f "$ai.js" ] || die "$ai.js phai co tren main"
done

# Diem manh do duoc: moi nhanh chi song qua MOT commit cua main, nen diem xuat phat chung
# (bai 26) luon gan -- it co hoi de conflict lon.
[ "$(git rev-list --count "$goc..main")" = "6" ] || die "main da tien 6 commit"

# --- Kieu 2: git-flow -- co them nhanh develop lam vung dem ---
git checkout -q -b develop main
git push -q -u origin develop

for ai in dung em; do
  git checkout -q -b "feat/viec-cua-$ai" develop
  commit_file "$ai.js" "viec cua $ai" "feat: them phan cua $ai"
  git checkout -q develop
  git merge -q --no-ff "feat/viec-cua-$ai" -m "merge: phan cua $ai vao develop" >/dev/null
done

# Tinh nang nam o develop, CHUA co tren main -- main chi nhan khi phat hanh.
[ -f dung.js ] && [ -f em.js ] || die "develop phai co ca hai phan"
git show main:dung.js >/dev/null 2>&1 && die "main chua duoc co dung.js"

# Phat hanh: tach nhanh release, roi merge vao main va gan tag.
git checkout -q -b release/1-1-0 develop
commit_file CHANGELOG.md "## 1.1.0" "docs: ghi changelog cho 1.1.0"
git checkout -q main
git merge -q --no-ff release/1-1-0 -m "release: 1.1.0" >/dev/null
git tag -a v1.1.0 -m "Phien ban 1.1.0"

# Va merge nguoc lai develop de no khong thieu commit cua nhanh release.
git checkout -q develop
git merge -q --no-ff release/1-1-0 -m "merge: dua release 1.1.0 ve develop" >/dev/null

git show main:dung.js >/dev/null 2>&1 || die "sau release thi main moi co"
[ "$(git tag)" = "v1.1.0" ] || die "phai co tag phien ban"

# --- So sanh bang so: mot tinh nang di qua may buoc merge de len duoc main ---
# Dem tong so commit merge tren mot nhanh la khong noi len gi (main sau release da nuot ca
# lich su develop nen hai ben ra cung mot con so). Cai do duoc la QUANG DUONG cua mot tinh nang.
#
#   trunk-based: feat/viec-cua-an  --(1 merge)-->  main
#   git-flow   : feat/viec-cua-dung --(1)--> develop --(2)--> release --(3)--> main
duong_di() {   # so commit merge tren duong tu commit dau tien cua nhanh den dich
  git rev-list --merges --count "$1..$2"
}
buoc_trunk="$(duong_di "$goc" "$(git rev-parse feat/viec-cua-an)")"
[ "$buoc_trunk" = "0" ] || die "nhanh tinh nang cua trunk-based khong di qua merge nao truoc khi vao main"

# Tinh nang dung.js: tu luc tach khoi develop den luc nam tren main da qua 3 commit merge.
buoc_flow="$(git rev-list --merges --count "feat/viec-cua-dung..main")"
[ "$buoc_flow" = "3" ] || die "git-flow: mong doi 3 buoc merge, dem duoc $buoc_flow"

# Ket luan de nho:
#  - trunk-based: it nhanh, nhanh song ngan (duoi 1-2 ngay), merge lien tuc. Can CI tot va
#    feature flag de code chua xong van len main duoc ma khong lo ra cho nguoi dung.
#  - git-flow: nhieu nhanh, hop khi phai ho tro nhieu phien ban cung luc hoac phat hanh
#    theo dot co kiem thu rieng. Doi lai la nhieu buoc merge va nhanh song lau -> conflict to hon.

echo "OK"
