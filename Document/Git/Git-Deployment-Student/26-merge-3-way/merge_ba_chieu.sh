#!/usr/bin/env bash
# Cau hoi that su cua merge khong phai "hai file khac nhau cho nao" ma la "moi ben da DOI GI
# so voi diem xuat phat chung". Git tim diem chung do (merge base) roi so ba chieu -- do la ly do
# no tu gop duoc hai nguoi sua cung mot file ma khong hoi gi.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

cd "$(new_sandbox_repo)"

# --- Diem xuat phat chung ---
commit_file cau-hinh.js "const host = 'localhost'
const port = 3000
const debug = false" "feat: them cau hinh"
diem_chung="$(git rev-parse HEAD)"

# --- Hai nguoi sua cung mot file, o hai cho khac nhau ---
git checkout -q -b doi-host
sed -i "s/'localhost'/'api.congty.vn'/" cau-hinh.js
git commit -qam "feat: tro sang server that"

git checkout -q main
sed -i "s/debug = false/debug = true/" cau-hinh.js
git commit -qam "feat: bat debug"

# Git tim ra diem xuat phat chung cua hai nhanh.
[ "$(git merge-base main doi-host)" = "$diem_chung" ] || die "merge-base phai la commit goc"

# --- Merge: git tu gop duoc, khong conflict ---
git merge -q doi-host -m "merge: gop doi-host vao main" >/dev/null

# Ca hai thay doi deu co mat. Day moi la diem chinh: git khong chon ben nao,
# no lay CA HAI vi moi ben chi doi mot cho ma ben kia khong dong den.
grep -q "api.congty.vn" cau-hinh.js || die "thay doi cua nhanh doi-host phai duoc giu"
grep -q "debug = true"  cau-hinh.js || die "thay doi cua main phai duoc giu"

# Commit merge co dung hai cha.
[ "$(git rev-parse HEAD^1)" != "$(git rev-parse HEAD^2)" ] || die "commit merge phai co hai cha"

# --- Vi sao goi la "ba chieu": so sanh dien ra tren BA ban ---
# Voi tung dong, git nhin ba ban: o base, o ben ta, o ben kia. Quy tac don gian:
#   - chi mot ben doi so voi base  -> lay ben do
#   - ca hai ben doi giong nhau    -> lay (khong phai conflict)
#   - ca hai ben doi khac nhau     -> conflict, git khong doan
#
# Chung minh truong hop hai: hai nhanh sua GIONG HET nhau thi khong conflict.
git checkout -q -b sua-giong-a "$diem_chung"
sed -i "s/port = 3000/port = 8080/" cau-hinh.js
git commit -qam "chore: doi port sang 8080"

git checkout -q -b sua-giong-b "$diem_chung"
sed -i "s/port = 3000/port = 8080/" cau-hinh.js
git commit -qam "chore: cung doi port sang 8080"

git merge -q sua-giong-a -m "merge: hai ben sua giong nhau" >/dev/null
grep -q "port = 8080" cau-hinh.js || die "hai ben sua giong nhau thi phai gop duoc"

# --- Truong hop ba: cung mot dong, hai ben sua khac nhau -> conflict ---
git checkout -q -b sua-khac-a "$diem_chung"
sed -i "s/port = 3000/port = 8080/" cau-hinh.js
git commit -qam "chore: port 8080"

git checkout -q -b sua-khac-b "$diem_chung"
sed -i "s/port = 3000/port = 9090/" cau-hinh.js
git commit -qam "chore: port 9090"

if git merge -q sua-khac-a -m "merge: se conflict" >/dev/null 2>&1; then
  die "hai ben sua cung mot dong khac nhau thi phai conflict"
fi
git merge --abort

# --- Diem chung KHONG phai la "commit dau tien" ---
# Merge lan hai giua hai nhanh da tung merge se co diem chung moi -- chinh la commit merge
# lan truoc. Nho vay git khong bat ban giai lai nhung conflict da giai roi.
git checkout -q main
diem_chung_moi="$(git merge-base main doi-host)"
[ "$diem_chung_moi" != "$diem_chung" ] || die "sau khi merge, diem chung phai da tien len"
git merge-base --is-ancestor doi-host main || die "doi-host gio phai nam trong lich su main"

echo "OK"
