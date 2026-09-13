#!/usr/bin/env bash
# "PR nen nho" la loi khuyen ai cung nghe, va ai cung bo qua. Bai nay do kich thuoc PR bang so
# that, va quan trong hon: dung mot ham cham de biet PR dang o nguong nao, roi tach mot PR to
# thanh chuoi PR nho ma van chay duoc tung buoc.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

# ============ Phan 1: cham kich thuoc PR (logic thuan) ============
# Nguong duoi day khong phai luat tu nhien -- no den tu quan sat lap di lap lai: kha nang phat
# hien loi cua reviewer tut manh khi diff vuot vai tram dong, va gan nhu bang khong khi qua ngan.
# Con so 400 duoc nhieu doi ngu dung lam moc "phai tach".
cham_kich_thuoc() {
  local so_dong="$1"
  if   [ "$so_dong" -le 100 ]; then echo "de review"
  elif [ "$so_dong" -le 400 ]; then echo "chap nhan duoc"
  else                              echo "nen tach"
  fi
}

[ "$(cham_kich_thuoc 40)"   = "de review" ]      || die "40 dong phai la de review"
[ "$(cham_kich_thuoc 100)"  = "de review" ]      || die "dung 100 van la de review"
[ "$(cham_kich_thuoc 101)"  = "chap nhan duoc" ] || die "101 dong da sang muc hai"
[ "$(cham_kich_thuoc 400)"  = "chap nhan duoc" ] || die "dung 400 van chap nhan duoc"
[ "$(cham_kich_thuoc 1200)" = "nen tach" ]       || die "1200 dong phai la nen tach"

# ============ Phan 2: do PR that ============
cd "$(new_sandbox_repo)"
commit_file app.js "khoi dau" "feat: khoi tao"
goc="$(git rev-parse HEAD)"

# Mot PR to: doi ten bien khap noi + them tinh nang + them tai lieu, tron lam mot.
git checkout -q -b feat/lam-tat-ca
{ for i in $(seq 1 300); do echo "const bien_moi_$i = $i"; done; } > cau-hinh.js
git add cau-hinh.js && git commit -q -m "refactor: doi ten bien hang loat"
{ for i in $(seq 1 120); do echo "function tinhNang$i() {}"; done; } > tinh-nang.js
git add tinh-nang.js && git commit -q -m "feat: them tinh nang moi"
{ for i in $(seq 1 80); do echo "# Muc $i"; done; } > TAI-LIEU.md
git add TAI-LIEU.md && git commit -q -m "docs: viet tai lieu"

# Do dung nhu giao dien PR do: BA cham, tinh tu diem tach nhanh (bai 43).
do_pr() {
  local nhanh="$1" them bot
  read -r them bot < <(git diff --numstat "main...$nhanh" | awk '{t+=$1; b+=$2} END {print t, b}')
  echo $(( them + bot ))
}

to="$(do_pr feat/lam-tat-ca)"
[ "$to" -gt 400 ] || die "PR nay dang le phai tren 400 dong, dem duoc $to"
[ "$(cham_kich_thuoc "$to")" = "nen tach" ] || die "PR nay phai bi cham la nen tach"

# --- Tach thanh ba PR doc lap, moi cai mot muc dich ---
# Diem chinh khong phai chia cho du nho, ma la moi PR **tu no da hoan chinh** va merge duoc
# rieng le. Thu tu o day co chu dich: refactor truoc, tinh nang sau, tai lieu cuoi.
git checkout -q -b feat/1-doi-ten "$goc"
{ for i in $(seq 1 300); do echo "const bien_moi_$i = $i"; done; } > cau-hinh.js
git add cau-hinh.js && git commit -q -m "refactor: doi ten bien hang loat"

git checkout -q -b feat/2-tinh-nang feat/1-doi-ten
{ for i in $(seq 1 120); do echo "function tinhNang$i() {}"; done; } > tinh-nang.js
git add tinh-nang.js && git commit -q -m "feat: them tinh nang moi"

git checkout -q -b feat/3-tai-lieu feat/2-tinh-nang
{ for i in $(seq 1 80); do echo "# Muc $i"; done; } > TAI-LIEU.md
git add TAI-LIEU.md && git commit -q -m "docs: viet tai lieu"

# PR dau tien do so voi main. Hai PR sau do so voi PR truoc no (PR xep chong).
do_pr_chong() {
  local nen="$1" nhanh="$2" them bot
  read -r them bot < <(git diff --numstat "$nen...$nhanh" | awk '{t+=$1; b+=$2} END {print t, b}')
  echo $(( them + bot ))
}

pr1="$(do_pr feat/1-doi-ten)"
pr2="$(do_pr_chong feat/1-doi-ten feat/2-tinh-nang)"
pr3="$(do_pr_chong feat/2-tinh-nang feat/3-tai-lieu)"

[ "$pr1" = "300" ] || die "PR 1 phai la 300 dong, dem duoc $pr1"
[ "$pr2" = "120" ] || die "PR 2 phai la 120 dong, dem duoc $pr2"
[ "$pr3" = "80" ]  || die "PR 3 phai la 80 dong, dem duoc $pr3"

# Tong khong doi -- tach PR khong lam it viec di, chi lam moi lan doc it di.
[ "$(( pr1 + pr2 + pr3 ))" = "$to" ] || die "tong ba PR phai bang PR to ban dau"

# Va gio khong PR nao bi cham "nen tach".
for n in "$pr1" "$pr2" "$pr3"; do
  [ "$(cham_kich_thuoc "$n")" != "nen tach" ] || die "PR $n dong van con qua to"
done

# --- Loai tru file sinh tu dong khi do ---
# Lockfile, file build, snapshot lam con so phong len va khong ai review chung.
# `:(exclude)` cho phep bo chung ra khi do:
git checkout -q feat/3-tai-lieu
{ for i in $(seq 1 5000); do echo "\"goi-$i\": \"1.0.0\","; done; } > package-lock.json
git add package-lock.json && git commit -q -m "chore: cap nhat lockfile"

ca_lockfile="$(do_pr feat/3-tai-lieu)"
khong_lockfile="$(git diff --numstat 'main...feat/3-tai-lieu' -- . ':(exclude)package-lock.json' \
  | awk '{t+=$1+$2} END {print t}')"
[ "$ca_lockfile" -gt 5000 ] || die "co lockfile thi con so phai phong len"
[ "$khong_lockfile" = "$to" ] || die "bo lockfile ra thi phai tro lai dung con so cu"

echo "OK"
