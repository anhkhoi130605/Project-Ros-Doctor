#!/usr/bin/env bash
# Vi sao doi khi mo mot PR ma git bao "doi 400 dong" trong khi ban chi sua 2 dong:
# ky tu ket dong (LF hay CRLF) cung nam trong noi dung file, nen doi ket dong la doi
# ca dong. Bai nay dung .gitattributes de chot ket dong trong repo, het phu thuoc may ai.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

cd "$(new_sandbox_repo)"

# Ham nho de doc git luu ket dong gi trong index: `git ls-files --eol` in ra dang
# "i/crlf w/crlf attr/text=auto" -- i/ la trong index, w/ la tren dia (working tree).
eol_trong_index() {
  git ls-files --eol -- "$1" | sed -n 's/^i\/\([a-z]*\).*/\1/p'
}

# --- Chua co .gitattributes: git luu y nguyen ket dong cua file ---
# (sandbox da dat core.autocrlf=false de ket qua giong nhau tren moi may)
printf 'dong mot\r\ndong hai\r\n' > windows.txt
printf 'dong mot\ndong hai\n'     > unix.txt
git add windows.txt unix.txt
git commit -q -m "chore: them hai file khac ket dong"

[ "$(eol_trong_index windows.txt)" = "crlf" ] || die "file CRLF dang le duoc luu nguyen CRLF"
[ "$(eol_trong_index unix.txt)"    = "lf"   ] || die "file LF dang le duoc luu nguyen LF"

# Do la van de: repo dang chua ca hai kieu. Nguoi dung Windows sua file unix.txt, editor
# cua ho doi het sang CRLF, git bao toan bo file thay doi. Review khong nhin ra dong nao
# la thay doi that.

# --- Chot lai bang .gitattributes ---
# `* text=auto` = trong repo luon luu LF, con tren dia thi tuy may.
# Day la thu nen co trong MOI repo, khong phai chi repo da nen tang.
printf '%s\n' "* text=auto" > .gitattributes
git add .gitattributes
git commit -q -m "chore: chot ket dong bang .gitattributes"

# .gitattributes moi them KHONG tu dong sua cac file da commit truoc do.
[ "$(eol_trong_index windows.txt)" = "crlf" ] \
  || die "them .gitattributes khong duoc tu dong sua file da commit"

# Phai bao git doc lai va chuan hoa toan bo file dang theo doi -- day la buoc hay bi quen,
# thanh ra ai cung tuong .gitattributes khong an gi.
git add --renormalize .
git commit -q -m "chore: chuan hoa lai ket dong toan repo"

[ "$(eol_trong_index windows.txt)" = "lf" ] || die "sau --renormalize thi index phai la LF"
[ "$(eol_trong_index unix.txt)"    = "lf" ] || die "unix.txt phai van la LF"

# --- File nhi phan phai duoc loai ra ---
# Neu de git coi anh/font la van ban, no se "chuan hoa" ket dong ben trong va lam hong file.
printf 'PNG\r\n\x1a\r\nbytes' > logo.png
printf '%s\n' "*.png binary" >> .gitattributes
git add .gitattributes logo.png
git commit -q -m "chore: danh dau png la nhi phan"

# Danh dau binary thi git khong cham vao byte nao: khong co ket dong nao duoc ghi nhan.
[ -z "$(eol_trong_index logo.png)" ] || die "file binary khong duoc git chuan hoa ket dong"

# --- Kiem chung lai bang cach xoa het roi lay lai tu git ---
# Day la cach nhanh nhat de xem git THAT SU dang giu gi, thay vi tin vao file tren dia.
rm -f windows.txt
git checkout -q -- windows.txt
grep -q $'\r' windows.txt && die "lay ra tu git ma con CR: chua chuan hoa xong"

echo "OK"
