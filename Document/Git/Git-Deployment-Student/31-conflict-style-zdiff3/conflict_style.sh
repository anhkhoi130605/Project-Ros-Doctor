#!/usr/bin/env bash
# Dau conflict mac dinh chi cho thay HAI ban: cua ta va cua ho. Thieu ban GOC, ma khong co goc
# thi nhieu khi khong the biet ben nao them, ben nao xoa. Doi mot dong config la git hien ca ba --
# va co mot kieu thu ba con don gon vung conflict lai.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

# zdiff3 co tu git 2.35 (2022). diff3 thi co tu rat lau roi.
git_at_least 2 35 || { echo "SKIP: can git >= 2.35 cho zdiff3, dang co $(git --version)"; exit 0; }

cd "$(new_sandbox_repo)"

commit_file quyen.js "function kiemTraQuyen(user) {
  const duocPhep = ['admin']
  return duocPhep.includes(user.role)
}" "feat: them kiem tra quyen"

# Hai nguoi cung sua dong duocPhep, va tinh co cung them mot dong ghi log giong het nhau.
git checkout -q -b them-editor
printf '%s\n' "function kiemTraQuyen(user) {" \
  "  const duocPhep = ['admin', 'editor']" \
  "  ghiLog(user.id)" \
  "  return duocPhep.includes(user.role)" "}" > quyen.js
git commit -qam "feat: cho editor co quyen"

git checkout -q main
printf '%s\n' "function kiemTraQuyen(user) {" \
  "  const duocPhep = ['admin', 'owner']" \
  "  ghiLog(user.id)" \
  "  return duocPhep.includes(user.role)" "}" > quyen.js
git commit -qam "feat: cho owner co quyen"

# Ham nho de lay rieng vung conflict ra xem.
vung_conflict() { sed -n '/^<<<<<<</,/^>>>>>>>/p' quyen.js; }

thu_kieu() {
  git config merge.conflictStyle "$1"
  git merge them-editor -m "merge" >/dev/null 2>&1 && die "kieu $1: dang le phai conflict"
  # `return 0` khong thua: khong co no thi gia tri tra ve cua ham la cua lenh cuoi --
  # tuc la cua `git merge` da that bai -- va `set -e` se giet script ngay o cho goi ham,
  # khong in ra loi nao. Bay nay chi lo ra khi dua mot lenh "duoc phep that bai" vao ham.
  return 0
}

# --- Kieu 1: merge (mac dinh) -- chi hai ban ---
thu_kieu merge
vung_conflict | chua '^|||||||' && die "kieu mac dinh khong duoc hien phan goc"
# Nhin vao day chi thay hai doan code khac nhau. Khong biet dong duocPhep von la gi,
# nen khong biet moi ben da THEM gi vao -- phai di doi chieu lich su.
git merge --abort

# --- Kieu 2: diff3 -- hien them ban goc ---
thu_kieu diff3
vung_conflict | chua '^|||||||' || die "diff3 phai hien phan goc"

# Phan giua ||||||| va ======= la ban GOC truoc khi hai ben dong vao.
phan_goc="$(sed -n '/^|||||||/,/^=======/p' quyen.js)"
grep -q "duocPhep = \['admin'\]" <<< "$phan_goc" || die "phan goc phai la dong duocPhep ban dau"

# Co goc roi thi doc duoc ngay y dinh: ca hai ben deu THEM mot vai tro vao mang,
# khong ben nao xoa gi -> dap an dung la gop ca hai vai tro.
# Nhung diff3 con mot diem kho chiu: dong ghiLog GIONG HET nhau o ca hai ben van bi
# ke vao trong vung conflict, lam vung conflict phinh ra vo ich.
[ "$(vung_conflict | grep -c 'ghiLog')" = "2" ] || die "diff3 phai lap dong ghiLog o ca hai ben"
git merge --abort

# --- Kieu 3: zdiff3 -- van co goc, nhung don gon ---
thu_kieu zdiff3
vung_conflict | chua '^|||||||' || die "zdiff3 van phai hien phan goc"

# "z" la zealous: nhung dong giong nhau o dau va cuoi cac ben duoc day RA NGOAI vung conflict.
# Nen ghiLog chi con xuat hien mot lan, va nam ngoai vung phai giai.
[ "$(vung_conflict | grep -c 'ghiLog')" = "0" ] || die "zdiff3 phai day dong ghiLog ra ngoai vung conflict"
grep -q 'ghiLog' quyen.js || die "dong ghiLog van phai con trong file"

# Vung conflict nho hon -> phan phai doc va phai quyet dinh it hon. Voi conflict trong ham dai
# thi khac biet nay rat ro.

# --- Giai: gop vai tro cua ca hai ben ---
printf '%s\n' "function kiemTraQuyen(user) {" \
  "  const duocPhep = ['admin', 'owner', 'editor']" \
  "  ghiLog(user.id)" \
  "  return duocPhep.includes(user.role)" "}" > quyen.js
git add quyen.js && git commit -q --no-edit

grep -q "'owner'"  quyen.js || die "phai giu vai tro cua main"
grep -q "'editor'" quyen.js || die "phai giu vai tro cua nhanh kia"
[ "$(grep -c 'ghiLog' quyen.js)" = "1" ] || die "dong ghiLog chi duoc xuat hien mot lan"

# Dat mot lan cho moi repo tren may:
#   git config --global merge.conflictStyle zdiff3
# Tai lieu cu hay khuyen dung diff3 -- do la ban viet truoc khi co zdiff3.
[ "$(git config merge.conflictStyle)" = "zdiff3" ] || die "config phai la zdiff3"

echo "OK"
