#!/usr/bin/env bash
# Conflict khong phai loi cua ai ca, va git khong "hong". No dang noi: cho nay hai nguoi sua
# khac nhau, tao khong duoc phep doan. Bai nay doc ky dau conflict, va nhin vao thu it nguoi
# biet: index luc do giu DONG THOI ba ban cua file.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

cd "$(new_sandbox_repo)"

commit_file gia.js "function tinhGia(x) {
  return x * 1.1
}" "feat: them tinhGia"
goc="$(git rev-parse HEAD)"

git checkout -q -b thue-moi
printf '%s\n' "function tinhGia(x) {" "  return x * 1.08" "}" > gia.js
git commit -qam "feat: giam thue xuong 8%"

git checkout -q main
printf '%s\n' "function tinhGia(x) {" "  return Math.round(x * 1.1)" "}" > gia.js
git commit -qam "fix: lam tron gia"

git merge thue-moi -m "merge: gop thue moi" >/dev/null 2>&1 && die "dang le phai conflict"

# --- Trong khi conflict: repo dang o trang thai giua chung ---
[ -f .git/MERGE_HEAD ] || die "dang merge do dang thi phai co .git/MERGE_HEAD"

# Liet ke dung nhung file dang conflict (U = unmerged). Dung cai nay thay vi doc bang mat
# `git status`, nhat la khi conflict hang chuc file.
dang_conflict="$(git diff --name-only --diff-filter=U)"
[ "$dang_conflict" = "gia.js" ] || die "phai liet ke dung gia.js, nhan duoc: $dang_conflict"

# --- Doc dau conflict ---
# <<<<<<< HEAD        : bat dau phan cua BEN TA (nhanh dang dung, o day la main)
# =======             : ranh gioi
# >>>>>>> thue-moi    : ket thuc, phan tren no la BEN KIA (nhanh dang merge vao)
grep -q '^<<<<<<< HEAD'   gia.js || die "phai co dau mo <<<<<<<"
grep -q '^=======$'       gia.js || die "phai co ranh gioi ======="
grep -q '^>>>>>>> thue-moi' gia.js || die "phai co dau dong >>>>>>> kem ten nhanh"

# Cai ten sau >>>>>>> cho biet phan duoi den tu dau -- rat huu ich khi merge nhieu nhanh
# hoac dang o giua mot rebase, luc do "ben ta" va "ben kia" de bi dao nguoc.

# --- Thu it nguoi biet: index dang giu BA ban cung luc ---
# `git ls-files -u` in ra cac "stage": 1 = base (to tien chung), 2 = ours, 3 = theirs.
so_stage="$(git ls-files -u gia.js | wc -l)"
[ "$so_stage" = "3" ] || die "index phai giu du 3 ban (base/ours/theirs), dang co $so_stage"

# Doc thang tung ban ra, khong can doan tu dau conflict:
ban_base="$(git show :1:gia.js)"
ban_ta="$(git show :2:gia.js)"
ban_kia="$(git show :3:gia.js)"

grep -q "x \* 1.1$"        <<< "$ban_base" || die "stage 1 phai la ban goc"
grep -q "Math.round"       <<< "$ban_ta"   || die "stage 2 phai la ban cua main"
grep -q "x \* 1.08"        <<< "$ban_kia"  || die "stage 3 phai la ban cua thue-moi"

# Nho ba stage nay ma hoi duoc "ben kia dinh lam gi" ma khong phai doc file day dau conflict:
#   git diff :1:gia.js :3:gia.js
git diff --quiet :1:gia.js :3:gia.js && die "ban goc va ban ben kia phai khac nhau"

# --- Giai conflict: sua file cho dung, roi git add ---
# Dung nhat o day la gop Y DINH cua ca hai ben (lam tron VA thue 8%), khong phai chon mot ben.
# Do la ly do git khong tu quyet: no khong biet y dinh.
printf '%s\n' "function tinhGia(x) {" "  return Math.round(x * 1.08)" "}" > gia.js

grep -q '<<<<<<<' gia.js && die "phai xoa het dau conflict truoc khi add"

# `git add` chinh la hanh dong noi "toi da giai xong file nay".
git add gia.js
[ "$(git ls-files -u gia.js | wc -l)" = "0" ] || die "sau add thi index khong con stage nao"
[ -z "$(git diff --name-only --diff-filter=U)" ] || die "khong con file nao conflict"

git commit -q --no-edit
[ ! -f .git/MERGE_HEAD ] || die "commit xong thi MERGE_HEAD phai bien mat"

# Ket qua giu duoc y dinh cua ca hai ben.
grep -q "Math.round(x \* 1.08)" gia.js || die "ket qua phai gop ca hai y dinh"

# --- Cai bay: git KHONG kiem tra ban giai co dung khong ---
# Ban hoan toan co the commit mot file van con dau <<<<<<< neu ban add no. Git chi quan tam
# file da duoc add hay chua. Do la ly do nen co hook chan dau conflict truoc khi commit (bai 57).
[ "$(git log -1 --format=%P | wc -w)" = "2" ] || die "commit merge phai co hai cha"

echo "OK"
