#!/usr/bin/env bash
# "! [rejected] main -> main (fetch first)" -- loi push pho bien nhat, va cung la loi bi xu ly
# sai nhieu nhat: rat nhieu nguoi go luon `--force` cho xong. Bai nay chi ro git dang bao ve
# dieu gi, va ba cach xu ly dung.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

remote="$(new_bare_remote)"

cd "$(new_sandbox_repo)"
git remote add origin "$remote"
commit_file app.js "phien ban 1" "feat: khoi tao"
git push -q -u origin main
goc="$(git rev-parse HEAD)"
cua_ban="$PWD"

dong_doi="$(sandbox_clone "$remote" "$SANDBOX_ROOT/dong-doi")"

dung_canh() {
  git -C "$cua_ban" reset -q --hard "$goc"
  git -C "$cua_ban" push -q --force origin main
  git -C "$dong_doi" fetch -q origin && git -C "$dong_doi" reset -q --hard origin/main

  printf '%s\n' "dong doi sua" > "$dong_doi/ho.js"
  git -C "$dong_doi" add ho.js && git -C "$dong_doi" commit -qm "feat: viec cua dong doi"
  git -C "$dong_doi" push -q origin main

  cd "$cua_ban"
  git fetch -q origin      # de origin/main cua ta biet co cai moi, nhung main thi chua
  commit_file toi.js "toi sua" "feat: viec cua toi"
  return 0
}

# --- Push bi tu choi ---
dung_canh
loi="$(git push origin main 2>&1)" && die "push dang le phai bi tu choi"

# Doc ky thong bao: git noi ro ly do va goi y dung.
chua 'rejected' <<< "$loi" || die "thong bao phai co chu rejected"
chua 'fetch first\|non-fast-forward\|behind' <<< "$loi" || die "thong bao phai giai thich ly do"

# Ly do that su: commit dang o dinh remote KHONG nam trong lich su cua ban. Neu git nhan push,
# commit cua dong doi se khong con nhanh nao tro toi -- tuc la BIEN MAT khoi lich su chung.
dinh_remote="$(git rev-parse origin/main)"
git merge-base --is-ancestor "$dinh_remote" HEAD \
  && die "neu commit cua dong doi da nam trong lich su cua ta thi da khong bi tu choi"

# Git tu choi de bao ve VIEC CUA NGUOI KHAC, khong phai de lam kho ban.

# --- Cach 1: pull --rebase roi push (lich su thang) ---
git pull -q --rebase origin main >/dev/null 2>&1
git push -q origin main || die "sau rebase thi push phai duoc"

# Ca hai phan viec deu con.
[ -f toi.js ] && [ -f ho.js ] || die "khong duoc mat viec cua ai"
[ -z "$(git rev-list --merges HEAD)" ] || die "cach nay cho lich su thang"

# --- Cach 2: pull (merge) roi push ---
dung_canh
git pull -q --no-rebase origin main >/dev/null 2>&1
git push -q origin main || die "sau merge thi push phai duoc"
[ -f toi.js ] && [ -f ho.js ] || die "khong duoc mat viec cua ai"
[ -n "$(git rev-list --merges -1 HEAD)" ] || die "cach nay de lai commit merge"

# --- Cach 3 (SAI): --force ---
# Xem chinh xac no lam gi de khong bao gio go nham.
dung_canh
commit_cua_ho="$(git rev-parse origin/main)"

git push -q --force origin main || die "force thi push duoc, do moi la van de"

# Commit cua dong doi khong con nam tren nhanh main cua server nua.
git -C "$remote" merge-base --is-ancestor "$commit_cua_ho" refs/heads/main 2>/dev/null \
  && die "force dang le da day commit cua dong doi ra khoi lich su"

# Va file cua ho bien mat khoi ban lam viec cua bat ky ai clone moi.
moi="$(sandbox_clone "$remote" "$SANDBOX_ROOT/clone-moi")"
[ -f "$moi/toi.js" ] || die "viec cua ta thi con"
[ -f "$moi/ho.js" ] && die "viec cua dong doi da mat khoi repo chung"

# Dong doi van con commit do tren may ho, nhung lan push tiep theo cua ho lai bi tu choi,
# va ho phai tu di giai thich vi sao lich su chung tu nhien thieu mat mot mang.

# --- Khi that su phai ghi de: dung --force-with-lease, khong dung --force ---
# Bai 38 di sau vao cho nay.

echo "OK"
