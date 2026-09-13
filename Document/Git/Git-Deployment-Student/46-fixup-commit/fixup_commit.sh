#!/usr/bin/env bash
# Reviewer bao sua ba cho. Ban commit them "sua theo review", "sua theo review 2", "fix typo" --
# va lich su cua PR day nhung commit chi co nghia trong vong doi cua PR do. `--fixup` cho ban
# danh dau "commit nay thuoc ve commit kia", roi mot lenh gop chung vao dung cho.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

cd "$(new_sandbox_repo)"
commit_file app.js "khoi dau" "feat: khoi tao"

git checkout -q -b feat/dang-nhap
commit_file dang-nhap.js "function dangNhap() {}" "feat: them man hinh dang nhap"
hash_dang_nhap="$(git rev-parse HEAD)"
commit_file dang-xuat.js "function dangXuat() {}" "feat: them man hinh dang xuat"
hash_dang_xuat="$(git rev-parse HEAD)"

# --- Reviewer bao: thieu validate o man hinh dang nhap ---
# Cach thong thuong: commit moi voi message vo nghia.
# Cach nay: noi ro no thuoc ve commit nao.
commit_file dang-nhap.js "function dangNhap() {
  if (!email) return
}" "tam"
git commit -q --amend --fixup="$hash_dang_nhap"

# Git tu dat message dang "fixup! <tieu de cua commit goc>".
[ "$(git log -1 --format=%s)" = "fixup! feat: them man hinh dang nhap" ] \
  || die "message fixup phai tro ve commit goc, dang la: $(git log -1 --format=%s)"

# Va mot gop y nua cho commit dang xuat.
commit_file dang-xuat.js "function dangXuat() {
  xoaPhien()
}" "tam"
git commit -q --amend --fixup="$hash_dang_xuat"

[ "$(git rev-list --count main..HEAD)" = "4" ] || die "dang co 4 commit, 2 trong do la fixup"

# --- Day len de reviewer xem tung gop y da duoc xu ly ---
# Diem manh: reviewer nhin thay tung fixup rieng, doi chieu voi gop y cua ho, ma lich su
# cuoi cung van sach. Neu squash ngay thi reviewer phai doc lai ca commit to.

# --- Gop lai: rebase -i --autosquash ---
# --autosquash tu doi thu tu va danh dau `fixup` cho cac commit "fixup!" ung voi commit goc.
# GIT_SEQUENCE_EDITOR=true = "chap nhan ke hoach git da soan san, khong mo editor".
# Do la cach chay rebase -i tu dong; go tay thi git mo editor cho ban xem truoc.
GIT_SEQUENCE_EDITOR=true git rebase -q -i --autosquash main >/dev/null 2>&1 \
  || die "rebase --autosquash phai chay duoc"

# Con dung 2 commit, va khong commit nao con chu "fixup!".
[ "$(git rev-list --count main..HEAD)" = "2" ] || die "sau autosquash phai con 2 commit"
git log --format=%s main..HEAD | chua 'fixup!' && die "khong duoc con commit fixup nao"
git log --format=%s main..HEAD | chua 'tam' && die "khong duoc con message tam"

# Noi dung sua da nam trong dung commit cua no.
git show HEAD~1:dang-nhap.js | chua 'if (!email)' || die "sua phai nam trong commit dang nhap"
git show HEAD:dang-xuat.js   | chua 'xoaPhien'   || die "sua phai nam trong commit dang xuat"

# Va khong lan sang commit kia.
git show HEAD~1:dang-xuat.js >/dev/null 2>&1 && die "commit dang nhap khong duoc chua dang-xuat.js"

# --- squash! khac fixup! o cho nao ---
# fixup! : vut bo message cua commit sua, giu message commit goc.
# squash!: GHEP hai message lai, va mo editor cho ban bien tap.
commit_file dang-nhap.js "function dangNhap() {
  if (!email) return
  ghiLog()
}" "tam"
git commit -q --amend --squash="$(git rev-parse HEAD~1)"
git log -1 --format=%s | chua '^squash!' || die "message phai bat dau bang squash!"

GIT_SEQUENCE_EDITOR=true GIT_EDITOR=true git rebase -q -i --autosquash main >/dev/null 2>&1 \
  || die "autosquash voi squash! phai chay duoc"
[ "$(git rev-list --count main..HEAD)" = "2" ] || die "van phai con 2 commit"

# --- Bat autosquash mac dinh cho do phai nho co ---
git config rebase.autoSquash true
[ "$(git config rebase.autoSquash)" = "true" ] || die "phai bat duoc rebase.autoSquash"
# Tren may cua ban:
#   git config --global rebase.autoSquash true
#   git config --global alias.fix 'commit --fixup'

echo "OK"
