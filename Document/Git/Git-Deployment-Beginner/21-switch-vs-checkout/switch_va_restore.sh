#!/usr/bin/env bash
# `git checkout` lam hai viec hoan toan khac nhau: doi nhanh, va lay lai noi dung file.
# Mot trong hai viec do xoa thay doi chua luu ma khong hoi gi. Git 2.23 tach no thanh
# `switch` va `restore` -- bai nay chi ro cho nhap nhang do nam o dau.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

# switch/restore co tu git 2.23 (2019). Bao SKIP ro rang thay vi de git bao loi cu phap la lam.
git_at_least 2 23 || { echo "SKIP: can git >= 2.23 cho switch/restore, dang co $(git --version)"; exit 0; }

cd "$(new_sandbox_repo)"

commit_file app.js "ban da commit" "feat: khoi tao"
git branch tinh-nang

# --- Viec thu nhat cua checkout: doi nhanh ---
git checkout -q tinh-nang
[ "$(git branch --show-current)" = "tinh-nang" ] || die "checkout phai doi sang nhanh tinh-nang"

# switch lam dung viec do, va chi viec do.
git switch -q main
[ "$(git branch --show-current)" = "main" ] || die "switch phai doi ve main"

# --- Viec thu hai cua checkout: ghi de file bang ban trong git ---
printf '%s\n' "dang sua, chua luu" > app.js
git checkout -q -- app.js

# Thay doi vua roi mat sach, khong hoi lai, khong nam trong stash, khong co trong reflog
# (reflog chi theo doi commit, khong theo doi file chua commit). Mat la mat han.
[ "$(cat app.js)" = "ban da commit" ] || die "checkout -- file phai ghi de file bang ban trong git"

# restore lam dung viec do, nhung ten lenh noi ro no dang lam gi.
printf '%s\n' "lai sua nua" > app.js
git restore app.js
[ "$(cat app.js)" = "ban da commit" ] || die "restore phai lay lai ban trong git"

# --- Cho nhap nhang that su: khi ten nhanh trung ten file ---
git branch app.js                      # nhanh ten y het file app.js
printf '%s\n' "dang sua tiep" > app.js

# `git checkout app.js` bay gio nghia la gi? Doi sang nhanh "app.js", hay lay lai file app.js?
# Git chon nhanh, va thay doi trong file khong bi mat -- nhung ban khong the doan truoc
# tu cu phap lenh. Do la ly do phai co hai lenh rieng.
git checkout -q app.js
[ "$(git branch --show-current)" = "app.js" ] || die "checkout uu tien hieu la ten nhanh"
[ "$(cat app.js)" = "dang sua tiep" ] || die "thay doi trong file khong duoc mat o buoc nay"

# Voi hai lenh moi thi khong con gi phai doan:
git switch -q main
git switch -q app.js                   # ro rang la nhanh
[ "$(git branch --show-current)" = "app.js" ] || die "switch phai hieu la nhanh"
git switch -q main

git restore app.js                     # ro rang la file
[ "$(cat app.js)" = "ban da commit" ] || die "restore phai hieu la file"
git branch -D app.js >/dev/null

# --- restore con tach ro dang lay lai vao VUNG nao ---
printf '%s\n' "ban moi" > app.js
git add app.js

# Chi bo khoi index, giu nguyen file tren dia (tuong duong `git reset <file>`).
git restore --staged app.js
[ -z "$(git diff --staged --name-only)" ] || die "--staged phai lam sach index"
[ "$(cat app.js)" = "ban moi" ] || die "--staged khong duoc cham file tren dia"

# Bo ca hai vung.
git restore --staged --worktree app.js
[ "$(cat app.js)" = "ban da commit" ] || die "--staged --worktree phai bo ca hai vung"

# --- Tao nhanh moi: hai cach tuong duong ---
git switch -q -c nhanh-a               # tuong duong `git checkout -b nhanh-a`
[ "$(git branch --show-current)" = "nhanh-a" ] || die "switch -c phai tao va sang nhanh moi"

# switch tu choi khi thay doi chua luu se bi ghi de -- checkout cung vay, nhung switch
# bao loi ro rang hon va co --discard-changes de noi thang y dinh.
git switch -q main

echo "OK"
