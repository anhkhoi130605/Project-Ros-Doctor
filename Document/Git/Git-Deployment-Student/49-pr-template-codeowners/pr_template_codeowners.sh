#!/usr/bin/env bash
# Hai file nho trong .github/ quyet dinh chat luong review nhieu hon moi loi nhac trong hop chat:
# PR template (moi PR tu co san khung mo ta) va CODEOWNERS (dung nguoi duoc goi vao review).
# Bai nay tao ca hai, roi viet ham phan giai CODEOWNERS de hieu luat khop cua no.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

cd "$(new_sandbox_repo)"
commit_file app.js "phien ban 1" "feat: khoi tao"
mkdir -p .github

# ============ Phan 1: PR template ============
cat > .github/pull_request_template.md <<'MD'
## Thay doi gi
<!-- Mot doan ngan. Neu can hon ba cau thi co the PR dang qua to. -->

## Vi sao
<!-- Van de dang giai quyet. Link issue neu co. -->

## Kiem thu the nao
<!-- Cac buoc de nguoi khac tu kiem chung duoc. -->

## Anh huong
- [ ] Co doi lieu do (migration)
- [ ] Co doi bien moi truong / secret
- [ ] Co the phai rollback rieng
MD
git add .github && git commit -q -m "chore: them PR template"

# Cham template co du cac muc bat buoc khong -- de dat vao CI cua chinh repo mau nay.
cham_template() {
  local f="$1" muc thieu=0
  for muc in "Thay doi gi" "Vi sao" "Kiem thu the nao"; do
    grep -q "^## $muc" "$f" || { echo "Thieu muc: $muc"; thieu=1; }
  done
  return "$thieu"
}
cham_template .github/pull_request_template.md || die "template mau phai du muc"

cat > thieu.md <<'MD'
## Thay doi gi
noi dung
MD
cham_template thieu.md >/dev/null && die "template thieu muc phai bi tu choi"
rm -f thieu.md

# GitHub tu do noi dung file nay vao o mo ta moi khi ai do mo PR. Nen thu tu cac muc
# chinh la thu tu ban muon nguoi ta suy nghi: doi gi -> vi sao -> kiem thu the nao.

# ============ Phan 2: CODEOWNERS ============
cat > .github/CODEOWNERS <<'OWNERS'
# Mac dinh: ai cung duoc, nhung phai co mot nguoi trong nhom nen tang duyet.
*                       @cong-ty/nen-tang

# Cang xuong duoi cang uu tien -- luat CUOI CUNG khop moi co hieu luc.
/api/                   @cong-ty/backend
/api/thanh-toan/        @cong-ty/thanh-toan @an
/web/                   @cong-ty/frontend
*.sql                   @cong-ty/du-lieu
/.github/               @cong-ty/nen-tang
OWNERS
git add .github && git commit -q -m "chore: them CODEOWNERS"

# --- Phan giai: ai la chu so huu cua mot duong dan ---
# Luat khop giong .gitignore (bai 19) voi mot khac biet quan trong: o CODEOWNERS,
# luat CUOI CUNG khop se thang, va chi luat do co hieu luc -- khong cong don.
chu_so_huu() {
  local duong_dan="$1" ket_qua="" mau nguoi dong
  while IFS= read -r dong; do
    dong="${dong%%#*}"                       # bo phan chu thich
    [ -z "${dong// /}" ] && continue         # bo dong trong
    # `read` tach cot dau lam mau, phan con lai lam danh sach nguoi -- va no tu bo khoang
    # trang thua o giua. Cat bang ${dong%% *} thi phan con lai van dinh nguyen chuoi thut le.
    read -r mau nguoi <<< "$dong"

    if [[ "$mau" == /*/ ]]; then             # thu muc, neo tu goc repo
      [[ "/$duong_dan" == "$mau"* ]] && ket_qua="$nguoi"
    elif [[ "$mau" == \*.* ]]; then          # duoi file, khop moi cap
      [[ "$duong_dan" == *"${mau#\*}" ]] && ket_qua="$nguoi"
    elif [ "$mau" = "*" ]; then              # mac dinh
      ket_qua="$nguoi"
    fi
  done < .github/CODEOWNERS
  echo "$ket_qua"
}

[ "$(chu_so_huu 'README.md')" = "@cong-ty/nen-tang" ] \
  || die "file khong khop luat nao thi roi vao luat mac dinh"
[ "$(chu_so_huu 'api/nguoi-dung.js')" = "@cong-ty/backend" ] \
  || die "file trong /api/ thuoc backend"
[ "$(chu_so_huu 'web/trang-chu.js')" = "@cong-ty/frontend" ] \
  || die "file trong /web/ thuoc frontend"

# Day la cho de sai: /api/thanh-toan/ nam SAU /api/ trong file, nen no thang.
[ "$(chu_so_huu 'api/thanh-toan/the.js')" = "@cong-ty/thanh-toan @an" ] \
  || die "luat cu the hon phai duoc dat SAU va no thang"

# Neu dao thu tu hai dong do, moi file thanh toan se roi vao @backend va nhom thanh toan
# khong bao gio duoc goi vao review -- loi im lang, khong ai phat hien cho den khi co su co.

# Duoi file khop o moi cap thu muc.
[ "$(chu_so_huu 'db/di-tru/001.sql')" = "@cong-ty/du-lieu" ] || die "*.sql khop o moi cap"

# Va vi *.sql nam SAU /api/, mot file .sql trong /api/ se thuoc nhom du lieu chu khong phai backend.
[ "$(chu_so_huu 'api/luoc-do.sql')" = "@cong-ty/du-lieu" ] \
  || die "luat sau cung khop van la luat thang"

# --- Kiem chung bang chinh git ---
# CODEOWNERS chi co tac dung tren GitHub, nhung "file nao trong PR nay" thi git tra loi duoc:
git checkout -q -b feat/sua-thanh-toan
commit_file api/thanh-toan/the.js "xu ly the" "feat: them xu ly the"
commit_file web/trang-chu.js "trang chu" "feat: sua trang chu"

nguoi_can_duyet="$(git diff --name-only main...HEAD | while IFS= read -r f; do chu_so_huu "$f"; done | sort -u)"
chua 'thanh-toan' <<< "$nguoi_can_duyet" || die "PR nay phai goi nhom thanh toan"
chua 'frontend'   <<< "$nguoi_can_duyet" || die "PR nay phai goi ca nhom frontend"

# Do cung la ly do PR to dung nhieu mang lam cham review: no cho doi chu ky cua nhieu nhom.

echo "OK"
