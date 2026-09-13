#!/usr/bin/env bash
# Dang giai conflict giua chung thi nhan ra minh merge nham nhanh, hoac conflict qua lon can
# ban bac lai voi dong doi truoc. Git co duong lui -- va co ba lenh nghe giong nhau nhung
# de lai ba ket qua khac han: --abort, --quit, va reset --hard.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

cd "$(new_sandbox_repo)"

commit_file bao-cao.md "so lieu quy 1" "feat: bao cao quy 1"
commit_file ghi-chu.md "ghi chu chung" "feat: them ghi chu"
goc="$(git rev-parse HEAD)"

git checkout -q -b nhanh-kia
printf '%s\n' "so lieu quy 1 (da kiem toan)" > bao-cao.md
git commit -qam "fix: cap nhat so lieu da kiem toan"

git checkout -q main
printf '%s\n' "so lieu quy 1 (ban nhap)" > bao-cao.md
git commit -qam "feat: them ban nhap"
truoc_merge="$(git rev-parse HEAD)"

# --- Vao trang thai merge do dang ---
git merge nhanh-kia -m "merge" >/dev/null 2>&1 && die "dang le phai conflict"

[ -f .git/MERGE_HEAD ] || die "phai co MERGE_HEAD khi dang merge do dang"
[ -n "$(git diff --name-only --diff-filter=U)" ] || die "phai co file dang conflict"

# Trong trang thai nay, `git status` bao "You have unmerged paths" va git tu choi phan lon
# thao tac khac (checkout sang nhanh, merge tiep) cho den khi ban giai quyet xong.

# --- --abort: quay ve dung truoc luc go merge ---
git merge --abort

[ ! -f .git/MERGE_HEAD ] || die "--abort phai xoa MERGE_HEAD"
[ "$(git rev-parse HEAD)" = "$truoc_merge" ] || die "--abort phai giu nguyen vi tri HEAD"
[ -z "$(git diff --name-only --diff-filter=U)" ] || die "--abort phai het file conflict"
[ "$(cat bao-cao.md)" = "so lieu quy 1 (ban nhap)" ] || die "file phai tro lai ban cua main"
[ -z "$(git status --porcelain)" ] || die "--abort phai tra repo ve trang thai sach"

# --- --quit: bo trang thai merge NHUNG giu nguyen file dang do ---
# Khac han --abort. Dung khi ban da giai gan xong va muon giu ket qua, chi khong muon
# git coi day la mot merge nua.
git merge nhanh-kia -m "merge" >/dev/null 2>&1 && die "phai conflict thi phan duoi moi co nghia"
printf '%s\n' "so lieu quy 1 (da kiem toan, ban nhap)" > bao-cao.md
git add bao-cao.md
git merge --quit

[ ! -f .git/MERGE_HEAD ] || die "--quit phai xoa MERGE_HEAD"
[ "$(cat bao-cao.md)" = "so lieu quy 1 (da kiem toan, ban nhap)" ] \
  || die "--quit phai GIU noi dung dang lam do"
[ -n "$(git status --porcelain)" ] || die "--quit khong duoc don sach thay doi"

# Hau qua: commit sau do la commit thuong, mot cha -- lich su khong ghi nhan da merge.
git commit -q -m "chore: gop tay so lieu"
[ "$(git log -1 --format=%P | wc -w)" = "1" ] || die "sau --quit thi commit chi co mot cha"
git reset -q --hard "$truoc_merge"

# --- Thay doi chua commit truoc khi merge ---
# Git chi tu choi khi merge se GHI DE len file ban dang sua do. Phan biet nay quan trong:
printf '%s\n' "dang sua do, chua commit" > bao-cao.md    # bao-cao.md la file merge se dong den
git merge nhanh-kia -m "merge" >/dev/null 2>&1 && die "git phai tu choi khi se ghi de file dang sua"

# Tu choi truoc khi bat dau, nen khong co trang thai merge do dang nao de ma abort.
[ ! -f .git/MERGE_HEAD ] || die "git tu choi thi khong duoc de lai trang thai merge"
[ "$(cat bao-cao.md)" = "dang sua do, chua commit" ] || die "thay doi cua ban phai con nguyen"

# Nguoc lai, neu file dang sua KHONG nam trong pham vi merge thi git cu merge binh thuong --
# va ban se roi vao trang thai conflict trong khi van dang co viec do dang. Luc do `stash`
# khong dung duoc nua (git bao "needs merge"), nen duong lui chi con --abort.
git checkout -q -- bao-cao.md
printf '%s\n' "dang sua do, chua commit" > ghi-chu.md     # ghi-chu.md khong lien quan den merge
git merge nhanh-kia -m "merge" >/dev/null 2>&1 && die "van phai conflict o bao-cao.md"
[ -f .git/MERGE_HEAD ] || die "lan nay git co bat dau merge that"
git stash -q >/dev/null 2>&1 && die "dang conflict thi stash phai that bai"
git merge --abort
[ "$(cat ghi-chu.md)" = "dang sua do, chua commit" ] || die "--abort khong duoc dung den file khong lien quan"

# Thoi quen dung: commit hoac stash TRUOC khi merge, dung de viec do dang khi buoc vao.
git stash -q
git merge nhanh-kia -m "merge" >/dev/null 2>&1 && die "van phai conflict"
git merge --abort
git stash pop -q
[ "$(cat ghi-chu.md)" = "dang sua do, chua commit" ] || die "stash pop phai lay lai thay doi"
git checkout -q -- ghi-chu.md

# --- reset --hard: cach thu ba, va la cach de mat viec nhat ---
# Sau khi conflict, `git reset --hard` cung xoa trang thai merge. Nhung no vut luon MOI thay doi
# chua commit trong ca repo, khong chi rieng phan merge -- ke ca file ban dang sua do.
git merge nhanh-kia -m "merge" >/dev/null 2>&1 && die "phai conflict thi phan duoi moi co nghia"
printf '%s\n' "ghi chu dang viet do" > ghi-chu.md
git reset -q --hard

[ ! -f .git/MERGE_HEAD ] || die "reset --hard cung xoa trang thai merge"
[ "$(cat ghi-chu.md)" = "ghi chu chung" ] || die "reset --hard vut luon thay doi khong lien quan"
# So voi --abort: --abort chi lui phan merge, con reset --hard don sach tat ca.
# Nen mac dinh nen la --abort.

echo "OK"
