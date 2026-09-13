#!/usr/bin/env bash
# Repo lam viec vai thang la `git branch` in ra ba chuc dong, phan lon la nhanh cua PR da merge
# tu doi nao. Nhanh chet khong ton dung luong dang ke, nhung no lam ban khong tim ra nhanh dang
# can, va lam `git branch -a` thanh vo dung. Bai nay phan biet ba loai nhanh chet khac nhau.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

remote="$(new_bare_remote)"
cd "$(new_sandbox_repo)"
git remote add origin "$remote"
commit_file app.js "phien ban 1" "feat: khoi tao"
git push -q -u origin main

# Ba nhanh co day len server...
for ten in da-xong dang-lam se-bi-xoa; do
  git checkout -q -b "feat/$ten" main
  commit_file "$ten.js" "noi dung" "feat: $ten"
  git push -q -u origin "feat/$ten"
  git checkout -q main
done

# ...va mot nhanh CHUA he day len -- de thay -d hanh xu khac han voi hai truong hop.
git checkout -q -b feat/chua-day main
commit_file chua-day.js "noi dung" "feat: chua day len bao gio"
git checkout -q main

git merge -q --no-ff feat/da-xong -m "merge: feat/da-xong" >/dev/null
git push -q origin main

# Gia lap: PR duoc merge tren giao dien web roi NGUOI KHAC xoa nhanh tren server.
# Phai xoa thang trong repo server chu khong dung `git push --delete` o day: lenh do xoa
# nhanh tren server VA don luon ghi nho cuc bo tuong ung, nen se khong con nhanh chet nao
# de ma quan sat. Nhanh chet chi sinh ra khi NGUOI KHAC xoa, may ban chua biet.
git -C "$remote" update-ref -d refs/heads/feat/se-bi-xoa

# ============ Loai 1: nhanh CUC BO da duoc merge vao main ============
# `--merged main` liet ke nhanh ma toan bo commit cua no da nam trong main -> xoa la an toan.
# `|| true` o day la can: `grep -v` tra ve 1 khi loc xong khong con dong nao (truong hop
# chua co nhanh nao merge), va duoi `set -e` thi do se giet script du day khong phai loi.
da_merge="$(git branch --merged main --format='%(refname:short)' | grep -v '^main$' || true)"
chua 'feat/da-xong' <<< "$da_merge" || die "feat/da-xong phai duoc liet ke la da merge"
chua 'feat/dang-lam' <<< "$da_merge" && die "feat/dang-lam chua merge, khong duoc liet ke"

# Xoa bang -d (chu thuong): git TU CHOI neu nhanh chua duoc merge. Do la luoi bao ve --
# dung -D (chu hoa) cho nhanh, hang loat la mat viec that.
git branch -d feat/da-xong >/dev/null
git show-ref --verify -q refs/heads/feat/da-xong && die "phai xoa duoc nhanh da merge"

# Nhanh chua day len va chua merge vao dau: -d tu choi.
git branch -d feat/chua-day >/dev/null 2>&1 && die "git phai tu choi xoa nhanh chua merge"
git show-ref --verify -q refs/heads/feat/chua-day || die "nhanh chua merge phai con nguyen"

# --- Cai bay: -d CUNG chap nhan xoa nhanh chua vao main, mien la da khop upstream ---
# feat/dang-lam chua he duoc merge vao main. Nhung no da duoc push, va nhanh cuc bo dang
# bang dung origin/feat/dang-lam. Voi git the la "an toan": ban khong mat gi vi ban sao
# van nam tren server. Nen lenh duoi day THANH CONG, khac han truong hop feat/chua-day.
git merge-base --is-ancestor feat/dang-lam main && die "feat/dang-lam dang le chua vao main"
# Git co in mot dong canh bao ("merged to refs/remotes/... but not yet merged to HEAD") --
# day chinh la git noi ro dieu tren. Dap di cho self-check sach, nhung khi go tay thi nen doc.
git branch -d feat/dang-lam >/dev/null 2>&1 || die "-d chap nhan vi nhanh da khop upstream"
git show-ref --verify -q refs/heads/feat/dang-lam && die "nhanh cuc bo da bi xoa"

# Bai hoc: "xoa duoc bang -d" khong dong nghia voi "cong viec da vao main". No chi co nghia
# "git tim thay mot ban sao o cho khac". Muon biet that su da vao main chua thi hoi thang:
#   git branch --merged main
# Lay lai nhanh vua xoa cung de, vi ban tren server con nguyen:
git checkout -q -b feat/dang-lam origin/feat/dang-lam
git checkout -q main

# Don hang loat mot cach an toan: chi lay danh sach tu --merged roi day qua -d.
# Vi -d tu tu choi nhanh chua merge nen ke ca danh sach co nham cung khong mat gi.
git checkout -q -b feat/tam-1 main && git checkout -q main
git checkout -q -b feat/tam-2 main && git checkout -q main
git merge -q --no-ff feat/tam-1 -m "merge: tam-1" >/dev/null
git merge -q --no-ff feat/tam-2 -m "merge: tam-2" >/dev/null

git branch --merged main --format='%(refname:short)' \
  | grep -v '^main$' \
  | xargs -r git branch -d >/dev/null

git show-ref --verify -q refs/heads/feat/tam-1 && die "tam-1 phai bi don"
git show-ref --verify -q refs/heads/feat/dang-lam || die "nhanh chua merge van phai con"

# ============ Loai 2: nhanh REMOTE-TRACKING tro vao thu da bi xoa tren server ============
# Tach bach: day KHONG phai nhanh cua ban, ma la ghi nho cuc bo ve nhanh cua server (bai 34).
git rev-parse --verify -q origin/feat/se-bi-xoa >/dev/null \
  || die "truoc khi prune, ghi nho cu van con"

git fetch -q --prune origin
git rev-parse --verify -q origin/feat/se-bi-xoa >/dev/null \
  && die "prune phai don ghi nho ve nhanh da bi xoa tren server"

# Nhanh cuc bo cung ten (neu co) KHONG bi prune dung den -- prune chi cham refs/remotes/.
git show-ref --verify -q refs/heads/feat/se-bi-xoa || die "nhanh cuc bo phai con nguyen"

# Va no gio thanh nhanh mo coi: co upstream tro vao mot cho khong con ton tai.
git rev-parse --abbrev-ref 'feat/se-bi-xoa@{u}' >/dev/null 2>&1 \
  && die "upstream cua no dang le da tro thanh treo"

# ============ Loai 3: nhanh tren SERVER khong ai dung nua ============
# Chi xoa duoc bang lenh gui len server, khong phai bang `git branch -d`.
git ls-remote --heads origin 'feat/dang-lam' | chua . || die "nhanh nay van con tren server"
git push -q origin --delete feat/dang-lam
git ls-remote --heads origin 'feat/dang-lam' | chua . && die "phai xoa duoc nhanh tren server"

# --- Bat prune tu dong cho do phai nho ---
git config fetch.prune true
[ "$(git config fetch.prune)" = "true" ] || die "phai bat duoc fetch.prune"

# Tu gio moi lan fetch/pull deu tu don ghi nho ve nhanh da chet:
#   git config --global fetch.prune true

# --- Tom tat ba lenh cho ba loai ---
#   git branch -d <ten>                 -> nhanh cuc bo da merge (tu choi neu chua merge)
#   git fetch --prune                   -> ghi nho cuc bo ve nhanh server da bi xoa
#   git push origin --delete <ten>      -> nhanh tren server

echo "OK"
