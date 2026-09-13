#!/usr/bin/env bash
# `git status` bao "ahead 2, behind 1" so voi cai gi? Vi sao co nhanh go `git push` la chay,
# nhanh khac lai bao "no upstream branch"? Tat ca deu tu MOT thu: nhanh upstream duoc gan cho
# nhanh cuc bo. Bai nay dat, doc, doi va go no ra de thay.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

remote="$(new_bare_remote)"

cd "$(new_sandbox_repo)"
git remote add origin "$remote"
commit_file app.js "phien ban 1" "feat: khoi tao"

# --- Chua co upstream: git khong biet day di dau ---
git rev-parse --abbrev-ref 'main@{u}' >/dev/null 2>&1 \
  && die "nhanh moi chua duoc gan upstream"

# `git push` tran bao loi vi thieu thong tin, khong phai vi mang hong.
git push -q >/dev/null 2>&1 && die "chua co upstream thi push tran phai that bai"

# --- -u (viet tat cua --set-upstream) vua push vua gan ---
git push -q -u origin main

[ "$(git rev-parse --abbrev-ref 'main@{u}')" = "origin/main" ] || die "phai gan duoc upstream"
# Thong tin nay nam trong .git/config, khong phai tren server.
git config --get branch.main.merge | chua 'refs/heads/main' || die "config phai ghi nhanh upstream"
[ "$(git config --get branch.main.remote)" = "origin" ] || die "config phai ghi remote"

# Tu gio `git push` va `git pull` tran deu biet duong.
git push -q || die "co upstream roi thi push tran phai chay"

# --- ahead / behind duoc dem so voi upstream ---
dong_doi="$(sandbox_clone "$remote" "$SANDBOX_ROOT/dong-doi")"
printf '%s\n' "ho sua" > "$dong_doi/ho.js"
git -C "$dong_doi" add ho.js && git -C "$dong_doi" commit -qm "feat: viec cua dong doi"
git -C "$dong_doi" push -q origin main

commit_file toi-1.js "a" "feat: viec cua toi 1"
commit_file toi-2.js "b" "feat: viec cua toi 2"

# Truoc khi fetch, git van dang dung ghi nho cu -> bao ahead 2, behind 0.
# Day la cho hay gay hieu nham: con so nay KHONG phai trang thai that cua server.
doc_ahead_behind() { git rev-list --left-right --count 'main...main@{u}'; }
[ "$(doc_ahead_behind)" = "2	0" ] || die "truoc fetch phai la 2 ahead, 0 behind"

git fetch -q origin
[ "$(doc_ahead_behind)" = "2	1" ] || die "sau fetch phai la 2 ahead, 1 behind"

# `git status -sb` in dong dau dang "## main...origin/main [ahead 2, behind 1]" -- cung so do.
git status -sb | chua 'ahead 2, behind 1' || die "status phai bao dung ahead/behind"

# --- @{u} dung duoc o moi cho nhan mot tham chieu ---
[ "$(git rev-parse 'main@{u}')" = "$(git rev-parse origin/main)" ] || die "@{u} phai bang origin/main"
[ "$(git rev-list --count '@{u}..HEAD')" = "2" ] || die "@{u}..HEAD la nhung gi ban sap push"
[ "$(git rev-list --count 'HEAD..@{u}')" = "1" ] || die "HEAD..@{u} la nhung gi ban sap nhan"

# --- Doi upstream cho mot nhanh da co ---
git checkout -q -b tinh-nang
git push -q origin tinh-nang
git branch --set-upstream-to=origin/tinh-nang tinh-nang >/dev/null
[ "$(git rev-parse --abbrev-ref 'tinh-nang@{u}')" = "origin/tinh-nang" ] || die "phai doi duoc upstream"

# --- Doc tat ca mot luot ---
# `git branch -vv` la lenh de xem nhanh nao dang theo doi nhanh nao.
git branch -vv | chua 'origin/tinh-nang' || die "branch -vv phai hien upstream"

# --- Go upstream ra ---
git branch --unset-upstream tinh-nang
git rev-parse --abbrev-ref 'tinh-nang@{u}' >/dev/null 2>&1 && die "phai go duoc upstream"

# --- Nhanh remote-tracking bi xoa thi upstream tro thanh treo ---
# Xoa nhanh tren server roi prune: config van con tro vao origin/tinh-nang khong ton tai.
git checkout -q main
git push -q origin --delete tinh-nang
git fetch -q --prune origin
git rev-parse --verify -q origin/tinh-nang >/dev/null && die "prune phai don origin/tinh-nang"

# Cach dat mot lan cho do phai go -u moi nhanh:
#   git config --global push.autoSetupRemote true    (git >= 2.37)
# Tu do `git push` tren nhanh moi tu tao nhanh cung ten tren remote va gan upstream luon.
if git_at_least 2 37; then
  git config push.autoSetupRemote true
  git checkout -q -b tinh-nang-2
  commit_file c.js "c" "feat: c"
  git push -q
  [ "$(git rev-parse --abbrev-ref 'tinh-nang-2@{u}')" = "origin/tinh-nang-2" ] \
    || die "autoSetupRemote phai tu gan upstream"
fi

echo "OK"
