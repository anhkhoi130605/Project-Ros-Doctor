#!/usr/bin/env bash
# Chung minh `git commit --amend` KHONG sua commit cu: no tao mot commit moi va day
# nhanh sang tro vao commit moi do. Commit cu van con nam trong repo, chi la khong con
# duong nao di tu nhanh den no nua.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

cd "$(new_sandbox_repo)"

commit_file api.js "get('/users')" "feat: them endpoint users"
hash_goc="$(git rev-parse HEAD)"
tree_goc="$(git rev-parse HEAD^{tree})"

# --- Truong hop 1: chi sua loi chinh ta trong message ---
git commit -q --amend -m "feat: them endpoint danh sach users"
hash_sau="$(git rev-parse HEAD)"

[ "$hash_goc" != "$hash_sau" ] || die "amend phai cho ra hash khac"

# Noi dung file khong doi -- tree y nguyen. Hash commit doi chi vi message la mot phan
# cua chinh commit object, ma hash duoc tinh tu toan bo noi dung object do.
[ "$(git rev-parse HEAD^{tree})" = "$tree_goc" ] || die "chi sua message thi tree khong duoc doi"

# So commit van la 1. Day la cho de gay nham: amend khong them commit, nhung cung
# khong sua commit cu -- no THAY THE.
[ "$(git rev-list --count HEAD)" = "1" ] || die "amend khong duoc lam tang so commit"

# --- Commit cu con nguyen, van doc duoc bang hash ---
git cat-file -e "$hash_goc" 2>/dev/null || die "commit cu phai van con trong repo"
[ "$(git log -1 --pretty=%s "$hash_goc")" = "feat: them endpoint users" ] \
  || die "commit cu phai giu message cu"

# Nhung khong con nhanh nao voi tay tra duoc den no.
git branch --contains "$hash_goc" 2>/dev/null | chua . \
  && die "khong nhanh nao duoc con chua commit cu"

# Duong ve la reflog -- day la ly do amend nham van cuu duoc.
git reflog | chua "$(git rev-parse --short "$hash_goc")" \
  || die "reflog phai con dau vet cua commit cu"

# --- Truong hop 2: quen mot file, amend de nhet vao commit cuoi ---
printf '%s\n' "get('/users/:id')" >> api.js
printf '%s\n' "module.exports = {}" > index.js
git add api.js index.js
git commit -q --amend --no-edit          # --no-edit = giu nguyen message dang co

[ "$(git rev-list --count HEAD)" = "1" ] || die "van phai la 1 commit"
[ "$(git rev-parse HEAD^{tree})" != "$tree_goc" ] || die "them file thi tree phai doi"
git show --stat --oneline HEAD | chua index.js || die "index.js phai nam trong commit"

# --- Vi sao chi an toan khi CHUA push ---
# Gia lap mot remote da nhan commit cu, roi thu push sau khi amend.
git init -q --bare ../remote.git
git remote add origin ../remote.git
git push -q origin main

hash_da_push="$(git rev-parse HEAD)"
git commit -q --amend -m "feat: endpoint users (sua sau khi da push)"

# Push thuong bi tu choi: lich su tren remote khong con la to tien cua lich su o day.
if git push -q origin main 2>/dev/null; then
  die "push sau amend dang le phai bi tu choi"
fi

# Nguoi khac da pull commit cu ve thi ho dang giu mot commit khong con ton tai o day ->
# do la ly do "chi amend khi chua push". Muon push that thi phai --force-with-lease,
# va phai chac khong ai dang lam viec tren nhanh nay.
git push -q --force-with-lease origin main || die "force-with-lease dang le phai thanh cong"
[ "$(git rev-parse origin/main)" != "$hash_da_push" ] || die "remote phai da nhan lich su moi"

echo "OK"
