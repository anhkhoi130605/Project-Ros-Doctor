#!/usr/bin/env bash
# Rebase khong "di chuyen" commit. No PHAT LAI tung commit len mot nen khac, tao ra commit MOI
# co cung noi dung nhung khac cha -- nen khac ca hash. Hieu dung mot cau do la het so rebase,
# va cung hieu luon vi sao no nguy hiem voi lich su da chia se (bai 52).
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

cd "$(new_sandbox_repo)"
commit_file app.js "phien ban 1" "feat: khoi tao"
diem_tach="$(git rev-parse HEAD)"

git checkout -q -b feat/gio-hang
commit_file gio-hang.js "gio hang" "feat: them gio hang"
commit_file gio-hang.js "gio hang
co nut xoa" "feat: them nut xoa"
dinh_cu="$(git rev-parse HEAD)"
hash_cu_1="$(git rev-parse HEAD~1)"

# main di tiep trong luc ban lam viec.
git checkout -q main
commit_file thanh-toan.js "thanh toan" "feat: viec cua dong doi"
nen_moi="$(git rev-parse HEAD)"

git checkout -q feat/gio-hang

# --- Truoc rebase: hai nhanh re nhau tu diem_tach ---
[ "$(git merge-base main HEAD)" = "$diem_tach" ] || die "hai nhanh phai re tu diem_tach"

# --- Rebase ---
git rebase -q main >/dev/null 2>&1 || die "rebase phai chay duoc"

# 1. Van dung hai commit cua ban, dung thu tu, dung message.
[ "$(git rev-list --count main..HEAD)" = "2" ] || die "phai con dung 2 commit cua ban"
[ "$(git log -1 --format=%s)" = "feat: them nut xoa" ] || die "commit cuoi phai giu nguyen"
[ "$(git log -1 --format=%s HEAD~1)" = "feat: them gio hang" ] || die "thu tu phai giu nguyen"

# 2. Nhung hash da KHAC -- day la commit moi, khong phai commit cu duoc di chuyen.
[ "$(git rev-parse HEAD)" != "$dinh_cu" ] || die "rebase phai tao commit moi"
[ "$(git rev-parse HEAD~1)" != "$hash_cu_1" ] || die "ca commit dau tien cung doi hash"

# 3. Noi dung file thi y het.
[ "$(git show "HEAD:gio-hang.js")" = "$(git show "$dinh_cu:gio-hang.js")" ] \
  || die "noi dung phai giu nguyen"

# 4. Nen moi la dinh main -- diem tach nhanh gio chinh la commit cua dong doi.
[ "$(git merge-base main HEAD)" = "$nen_moi" ] || die "nen moi phai la dinh main"
git merge-base --is-ancestor "$nen_moi" HEAD || die "commit cua dong doi phai nam duoi commit cua ban"

# 5. Vi sao hash phai doi: hash cua mot commit duoc tinh tu noi dung CONG voi cha cua no.
#    Doi cha thi doi hash, khong co cach nao khac.
[ "$(git log -1 --format=%P HEAD~1)" = "$nen_moi" ] || die "cha cua commit dau tien gio la nen moi"

# --- Commit cu chua bien mat, chi la khong con nhanh nao tro toi ---
git cat-file -e "$dinh_cu" || die "commit cu van con trong repo"
[ -z "$(git branch --contains "$dinh_cu" 2>/dev/null)" ] || die "khong nhanh nao con chua no"

# ORIG_HEAD tro vao vi tri truoc thao tac vua roi -- duong lui nhanh nhat neu rebase sai.
[ "$(git rev-parse ORIG_HEAD)" = "$dinh_cu" ] || die "ORIG_HEAD phai la dinh truoc rebase"

# Lui lai duoc:
git reset -q --hard ORIG_HEAD
[ "$(git rev-parse HEAD)" = "$dinh_cu" ] || die "phai quay lai duoc truoc rebase"
git rebase -q main >/dev/null 2>&1

# --- Loi ich thuc te: merge sau rebase la fast-forward ---
# Vi nhanh cua ban gio nam THANG tren dinh main, khong con gi de gop.
git checkout -q main
git merge -q --ff-only feat/gio-hang || die "sau rebase thi merge phai la fast-forward"
[ -z "$(git rev-list --merges HEAD)" ] || die "khong sinh commit merge nao"
[ "$(git rev-list --count HEAD)" = "4" ] || die "lich su thang: 4 commit"

# --- So voi merge: cung ket qua noi dung, khac lich su ---
git checkout -q -b thu-merge "$nen_moi"
git merge -q --no-ff "$dinh_cu" -m "merge: gop gio hang" >/dev/null

[ "$(git rev-parse main^{tree})" = "$(git rev-parse HEAD^{tree})" ] \
  || die "hai cach cho cung noi dung cuoi cung"
[ -n "$(git rev-list --merges -1 HEAD)" ] || die "ban merge thi co commit merge"
[ "$(git rev-list --count HEAD)" = "5" ] || die "ban merge co them 1 nut merge"

echo "OK"
