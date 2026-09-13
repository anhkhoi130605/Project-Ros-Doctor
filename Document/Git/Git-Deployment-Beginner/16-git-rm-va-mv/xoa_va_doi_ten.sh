#!/usr/bin/env bash
# `git rm` va `git mv` khong lam duoc gi ma `rm`/`mv` roi `git add` khong lam duoc -- chung chi
# gop hai buoc thanh mot. Nhung co MOT co that su khong the thay the: `git rm --cached`, dung khi
# ban da commit nham file khong duoc phep commit.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

cd "$(new_sandbox_repo)"

commit_file cu.js "module.exports = 1" "feat: them cu.js"
commit_file bo-di.js "khong dung nua" "feat: them bo-di.js"

# --- Xoa bang tay: git thay file mat, nhung o vung working tree ---
rm bo-di.js
# Cot thu hai la trang thai o working tree -> " D" = da xoa nhung chua staged.
[ "$(git status --porcelain bo-di.js)" = " D bo-di.js" ] \
  || die "xoa bang tay phai cho ra trang thai ' D', dang la: $(git status --porcelain bo-di.js)"

# Phai add them mot buoc nua thi git moi ghi nhan viec xoa vao index.
git add bo-di.js
[ "$(git status --porcelain bo-di.js)" = "D  bo-di.js" ] || die "sau add phai la 'D  '"

git commit -q -m "chore: bo bo-di.js"

# --- git rm: gop hai buoc lam mot ---
commit_file tam.js "tam thoi" "feat: them tam.js"
git rm -q tam.js
[ "$(git status --porcelain tam.js)" = "D  tam.js" ] || die "git rm phai staged luon viec xoa"
[ ! -f tam.js ] || die "git rm phai xoa ca file tren dia"
git commit -q -m "chore: bo tam.js"

# --- git rm --cached: cai duy nhat khong the thay bang rm + add ---
# Tinh huong that: da commit nham .env len repo. Can git NGUNG THEO DOI no,
# nhung file tren may minh phai con nguyen de chay tiep.
printf '%s\n' "API_KEY=bi-mat" > .env
git add .env
git commit -q -m "feat: them cau hinh"        # <- commit nham, se sua ngay duoi

git rm -q --cached .env
[ -f .env ] || die "--cached phai giu file tren dia"

# Sau --cached, cung mot file hien ra HAI dong trong status, va day la dieu hop ly:
#   "D  .env"  -> index: da bo theo doi
#   "?? .env"  -> working tree: file van nam do, gio thanh file chua duoc theo doi
git status --porcelain .env | chua '^D  .env' || die "index phai ghi nhan da xoa .env"
git status --porcelain .env | chua '^?? .env' || die ".env phai thanh file chua theo doi"

# Va phai them vao .gitignore ngay, khong thi lan `git add .` sau la commit lai.
printf '%s\n' ".env" > .gitignore
git add .gitignore && git commit -q -m "chore: ngung theo doi .env"

git ls-files --error-unmatch .env 2>/dev/null && die ".env phai khong con duoc theo doi"
git check-ignore -q .env || die ".env phai dang bi gitignore chan"

# Luu y quan trong: lam vay .env KHONG mat khoi lich su. Ai clone repo va xem commit cu
# van doc duoc API_KEY. Muon xoa han khoi lich su la viec khac, nang hon nhieu (bai 74).
git show HEAD~1:.env | chua "API_KEY=bi-mat" || die "commit cu van con giu noi dung .env"

# --- git mv va viec git nhan dien doi ten ---
git mv cu.js moi.js
git commit -q -m "refactor: doi ten cu.js thanh moi.js"
git show --name-status HEAD | chua '^R' || die "git phai nhan day la doi ten (R)"

# Doi ten bang tay roi add cung cho ket qua y het: git khong luu "phep doi ten" o dau ca,
# no so noi dung hai file va TU SUY RA khi ban xem diff.
mv moi.js lai-doi.js
git add -A
git commit -q -m "refactor: doi ten lan hai bang mv thuong"
git show --name-status HEAD | chua '^R' || die "mv thuong + add cung phai duoc nhan la R"

echo "OK"
