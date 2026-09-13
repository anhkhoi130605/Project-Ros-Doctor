#!/usr/bin/env bash
# Reviewer khong nen la nguoi phat hien ban quen xoa console.log, con commit "wip", hay nhanh
# da lac hau ba ngay. Bai nay viet mot cong tu kiem tra chay truoc khi mo PR -- kieu cua no la
# `predeploy_check.sh` (bai 56) nhung cho giai doan som hon.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

# ---- Logic thuan: cham mot nhanh da san sang mo PR chua ----
# $1 nhanh_nen  $2 nhanh_pr
# In ra tung ly do chan; tra 0 = san sang.
kiem_tra_truoc_pr() {
  local nen="$1" pr="$2" van_de=0

  # 1. Con thay doi chua commit -> diff cua PR se thieu.
  if [ -n "$(git status --porcelain)" ]; then
    echo "Chan: con thay doi chua commit"
    van_de=1
  fi

  # 2. Commit tam: wip / fixup! / squash! con sot lai.
  local tam
  tam="$(git log --format=%s "$nen..$pr" | grep -ciE '^(wip|fixup!|squash!)' || true)"
  if [ "$tam" != "0" ]; then
    echo "Chan: con $tam commit tam (wip/fixup!/squash!) -- chay rebase -i --autosquash"
    van_de=1
  fi

  # 3. Nhanh lac hau so voi nen -> reviewer se thay ca thay doi cua nguoi khac.
  local sau
  sau="$(git rev-list --count "$pr..$nen")"
  if [ "$sau" != "0" ]; then
    echo "Chan: nhanh dang sau $nen $sau commit -- rebase hoac merge $nen vao truoc"
    van_de=1
  fi

  # 4. PR rong.
  if [ "$(git rev-list --count "$nen..$pr")" = "0" ]; then
    echo "Chan: nhanh khong co commit nao khac $nen"
    van_de=1
  fi

  return "$van_de"
}

# Ghi chu ve `|| true` xuat hien nhieu lan ben duoi: ham tren CO Y tra ve khac 0 khi no chan,
# va `grep -c` cung tra ve khac 0 khi dem duoc 0. Ca hai deu la ket qua binh thuong chu khong
# phai loi, nen phai chan `set -e` lai de con doc duoc noi dung ma chung in ra.
cd "$(new_sandbox_repo)"
commit_file app.js "phien ban 1" "feat: khoi tao"

# --- Truong hop 1: nhanh sach, san sang ---
git checkout -q -b feat/tot
commit_file tot.js "noi dung" "feat: them tinh nang tot"
kiem_tra_truoc_pr main feat/tot >/dev/null || die "nhanh sach phai duoc cho qua"

# --- Truong hop 2: con thay doi chua commit ---
printf '%s\n' "dang sua do" > tot.js
ly_do="$(kiem_tra_truoc_pr main feat/tot || true)"
chua 'chua commit' <<< "$ly_do" || die "phai chan vi con thay doi chua commit"
git checkout -q -- tot.js

# --- Truong hop 3: con commit tam ---
commit_file tam.js "x" "wip: dang lam do"
ly_do="$(kiem_tra_truoc_pr main feat/tot || true)"
chua 'commit tam' <<< "$ly_do" || die "phai chan vi con commit wip"

git reset -q --hard HEAD~1

# --- Truong hop 4: nhanh lac hau ---
git checkout -q main
commit_file khac.js "viec cua dong doi" "feat: dong doi day len"
git checkout -q feat/tot

ly_do="$(kiem_tra_truoc_pr main feat/tot || true)"
chua 'dang sau' <<< "$ly_do" || die "phai chan vi nhanh lac hau"

# Sua bang cach rebase len main moi nhat.
git rebase -q main >/dev/null 2>&1 || die "rebase phai chay duoc"
kiem_tra_truoc_pr main feat/tot >/dev/null || die "sau rebase phai duoc cho qua"

# --- Truong hop 5: PR rong ---
git checkout -q -b feat/rong main
ly_do="$(kiem_tra_truoc_pr main feat/rong || true)"
chua 'khong co commit nao' <<< "$ly_do" || die "phai chan vi PR rong"

# --- Truong hop 6: nhieu van de cung luc -> bao HET, khong dung o cai dau tien ---
# Day la khac biet quan trong so voi kieu chan roi thoat ngay: nguoi dung sua mot lan
# thay vi chay lai bon lan de lo dan tung loi.
git checkout -q -b feat/nhieu-loi main
commit_file a.js "x" "wip: chua xong"
printf '%s\n' "chua commit" > b.js
git checkout -q main && commit_file c.js "y" "feat: main di tiep" && git checkout -q feat/nhieu-loi

ly_do="$(kiem_tra_truoc_pr main feat/nhieu-loi || true)"
so_ly_do="$(printf '%s\n' "$ly_do" | grep -c '^Chan:' || true)"
[ "$so_ly_do" = "3" ] || die "phai bao du 3 van de mot luc, dem duoc $so_ly_do"

# --- Danh sach kiem tra day du truoc khi bam "Create pull request" ---
#  1. `git status` sach.
#  2. Khong con commit wip/fixup!/squash! -- `git rebase -i --autosquash main` (bai 46).
#  3. Da rebase len nen moi nhat -- `git fetch && git rebase origin/main`.
#  4. Tu doc lai diff cua CHINH minh: `git diff main...HEAD` (ba cham, bai 43).
#  5. Kich thuoc hop ly -- neu tren 400 dong thi tach (bai 44).
#  6. Test chay xanh o may minh truoc khi de CI phat hien.
#  7. Mo ta PR noi VI SAO, va cach kiem thu thu cong neu can.

echo "OK"
