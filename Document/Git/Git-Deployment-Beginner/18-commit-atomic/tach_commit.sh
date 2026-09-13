#!/usr/bin/env bash
# Mot commit = mot thay doi mo ta duoc trong mot cau, va revert duoc doc lap.
# Bai nay lam nguoc: co tinh commit gop hai viec khong lien quan roi tach ra -- vi trong
# thuc te ban gap tinh huong "da commit gop roi" nhieu hon la lam dung ngay tu dau.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

cd "$(new_sandbox_repo)"

commit_file gia.js "function tinhGia(x) { return x }" "feat: them tinhGia"
commit_file doc.md "# Tai lieu" "docs: khoi tao tai lieu"

# --- Commit gop: sua mot bug VA them tai lieu, trong cung mot commit ---
printf '%s\n' "function tinhGia(x) { return Math.round(x) }" > gia.js
printf '%s\n' "" "## Cach dung" >> doc.md
git add -A
git commit -q -m "sua gia va them tai lieu"

commit_gop="$(git rev-parse HEAD)"
[ "$(git show --name-only --format= "$commit_gop" | grep -c .)" = "2" ] \
  || die "commit gop phai cham 2 file"

# Van de cua commit nay khong phai tham my:
#  - Muon revert rieng phan sua bug thi khong duoc, revert la mat ca tai lieu.
#  - Reviewer phai doc lan hai loai thay doi trong cung mot diff.
#  - `git log -- doc.md` se lam nguoi sau tuong commit nay lien quan den logic gia.

# --- Tach ra: reset --soft bo commit nhung GIU nguyen thay doi trong index ---
# --soft giu ca index va working tree -> dung cai ta can. (--mixed bo luon index,
# --hard mat ca thay doi. Bai 09 so sanh ba co nay.)
git reset -q --soft HEAD~1

[ "$(git rev-list --count HEAD)" = "2" ] || die "phai lui ve con 2 commit"
[ "$(git diff --staged --name-only | wc -l)" = "2" ] || die "--soft phai giu ca 2 file trong index"

# Bo het khoi index de chon lai tung file (khong cham file tren dia).
git reset -q

git add gia.js
git commit -q -m "fix: lam tron gia truoc khi tra ve"

git add doc.md
git commit -q -m "docs: them phan cach dung"

# --- Kiem chung: bon commit, hai commit cuoi moi cai dung mot file ---
[ "$(git rev-list --count HEAD)" = "4" ] || die "phai co 4 commit"
[ "$(git show --name-only --format= HEAD   | grep -c .)" = "1" ] || die "commit cuoi chi duoc 1 file"
[ "$(git show --name-only --format= HEAD~1 | grep -c .)" = "1" ] || die "commit truoc chi duoc 1 file"

# Noi dung cuoi cung giong y het luc con gop -- tach commit khong lam mat gi.
[ "$(git rev-parse HEAD^{tree})" = "$(git rev-parse "$commit_gop^{tree}")" ] \
  || die "sau khi tach, noi dung file phai y nhu truoc"

# --- Va gio revert rieng duoc phan sua bug ---
# Day la loi ich cu the nhat cua commit atomic: khi phan lam tron hoa ra gay loi tren
# production, ban bo dung no ra trong mot lenh, tai lieu khong bi keo theo.
git revert --no-edit HEAD~1 >/dev/null
grep -q 'Math.round' gia.js && die "revert phai bo phan lam tron"
grep -q 'Cach dung' doc.md   || die "tai lieu phai khong bi anh huong"

# --- Khi hai thay doi nam trong CUNG mot file ---
# Luc nay `git add <file>` khong tach duoc nua vi don vi nho nhat cua no la ca file.
# Lenh can dung la `git add -p`: git dua tung doan (hunk) ra hoi, ban tra loi y/n.
# Binh thuong phai go tay, nhung no doc cau tra loi tu dau vao chuan nen o day bom
# san "y roi n" de chay tu dong duoc, van la dung lenh do chu khong mo phong gi.
{
  echo "const host = 'localhost'"
  for i in $(seq 1 12); do echo "const opt$i = $i"; done
  echo "const port = 3000"
} > cau-hinh.js
git add cau-hinh.js && git commit -q -m "feat: them cau hinh"

sed -i "s/'localhost'/'production.local'/; s/port = 3000/port = 8080/" cau-hinh.js

# 12 dong khong doi o giua la co y: git gop cac thay doi gan nhau vao cung mot hunk
# (mac dinh moi ben lay 3 dong ngu canh). Hai thay doi cach nhau duoi 7 dong se thanh
# MOT hunk, va luc do `add -p` khong con gi de tach -- day la ly do doi khi ban go
# `add -p` ma git chi dua ra dung mot doan om het moi thu.
[ "$(git diff -- cau-hinh.js | grep -c '^@@')" = "2" ] || die "phai co dung 2 hunk de tach"

printf 'y\nn\n' | git add -p cau-hinh.js >/dev/null 2>&1

# Index chi co thay doi cua host; file tren dia co ca hai.
trong_index="$(git show :cau-hinh.js)"
grep -q "production.local" <<< "$trong_index" || die "index phai co thay doi cua host"
grep -q "port = 3000"      <<< "$trong_index" || die "index phai con giu port cu (chua add)"
grep -q "port = 8080" cau-hinh.js             || die "file tren dia phai co thay doi cua port"

git commit -q -m "chore: doi host sang production"

git add cau-hinh.js
git commit -q -m "chore: doi port sang 8080"

[ "$(git log -1 --format=%s)"   = "chore: doi port sang 8080" ]        || die "commit cuoi sai"
[ "$(git log -1 --format=%s HEAD~1)" = "chore: doi host sang production" ] || die "commit truoc sai"

echo "OK"
