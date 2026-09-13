#!/usr/bin/env bash
# Bai 03 cham PHAN DAU cua message (dung dinh dang Conventional Commits chua). Bai nay cham
# CAU TRUC ca message nhieu dong: tieu de ngan, mot dong trong, roi than bai xuong dong hop ly.
# Hai bai khong trung nhau va trong thuc te thuong dung chung mot luc trong hook commit-msg.
set -euo pipefail

# Vi sao 50 va 72, khong phai con so tron nao khac:
#  - 50: `git log --oneline` va giao dien GitHub cat tieu de quanh moc nay. Dai hon la bi
#    cat mat phan duoi, ma phan duoi thuong lai la phan mang thong tin.
#  - 72: `git log` thut vao 4 khoang trang khi in than bai, 72 + 4 = 76, vua trong khung
#    80 cot cua terminal truyen thong. Vuot qua la bi xuong dong loang xoang khi doc.
GIOI_HAN_TIEU_DE=50
GIOI_HAN_THAN_BAI=72

# Tra ve: 0 dat | 1 rong | 2 tieu de qua dai | 3 tieu de co dau cham cuoi
#         4 thieu dong trong sau tieu de | 5 than bai co dong qua dai
cham_cau_truc_message() {
  # Doc tung DONG vao mang (khac `read -a` la tach theo TU): o day can biet dong thu hai co
  # rong hay khong nen phai giu ca dong trong.
  # Viet bang vong lap chu khong dung `mapfile`: mapfile chi co tu bash 4, ma macOS van giao
  # bash 3.2 -- o do se bao "mapfile: command not found" giua chung.
  local -a dong=()
  local d
  while IFS= read -r d; do dong+=("$d"); done <<< "$1"

  local tieu_de="${dong[0]:-}"

  # Bo het khoang trang de kiem tra rong, nhung van dem do dai tren tieu de GOC --
  # message toan dau cach phai bi coi la rong, con do dai thi phai tinh ca dau cach.
  [ -n "${tieu_de//[[:space:]]/}" ] || return 1
  [ "${#tieu_de}" -le "$GIOI_HAN_TIEU_DE" ] || return 2

  # Tieu de la mot tieu de, khong phai mot cau -- nen khong ket thuc bang dau cham.
  [ "${tieu_de: -1}" != "." ] || return 3

  # Message mot dong la hop le: khong phai thay doi nao cung can giai thich dai.
  [ "${#dong[@]}" -gt 1 ] || return 0

  # Co than bai thi dong thu hai BUOC phai rong. Git dung dong trong nay de biet dau la
  # tieu de va dau la than bai; thieu no thi `git log --oneline` in ca doan van thanh mot dong.
  [ -z "${dong[1]}" ] || return 4

  local i
  for i in "${!dong[@]}"; do
    [ "$i" -lt 2 ] && continue
    [ "${#dong[$i]}" -le "$GIOI_HAN_THAN_BAI" ] || return 5
  done

  return 0
}

# ---- Self-check ----
expect_code() {
  local want="$1" msg="$2" ten="$3" got=0
  cham_cau_truc_message "$msg" || got=$?
  [ "$got" = "$want" ] || { echo "FAIL: $ten -- cho ma $got, can $want"; exit 1; }
}

selfcheck() {
  expect_code 0 "feat: them gio hang" "tieu de mot dong"

  expect_code 0 "fix: chan don hang trung khi bam nut hai lan

Nut dat hang khong bi vo hieu sau lan bam dau, nen mang cham la
nguoi dung bam lai va tao hai don. Them khoa theo ma don o phia
server thay vi chi disable nut o phia client." "tieu de + than bai dung chuan"

  expect_code 1 ""      "message rong"
  expect_code 1 "   "   "message chi co khoang trang"

  # Test bien: dung dung gioi han thi dat, hon mot ky tu thi truot. Dung chuoi dem tay
  # o day rat de sai (dem nham mot ky tu la test mat y nghia) nen dung sinh ra theo do dai
  # roi kiem tra lai chinh do dai truoc khi dem di cham.
  local vua_du qua_mot
  vua_du="feat: $(printf 'a%.0s' $(seq 1 $((GIOI_HAN_TIEU_DE - 6))))"
  qua_mot="${vua_du}a"
  [ "${#vua_du}" = "$GIOI_HAN_TIEU_DE" ] || { echo "FAIL: chuoi test sai do dai"; exit 1; }

  expect_code 0 "$vua_du" "tieu de dung $GIOI_HAN_TIEU_DE ky tu"
  expect_code 2 "$qua_mot" "tieu de $((GIOI_HAN_TIEU_DE + 1)) ky tu"

  expect_code 3 "feat: them gio hang." "tieu de co dau cham cuoi"

  expect_code 4 "fix: sua loi dang nhap
Loi nay do token het han ma khong duoc lam moi." "thieu dong trong sau tieu de"

  expect_code 5 "fix: sua loi dang nhap

Dong nay co do dai vuot qua bay muoi hai ky tu nen se bi xuong dong loang xoang khi doc." \
    "than bai co dong qua dai"

  echo "OK"
}

# Khong tham so -> self-check. Co tham so -> cham message do (hoac doc tu file neu la duong dan).
if [ "$#" -eq 0 ]; then
  selfcheck
else
  if [ -f "$1" ]; then noi_dung="$(cat "$1")"; else noi_dung="$1"; fi

  code=0
  cham_cau_truc_message "$noi_dung" || code=$?
  case "$code" in
    0) echo "Dat" ;;
    1) echo "Chua dat: message rong"; exit 1 ;;
    2) echo "Chua dat: tieu de dai hon $GIOI_HAN_TIEU_DE ky tu -- cat bot, phan chi tiet day xuong than bai"; exit 1 ;;
    3) echo "Chua dat: tieu de khong nen ket thuc bang dau cham"; exit 1 ;;
    4) echo "Chua dat: thieu mot dong trong giua tieu de va than bai"; exit 1 ;;
    5) echo "Chua dat: than bai co dong dai hon $GIOI_HAN_THAN_BAI ky tu"; exit 1 ;;
  esac
fi
