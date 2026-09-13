#!/usr/bin/env bash
# `git rebase --onto` la cach noi ro BA thu thay vi de git doan: dat len dau, lay tu dau, lay
# cai gi. No giai duoc mot tinh huong ma rebase thuong khong lam noi: nhanh tach nham cho.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

cd "$(new_sandbox_repo)"
commit_file app.js "phien ban 1" "feat: khoi tao"
main_goc="$(git rev-parse HEAD)"

# Tinh huong that: ban can mot thu tu nhanh cua dong doi nen tach nhanh cua minh TU DO,
# thay vi tu main. Sau do nhanh cua ho bi bo, hoac duoc merge theo cach khac.
git checkout -q -b feat/cua-dong-doi
commit_file thu-vien.js "thu vien cua dong doi" "feat: thu vien dung chung"
commit_file thu-vien.js "thu vien cua dong doi
ban nhap 2" "feat: sua thu vien lan 2"
dinh_nhanh_ho="$(git rev-parse HEAD)"

# Ban tach tu day va lam viec cua minh.
git checkout -q -b feat/cua-toi
commit_file cua-toi-1.js "viec cua toi 1" "feat: viec cua toi buoc 1"
commit_file cua-toi-2.js "viec cua toi 2" "feat: viec cua toi buoc 2"

# main di tiep.
git checkout -q main
commit_file khac.js "viec khac" "feat: viec khac tren main"
main_moi="$(git rev-parse HEAD)"
git checkout -q feat/cua-toi

# --- Rebase thuong KHONG giai duoc ---
# `git rebase main` se lay MOI commit tu diem tach chung (main_goc) den HEAD, tuc la keo theo
# ca hai commit cua dong doi.
[ "$(git rev-list --count "$main_goc..HEAD")" = "4" ] \
  || die "tu diem tach chung den HEAD dang co 4 commit (2 cua ho + 2 cua ta)"

# --- rebase --onto: noi ro ba thu ---
#   git rebase --onto <dat-len-dau>  <lay-tu-sau-cai-nay>  <lay-den-day>
#
#   dat len dau        = main (nen moi)
#   lay tu sau cai nay = dinh nhanh cua dong doi  -> nen loai het commit cua ho
#   lay den day        = feat/cua-toi
git rebase -q --onto main "$dinh_nhanh_ho" feat/cua-toi >/dev/null 2>&1 \
  || die "rebase --onto phai chay duoc"

# Chi con hai commit cua ta, nam thang tren dinh main.
[ "$(git rev-list --count main..HEAD)" = "2" ] || die "chi duoc con 2 commit cua ta"
git log --format=%s main..HEAD | chua 'thu vien' && die "khong duoc keo theo commit cua dong doi"
[ "$(git merge-base main HEAD)" = "$main_moi" ] || die "nen moi phai la dinh main"

# File cua dong doi khong con trong thu muc lam viec -- vi commit tao ra no khong con o day.
[ -f thu-vien.js ] && die "file cua dong doi phai bien mat khoi nhanh nay"
[ -f cua-toi-1.js ] && [ -f cua-toi-2.js ] || die "viec cua ta phai con du"

# --- Cong dung thu hai: bo mot commit o GIUA lich su ---
# Tuong duong `rebase -i` + drop, nhung khong can mo todo.
git checkout -q -b thu-bo-giua main
commit_file x.js "x" "feat: X"
commit_file y.js "y" "feat: Y (can bo)"
commit_file z.js "z" "feat: Z"
hash_y="$(git rev-parse HEAD~1)"

# Dat nhung gi SAU Y len thang cha cua Y.
git rebase -q --onto "$hash_y^" "$hash_y" thu-bo-giua >/dev/null 2>&1 \
  || die "rebase --onto de bo commit giua phai chay duoc"

[ "$(git rev-list --count main..HEAD)" = "2" ] || die "phai con 2 commit"
git log --format=%s | chua 'feat: Y' && die "commit Y phai bi bo"
[ -f x.js ] && [ -f z.js ] || die "X va Z phai con"
[ -f y.js ] && die "file cua Y phai bien mat"

# --- Cong dung thu ba: cuu nhanh sau khi nguoi khac viet lai lich su chung (bai 52) ---
# Ban co nhanh tach tu mot nhanh chung, roi nhanh chung do bi rebase. Viec cua ban gio nam
# tren mot nen da chet. Dat lai phan CUA RIENG BAN len nen moi:
git checkout -q -b nhanh-chung main
commit_file chung.js "ban dau" "feat: viec chung"
nen_cu="$(git rev-parse HEAD)"

git checkout -q -b viec-cua-toi
commit_file rieng.js "viec rieng" "feat: viec rieng cua toi"

# Nguoi khac rebase nhanh chung -> commit cu bi thay bang commit khac hash.
git checkout -q nhanh-chung
git commit -q --amend -m "feat: viec chung (da don message)"
nen_moi_cua_chung="$(git rev-parse HEAD)"

git checkout -q viec-cua-toi
git rebase -q --onto nhanh-chung "$nen_cu" viec-cua-toi >/dev/null 2>&1 \
  || die "phai dat lai duoc viec rieng len nen moi"

[ "$(git rev-list --count nhanh-chung..HEAD)" = "1" ] || die "chi con dung commit cua ta"
[ "$(git log -1 --format=%s)" = "feat: viec rieng cua toi" ] || die "phai la commit cua ta"
[ "$(git merge-base nhanh-chung HEAD)" = "$nen_moi_cua_chung" ] || die "nen phai la ban da don"

# Khong bi nhan doi commit chung -- khac han cach pull merge o bai 52.
[ "$(git log --format=%s | grep -c 'viec chung' || true)" = "1" ] \
  || die "commit chung chi duoc xuat hien mot lan"

echo "OK"
