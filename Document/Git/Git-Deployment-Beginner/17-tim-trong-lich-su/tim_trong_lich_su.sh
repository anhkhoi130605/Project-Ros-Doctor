#!/usr/bin/env bash
# "Dong code nay o dau ra?" -- cau hoi hay gap nhat khi vao mot codebase la. `git log --grep`
# tim trong MESSAGE, con `git log -S` tim trong NOI DUNG THAY DOI. Cai thu hai it nguoi biet
# nhung lai la cai giai duoc gan het cac cau hoi kieu do.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

cd "$(new_sandbox_repo)"

# --- Dung mot lich su nho co du thu de tim ---
commit_file auth.js "function login() {}" "feat(auth): them ham login"
commit_file auth.js "function login() {}
const TIMEOUT_MS = 5000" "feat(auth): them timeout cho login"
commit_file cart.js "function addToCart() {}" "feat(cart): them gio hang"

# Commit boi mot nguoi khac, de thu loc theo tac gia.
printf '%s\n' "function addToCart() {}
// da toi uu" > cart.js
git add cart.js
git -c user.name="Lan" -c user.email="lan@team.local" commit -q -m "perf(cart): toi uu gio hang"

# Xoa hang TIMEOUT_MS di -- day la thu ta se truy lai o duoi.
commit_file auth.js "function login() {}" "refactor(auth): bo timeout cung"

# --- --grep : tim trong message commit ---
[ "$(git log --oneline --grep='timeout' | wc -l)" = "2" ] \
  || die "--grep timeout phai ra 2 commit (them va bo)"

# Mac dinh --grep phan biet chu hoa/thuong, them -i neu khong muon vay.
[ "$(git log --oneline --grep='TIMEOUT' | wc -l)" = "0" ] || die "--grep mac dinh phai phan biet hoa thuong"
[ "$(git log --oneline -i --grep='TIMEOUT' | wc -l)" = "2" ] || die "-i --grep phai bo qua hoa thuong"

# Nhieu --grep la HOAC, khong phai VA. Muon VA thi them --all-match.
[ "$(git log --oneline --grep='auth' --grep='cart' | wc -l)" = "5" ] \
  || die "hai --grep phai la dieu kien HOAC"

# --- -S : commit nao lam SO LAN xuat hien cua chuoi nay thay doi ---
# Day la cach truy "dong nay them vao luc nao, va bien mat luc nao".
# Ket qua: dung 2 commit -- mot them TIMEOUT_MS vao, mot bo no di.
[ "$(git log --oneline -S 'TIMEOUT_MS' | wc -l)" = "2" ] \
  || die "-S TIMEOUT_MS phai ra dung 2 commit: luc them va luc bo"

# Khac han --grep: -S khong quan tam message viet gi, no doc chinh phan diff.
# Neu nguoi ta commit voi message "update code" thi --grep vo dung, con -S van tim ra.
git log --oneline -S 'TIMEOUT_MS' --pretty=%s | chua 'bo timeout cung' \
  || die "-S phai tim ra ca commit da xoa chuoi do"

# -G giong -S nhung nhan bieu thuc chinh quy, va bat moi diff co khop -- ke ca khi
# so lan xuat hien khong doi (vd chi doi gia tri 5000 thanh 3000).
[ "$(git log --oneline -G 'TIMEOUT_MS = [0-9]+' | wc -l)" = "2" ] || die "-G phai nhan regex"

# --- Loc theo tac gia va theo file ---
[ "$(git log --oneline --author='Lan' | wc -l)" = "1" ] || die "--author phai ra 1 commit cua Lan"

# Dau -- tach ro "day la duong dan, khong phai ten nhanh". Nen giu thoi quen go no,
# vi neu co nhanh trung ten file thi git khong biet ban muon gi.
[ "$(git log --oneline -- auth.js | wc -l)" = "3" ] || die "log -- auth.js phai ra 3 commit"

# --- Xem chinh xac ai doi dong nao ---
# blame tra loi cau hoi nguoc lai voi log: khong phai "commit nao doi file nay"
# ma la "dong nay den tu commit nao".
git blame --porcelain cart.js | chua 'author Lan' || die "blame phai chi ra dong cua Lan"

# --- Meo thuc te: -S roi xem thang commit do lam gi ---
# Dung -1 cua chinh git thay vi `| head -1`: head thoat som lam git nhan SIGPIPE,
# va voi `set -o pipefail` thi ca duong ong thanh that bai mot cach ngau nhien.
commit_da_bo="$(git log -1 --format=%H -S 'TIMEOUT_MS')"
git show --stat --oneline "$commit_da_bo" | chua auth.js || die "commit tim duoc phai cham auth.js"

echo "OK"
