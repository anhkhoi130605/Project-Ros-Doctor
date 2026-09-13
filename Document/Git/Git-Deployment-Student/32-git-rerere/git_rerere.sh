#!/usr/bin/env bash
# rerere = reuse recorded resolution. Git ghi nho cach ban da giai mot conflict, va lan sau gap
# dung conflict do thi tu dien lai. Nghe nho nhung cuu duoc ca buoi khi ban rebase mot nhanh
# song lau, hoac merge main vao nhanh cua minh moi ngay -- nhung conflict do lap lai tung lan.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

cd "$(new_sandbox_repo)"

# Mac dinh rerere tat. Bat cho repo nay (that thi nen bat toan cuc, xem cuoi bai).
git config rerere.enabled true

commit_file api.js "const BASE_URL = 'http://localhost:3000'" "feat: them api"
goc="$(git rev-parse HEAD)"

git checkout -q -b tinh-nang-dai
printf '%s\n' "const BASE_URL = 'https://api.congty.vn'" > api.js
git commit -qam "feat: tro sang domain that"

git checkout -q main
printf '%s\n' "const BASE_URL = process.env.API_URL" > api.js
git commit -qam "feat: doc URL tu bien moi truong"

# --- Lan dau: conflict, ban giai bang tay ---
git merge tinh-nang-dai -m "merge lan 1" >/dev/null 2>&1 && die "dang le phai conflict"

# Git da ghi lai HINH DANG cua conflict nay ngay khi no xay ra.
[ -d .git/rr-cache ] || die "rerere phai tao thu muc rr-cache"

# Giai bang tay: gop y dinh ca hai ben.
printf '%s\n' "const BASE_URL = process.env.API_URL || 'https://api.congty.vn'" > api.js
git add api.js
git commit -q --no-edit >/dev/null 2>&1
ban_giai="$(cat api.js)"

# Luc commit, rerere luu lai CACH GIAI ung voi hinh dang conflict do.
[ -n "$(find .git/rr-cache -name 'postimage' 2>/dev/null)" ] \
  || die "rerere phai luu lai ban da giai (postimage)"

# --- Tinh huong that: phai lam lai chinh merge do ---
# Vi du ban lo merge som, can undo di merge lai; hoac ban rebase nhanh nay len main lan nua;
# hoac merge main vao nhanh cua minh moi ngay. Conflict y het se hien ra lai.
git reset -q --hard HEAD~1        # bo commit merge, quay ve truoc khi merge

git merge tinh-nang-dai -m "merge lan 2" >/dev/null 2>&1 && die "van conflict, nhung se duoc tu dien"

# Lan nay git van bao conflict, NHUNG file da duoc dien san ban giai lan truoc.
grep -q '<<<<<<<' api.js && die "rerere phai tu dien, khong con dau conflict"
[ "$(cat api.js)" = "$ban_giai" ] || die "noi dung phai giong het lan ban tu giai"

# `git rerere remaining` = con file nao ban phai tu giai. Rong nghia la rerere lo het roi.
[ -z "$(git rerere remaining)" ] || die "rerere phai lo het, khong con gi de giai tay"

# --- Diem quan trong: rerere KHONG tu add file ---
# No chi dien noi dung vao file. Index van o trang thai chua giai, va ban van phai `git add`.
# Day la co y: ban giai cu chua chac con dung trong ngu canh moi, nen git bat ban nhin lai.
# Cung vi vay ma hai lenh duoi day cho hai cau tra loi khac nhau, dung nham la hieu sai:
#   git rerere remaining          -> con gi RERERE chua lo duoc          (o day: rong)
#   git diff --diff-filter=U      -> con gi INDEX chua ghi nhan da giai  (o day: van co api.js)
[ -n "$(git diff --name-only --diff-filter=U)" ] || die "index van phai o trang thai chua giai"

git add api.js
git commit -q --no-edit >/dev/null 2>&1
[ "$(cat api.js)" = "$ban_giai" ] || die "ket qua cuoi phai la ban da giai"

# --- Gioi han can biet ---
# 1. rerere khop theo HINH DANG conflict. Doi mot ky tu trong vung conflict la thanh conflict
#    khac, khong khop nua.
git checkout -q -b doi-chut "$goc"
printf '%s\n' "const BASE_URL = 'https://api-v2.congty.vn'" > api.js   # khac lan truoc
git commit -qam "feat: doi sang api-v2"

git checkout -q main
git merge doi-chut -m "merge lan 3" >/dev/null 2>&1 && die "phai conflict"
grep -q '<<<<<<<' api.js || die "conflict khac hinh dang thi rerere khong dien duoc"
git merge --abort

# 2. Bo nho nam trong .git/rr-cache -- cuc bo, khong push duoc, khong clone theo.
[ -d .git/rr-cache ] || die "rr-cache phai nam trong .git"

# 3. Ban giai sai cung duoc nho va duoc dien lai y nguyen o lan sau. Neu li giai sai roi
#    commit, phai xoa ban ghi do di:  git rerere forget <duong-dan-file>
#
# Bat toan cuc mot lan cho moi repo:
#   git config --global rerere.enabled true
[ "$(git config rerere.enabled)" = "true" ] || die "rerere phai dang bat"

echo "OK"
