#!/usr/bin/env bash
# "Lay ben toi" nghe don gian nhung git co ba cach lam khac han nhau, va hai trong so do
# vut bo cong viec cua nguoi khac ma khong bao gi. Bai nay do ranh gioi giua chung:
#   git checkout --ours <file>   -> lay CA FILE cua ben ta, ke ca doan khong he conflict
#   git merge -X ours            -> chi uu tien ben ta O NHUNG CHO CONFLICT
#   git merge -s ours            -> vut bo hoan toan noi dung ben kia
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

cd "$(new_sandbox_repo)"

# File co HAI doan cach xa nhau: doan tren se conflict, doan duoi thi khong.
{
  echo "const timeout = 1000"
  for i in $(seq 1 12); do echo "// dong dem $i"; done
  echo "const retries = 1"
} > cau-hinh.js
git add cau-hinh.js && git commit -q -m "feat: them cau hinh"
goc="$(git rev-parse HEAD)"

git checkout -q -b ben-kia
sed -i "s/timeout = 1000/timeout = 5000/" cau-hinh.js   # se conflict
sed -i "s/retries = 1/retries = 3/" cau-hinh.js         # KHONG conflict
git commit -qam "feat: tang timeout va so lan thu lai"

git checkout -q main
sed -i "s/timeout = 1000/timeout = 2000/" cau-hinh.js   # se conflict voi ben kia
git commit -qam "feat: tang timeout vua phai"
ben_ta="$(git rev-parse HEAD)"   # main TRUOC khi merge -- ba cach duoi deu xuat phat tu day

# --- Cach 1: checkout --ours <file> -- tho bao nhat ---
git merge ben-kia -m "merge" >/dev/null 2>&1 && die "dang le phai conflict"

git checkout --ours -- cau-hinh.js
git add cau-hinh.js
git commit -q --no-edit

grep -q "timeout = 2000" cau-hinh.js || die "--ours phai giu timeout cua ben ta"

# Va day la cho nguy hiem: retries = 3 cua ben kia BIEN MAT, du no khong he conflict.
# `--ours` lay nguyen ca file cua ben ta, khong phai "giai rieng cho dang tranh chap".
grep -q "retries = 1" cau-hinh.js \
  || die "--ours dang le lay ca file ben ta, ke ca doan khong conflict"

# --- Cach 2: merge -X ours -- chi uu tien o cho conflict ---
git checkout -q -b thu-lai-x "$ben_ta"
git merge -X ours ben-kia -m "merge: uu tien ben ta khi tranh chap" >/dev/null 2>&1 \
  || die "-X ours phai merge duoc, khong dung lai o conflict"

# O cho tranh chap: lay ben ta.
grep -q "timeout = 2000" cau-hinh.js || die "-X ours phai giu timeout cua ben ta"
# O cho khong tranh chap: van lay thay doi cua ben kia -- day la khac biet chinh voi cach 1.
grep -q "retries = 3" cau-hinh.js \
  || die "-X ours phai giu thay doi khong conflict cua ben kia"

# --- Cach 3: merge -s ours -- vut bo hoan toan ben kia ---
# Chu y: -s (strategy) chu khong phai -X (strategy option). Mot chu cai, hai hanh vi khac han.
git checkout -q -b thu-lai-s "$ben_ta"
git merge -s ours ben-kia -m "merge: bo qua noi dung ben kia" >/dev/null 2>&1 \
  || die "-s ours phai merge duoc"

# Noi dung y het truoc khi merge -- khong lay gi cua ben kia, ke ca thu khong conflict.
[ "$(git rev-parse HEAD^{tree})" = "$(git rev-parse "$ben_ta^{tree}")" ] \
  || die "-s ours phai giu nguyen noi dung ben ta"
grep -q "retries = 1" cau-hinh.js || die "-s ours khong duoc lay gi cua ben kia"

# Nhung LICH SU thi van ghi nhan da merge -- commit co hai cha.
[ "$(git log -1 --format=%P | wc -w)" = "2" ] || die "-s ours van tao commit merge hai cha"

# Do la cong dung that cua -s ours: danh dau "nhanh kia da duoc xu ly, dung merge lai nua"
# ma khong lay code cua no. Vi du: mot nhanh hotfix da duoc lam lai bang cach khac tren main.
git merge-base --is-ancestor ben-kia HEAD || die "sau -s ours, ben-kia phai nam trong lich su"

# --- Trong khi dang rebase thi ours/theirs DAO NGUOC ---
# Khi rebase, git phat lai commit cua BAN len tren nhanh kia, nen "ours" la nhanh nen
# (nhanh ban rebase len tren), con "theirs" moi la commit cua ban. Nhieu nguoi chon nham o day.
# Cach an toan la dung ten nhanh thay vi ours/theirs, hoac doc dong >>>>>>> de biet ben nao la ben nao.
git checkout -q -b thu-rebase "$goc"
sed -i "s/timeout = 1000/timeout = 7000/" cau-hinh.js
git commit -qam "feat: timeout 7000"

git rebase main >/dev/null 2>&1 && die "dang le rebase phai dung lai o conflict"
grep -q '^<<<<<<<' cau-hinh.js || die "phai dang o giua conflict cua rebase"

# Doc dau conflict: phan tren la nhanh NEN (main), phan duoi moi la commit cua ta.
sed -n '/^<<<<<<</,/^=======/p' cau-hinh.js | chua "timeout = 2000" \
  || die "trong rebase, phan <<<<<<< la nhanh nen chu khong phai commit cua ta"

git rebase --abort

echo "OK"
