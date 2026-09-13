#!/usr/bin/env bash
# `git mergetool` mo mot cong cu ba khung (ben ta / goc / ben kia) de giai conflict truc quan.
# No can giao dien do hoa nen khong the chay trong self-check. Nhung phan CO CHE ben duoi thi
# kiem chung duoc het -- va do moi la phan can hieu: mergetool khong lam gi ma ban khong lam duoc.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

cd "$(new_sandbox_repo)"

commit_file don-hang.js "function tinhTong(items) {
  return items.reduce((a, b) => a + b.gia, 0)
}" "feat: them tinhTong"

git checkout -q -b them-thue
printf '%s\n' "function tinhTong(items) {" \
  "  const tong = items.reduce((a, b) => a + b.gia, 0)" \
  "  return tong * 1.1" "}" > don-hang.js
git commit -qam "feat: cong thue vao tong"

git checkout -q main
printf '%s\n' "function tinhTong(items) {" \
  "  const tong = items.reduce((a, b) => a + b.gia, 0)" \
  "  return Math.round(tong)" "}" > don-hang.js
git commit -qam "fix: lam tron tong tien"

git merge them-thue -m "merge" >/dev/null 2>&1 && die "dang le phai conflict"

# --- mergetool lay du lieu tu dau ---
# Khong co gi bi an: no doc dung ba stage trong index (bai 27) va do ra ba file tam.
[ "$(git ls-files -u don-hang.js | wc -l)" = "3" ] || die "phai co du ba stage"

# Ba khung tren man hinh chinh la ba lenh nay:
ban_goc="$(git show :1:don-hang.js)"     # khung giua: BASE
ban_ta="$(git show :2:don-hang.js)"      # khung trai: LOCAL / ours
ban_kia="$(git show :3:don-hang.js)"     # khung phai: REMOTE / theirs

grep -q "reduce" <<< "$ban_goc"     || die "stage 1 phai la ban goc"
grep -q "Math.round" <<< "$ban_ta"  || die "stage 2 phai la ban cua main"
grep -q "1.1" <<< "$ban_kia"        || die "stage 3 phai la ban cua nhanh them-thue"

# --- Cong cu nao dang duoc cau hinh ---
# Git ho tro san nhieu cong cu; ban chi can chi dinh cai da cai.
git config merge.tool vimdiff
[ "$(git config merge.tool)" = "vimdiff" ] || die "phai dat duoc merge.tool"

# Danh sach cong cu git biet -- chay duoc o day nen dung lam kiem chung.
git mergetool --tool-help 2>/dev/null | chua 'vimdiff' \
  || die "git phai biet den vimdiff trong danh sach cong cu"

# --- File .orig ---
# Mac dinh mergetool de lai ban goc day dau conflict duoi ten <file>.orig. Rat hay bi quen
# roi commit nham len repo. Hai cach xu ly:
git config mergetool.keepBackup false     # 1. bao git dung giu file .orig nua
printf '%s\n' "*.orig" > .gitignore       # 2. va chan luon trong .gitignore cho chac
[ "$(git config mergetool.keepBackup)" = "false" ] || die "phai tat keepBackup"

# --- Giai bang tay: chinh la viec mergetool lam ho ---
# Gop y dinh ca hai ben: cong thue TRUOC roi moi lam tron.
printf '%s\n' "function tinhTong(items) {" \
  "  const tong = items.reduce((a, b) => a + b.gia, 0)" \
  "  return Math.round(tong * 1.1)" "}" > don-hang.js
git add don-hang.js

# Sau khi add, index khong con stage nao -- mergetool cung ket thuc bang dung buoc nay.
[ "$(git ls-files -u don-hang.js | wc -l)" = "0" ] || die "sau add thi het stage"
git commit -q --no-edit >/dev/null 2>&1

grep -q "Math.round(tong \* 1.1)" don-hang.js || die "ket qua phai gop ca hai y dinh"
[ ! -f don-hang.js.orig ] || die "khong duoc de lai file .orig"

# --- Khi nao mergetool dang cong, khi nao khong ---
# Dang cong: conflict lon, nhieu doan xen ke, hoac file ban khong quen -- ba khung canh nhau
# de doi chieu hon han doc dau conflict trong mot file.
# Khong dang: conflict mot dong. Mo cong cu do hoa cho mot dong thi cham hon sua thang trong editor.
#
# Cong cu hay dung: vscode (dung luon VS Code), meld, kdiff3, vimdiff, nvimdiff.
# Neu dung VS Code lam editor chinh:
#   git config --global merge.tool vscode
#   git config --global mergetool.vscode.cmd 'code --wait $MERGED'

echo "OK"
