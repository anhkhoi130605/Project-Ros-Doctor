#!/usr/bin/env bash
# Review mot PR 500 dong ma doc tuan tu tu tren xuong la cach cham nhat va bo sot nhieu nhat.
# Git co san may co de tach "thay doi that" ra khoi "nhieu": doi indent, doi ten file, va
# thu tu doc. Bai nay dung mot PR co du ba loai nhieu do roi loc chung ra.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

cd "$(new_sandbox_repo)"

# File goc: mot ham co logic that.
cat > gio-hang.js <<'JS'
function tinhTong(items) {
  let tong = 0
  for (const it of items) {
    tong += it.gia * it.soLuong
  }
  return tong
}
JS
cat > cu.js <<'JS'
export const HANG_SO = 42
JS
git add . && git commit -q -m "feat: khoi tao"

git checkout -q -b feat/sua-gio-hang

# Nhieu loai 1: doi ten file (khong doi noi dung).
git mv cu.js moi.js

# Nhieu loai 2: thut le lai toan bo file (4 khoang trang thay vi 2) -- 0 thay doi logic.
# Nhieu loai 3 tron vao: MOT thay doi logic that (them thue).
cat > gio-hang.js <<'JS'
function tinhTong(items) {
    let tong = 0
    for (const it of items) {
        tong += it.gia * it.soLuong
    }
    return tong * 1.1
}
JS
git add -A && git commit -q -m "refactor: thut le lai va them thue"

# --- Doc tho: bao nhieu dong? ---
# 5 dong bot + 5 dong them cua gio-hang.js (ca than ham bi thut lai), cong 0 cua file doi ten.
tho="$(git diff --numstat main...feat/sua-gio-hang | awk '{t+=$1+$2} END {print t}')"
[ "$tho" = "10" ] || die "diff tho phai la 10 dong, dem duoc $tho"

# --- Co 1: -w bo qua thay doi chi ve khoang trang ---
# Con lai dung phan logic that: mot dong return doi.
sach="$(git diff -w --numstat main...feat/sua-gio-hang | awk '{t+=$1+$2} END {print t+0}')"
[ "$sach" -lt "$tho" ] || die "-w phai lam giam so dong"
[ "$sach" = "2" ] || die "bo khoang trang thi chi con 2 dong (1 bot, 1 them), dem duoc $sach"

git diff -w main...feat/sua-gio-hang | chua 'return tong \* 1.1' \
  || die "-w phai giu lai thay doi logic that"

# Day la co dang dung dau tien khi mo mot PR co ve to: xem thu bo khoang trang di thi con lai
# bao nhieu. Neu tu 500 dong xuong con 20 thi ban biet phai doc 20 dong nao.

# --- Co 2: nhan dien doi ten thay vi bao xoa + them ---
# Git tu suy ra doi ten (bai 16). Trong --stat no hien thanh mot dong "cu.js => moi.js"
# chu khong phai mot dong xoa va mot dong them.
git diff --stat main...feat/sua-gio-hang | chua 'cu.js => moi.js' \
  || die "phai nhan ra doi ten"
# So bang awk chu khong grep chuoi co tab: numstat ngan cot bang tab, ma tab trong chuoi
# nhay don rat de bien thanh khoang trang khi copy qua lai.
# Phai chi ro -F'\t': numstat ngan cot bang tab, va cot thu ba cua dong doi ten la ca cum
# "cu.js => moi.js" co khoang trang ben trong. De awk tach mac dinh thi cum do vo lam ba cot.
git diff --numstat main...feat/sua-gio-hang \
  | awk -F'\t' '$3 ~ /moi\.js/ && $1 == 0 && $2 == 0 { co = 1 } END { exit !co }' \
  || die "doi ten khong doi noi dung thi phai la 0 them 0 bot"

# --- Co 3: doc theo tung file, chon file dang quan tam ---
[ "$(git diff --name-only main...feat/sua-gio-hang | wc -l)" = "2" ] || die "PR nay cham 2 duong dan"
# Chi doc mot file:
git diff -w main...feat/sua-gio-hang -- gio-hang.js | chua '1.1' || die "loc theo file phai chay"

# --- Co 4: doc theo tung COMMIT thay vi ca PR ---
# Neu tac gia commit sach (bai 18) thi doc tung commit de hon han doc mot cuc.
git checkout -q -b feat/commit-sach main
cat > gio-hang.js <<'JS'
function tinhTong(items) {
    let tong = 0
    for (const it of items) {
        tong += it.gia * it.soLuong
    }
    return tong
}
JS
git add -A && git commit -q -m "style: thut le 4 khoang trang"
sed -i 's/return tong$/return tong * 1.1/' gio-hang.js
git add -A && git commit -q -m "feat: cong thue 10 phan tram"

# Commit thu hai chi co dung 2 dong -- doc mot cai la hieu.
[ "$(git diff --numstat HEAD~1 HEAD | awk '{print $1+$2}')" = "2" ] \
  || die "commit logic phai chi co 2 dong"
# Con commit format thi khong doi logic gi -- bo qua duoc bang -w.
[ -z "$(git diff -w --numstat HEAD~2 HEAD~1)" ] || die "commit format phai trong khi bo khoang trang"

# --- Co 5: --word-diff cho doan van ban ---
# Voi tai lieu hay chuoi dai, diff theo dong bao ca cau doi trong khi thuc te chi doi mot tu.
git checkout -q main
commit_file README.md "Du an nay dung de quan ly gio hang cho cua hang truc tuyen." "docs: mo ta"
git checkout -q -b docs/sua-tu
commit_file README.md "Du an nay dung de quan ly don hang cho cua hang truc tuyen." "docs: sua mot tu"

# Ban mac dinh in ca dong kem danh dau ngay tai cho: "... quan ly [-gio-]{+don+} hang ...".
# Dung -F (so chuoi nguyen van) vi [-gio-] neu de grep hieu la bieu thuc thi [ ] thanh lop ky tu.
ban_word="$(git diff --word-diff main...docs/sua-tu)"
chua -F '[-gio-]' <<< "$ban_word" || die "--word-diff phai danh dau tu bi bo"
chua -F '{+don+}' <<< "$ban_word" || die "--word-diff phai danh dau tu duoc them"

# So voi diff theo dong: ca cau bi bao la bot mot dong them mot dong, du chi doi mot tu.
[ "$(git diff --numstat main...docs/sua-tu | awk '{print $1+$2}')" = "2" ] \
  || die "diff theo dong bao ca cau doi"

# --- Thu tu doc mot PR (khong kiem chung duoc bang script, nhung la phan quan trong nhat) ---
#  1. Doc mo ta PR truoc: tac gia dinh lam gi. Khong khop voi diff la da co van de.
#  2. `--stat` de nhin toan canh: bao nhieu file, file nao to bat thuong.
#  3. `-w` de biet phan logic that su bao nhieu dong.
#  4. Doc tung commit neu lich su sach; doc theo file neu khong.
#  5. Test truoc, code sau: test noi ro hanh vi mong doi la gi.

echo "OK"
