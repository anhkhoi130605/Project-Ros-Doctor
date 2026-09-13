#!/usr/bin/env bash
# Dong gop cho du an nguon mo: ban khong co quyen day len repo goc, nen phai fork. Luc do may
# ban co HAI remote, va nham chung la loi kinh dien -- PR mo ra tu nham nhanh, hoac nhanh cua ban
# lac hau ca thang ma khong biet.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

# "upstream" = repo goc cua du an (ban chi doc duoc).
# "origin"   = ban fork cua rieng ban (ban day len duoc).
repo_goc="$(new_bare_remote)"
ban_fork="$(new_bare_remote)"

# Du an goc da co san lich su. Dung new_sandbox_repo roi push, khong clone tu repo bare rong
# (clone repo rong thi git canh bao va tao ra repo chua co nhanh nao).
tac_gia="$(new_sandbox_repo)"
cd "$tac_gia"
git remote add origin "$repo_goc"
commit_file README.md "# Du an nguon mo" "docs: khoi tao du an"
commit_file thu-vien.js "export function chao() {}" "feat: them ham chao"
git push -q -u origin main

# Fork: tren GitHub la mot nut bam, o day la sao chep toan bo repo goc sang mot repo khac.
git push -q "$ban_fork" main:main

# --- May ban: clone tu FORK, roi them upstream tro ve repo goc ---
may_toi="$(sandbox_clone "$ban_fork" "$SANDBOX_ROOT/may-toi" "Nguoi dong gop")"
cd "$may_toi"

git remote add upstream "$repo_goc"

[ "$(git remote | sort | tr '\n' ' ')" = "origin upstream " ] || die "phai co dung hai remote"
git remote get-url origin   | chua "$(basename "$ban_fork")" || die "origin phai tro vao fork"
git remote get-url upstream | chua "$(basename "$repo_goc")" || die "upstream phai tro vao repo goc"

# --- Quy tac: KEO tu upstream, DAY len origin ---
# Nguoc lai la hai loi hay gap: keo tu fork (khong bao gio moi) hoac day len goc (khong co quyen).

# Tac gia day them commit len repo goc trong luc ban lam viec.
cd "$tac_gia"
commit_file thu-vien.js "export function chao() {}
export function tamBiet() {}" "feat: them ham tamBiet"
git push -q origin main
cd "$may_toi"

# Fork cua ban KHONG tu dong cap nhat -- day la dieu nguoi moi hay bat ngo nhat.
git fetch -q origin
[ "$(git rev-list --count origin/main)" = "2" ] || die "fork van dung yen o 2 commit"

# Lay ban moi tu upstream.
git fetch -q upstream
[ "$(git rev-list --count upstream/main)" = "3" ] || die "upstream da co 3 commit"

# --- Dong bo fork: dua main cua ban bang upstream roi day len fork ---
git checkout -q main
git merge -q --ff-only upstream/main || die "main cua ban chua sua gi nen phai ff duoc"
git push -q origin main

[ "$(git rev-list --count origin/main)" = "3" ] || die "fork phai duoc cap nhat"
[ "$(git rev-parse main)" = "$(git rev-parse upstream/main)" ] || die "main phai bang upstream"

# `--ff-only` o day la co y: main cua ban chi nen la ban sao cua upstream, khong bao gio
# commit thang len no. Neu lenh nay that bai tuc la ban da li commit vao main -- va do la luc
# can biet, thay vi de git lang le tao commit merge.

# --- Lam viec: nhanh rieng, tach tu upstream/main ---
git checkout -q -b sua-loi-chinh-ta upstream/main
commit_file README.md "# Du an nguon mo

Huong dan cai dat." "docs: bo sung huong dan cai dat"
git push -q -u origin sua-loi-chinh-ta

# Nhanh nay nam tren FORK, va PR se duoc mo tu day sang repo goc.
[ "$(git rev-parse --abbrev-ref '@{u}')" = "origin/sua-loi-chinh-ta" ] \
  || die "nhanh lam viec phai theo doi fork, khong phai repo goc"
git ls-remote --heads "$repo_goc" sua-loi-chinh-ta | chua . \
  && die "nhanh cua ban khong duoc xuat hien tren repo goc"

# --- Nhanh cua ban lac hau: rebase len upstream moi nhat ---
cd "$tac_gia"
commit_file thu-vien.js "export function chao() {}
export function tamBiet() {}
export function xinChao() {}" "feat: them ham xinChao"
git push -q origin main
cd "$may_toi"

git fetch -q upstream
git rebase -q upstream/main >/dev/null 2>&1 || die "rebase len upstream/main phai chay duoc"
git merge-base --is-ancestor upstream/main HEAD || die "nhanh phai nam tren dinh upstream moi"

# Sau rebase thi lich su cuc bo khac ban da push -> phai force-with-lease (bai 38).
git push -q --force-with-lease origin sua-loi-chinh-ta \
  || die "sau rebase phai day duoc bang --force-with-lease"

# Day la truong hop force-with-lease dung nhat: nhanh PR cua rieng ban tren fork cua rieng ban.
# Khong ai khac dang dung no lam nen.

echo "OK"
