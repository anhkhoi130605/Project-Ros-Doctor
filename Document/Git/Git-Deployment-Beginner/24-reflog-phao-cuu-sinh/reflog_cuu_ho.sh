#!/usr/bin/env bash
# reflog la so ghi chep moi lan HEAD DI CHUYEN tren may ban. No khong phai lich su commit --
# no la lich su thao tac. Nho no ma gan nhu moi tai nan git deu cuu duoc: reset --hard nham,
# xoa nhanh nham, rebase hong, amend mat commit.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

cd "$(new_sandbox_repo)"

commit_file bao-cao.md "phan 1" "feat: viet phan 1"
commit_file bao-cao.md "phan 1 va 2" "feat: viet phan 2"
commit_file bao-cao.md "phan 1, 2 va 3" "feat: viet phan 3"
truoc_tai_nan="$(git rev-parse HEAD)"

# --- Tai nan 1: reset --hard nham, mat hai commit ---
git reset -q --hard HEAD~2

[ "$(git rev-list --count HEAD)" = "1" ] || die "sau reset phai chi con 1 commit"
[ "$(cat bao-cao.md)" = "phan 1" ] || die "file phai lui ve ban dau"

# Lich su commit khong con duong nao den hai commit kia. Nhung reflog thi co:
# no ghi lai TUNG vi tri HEAD da dung, ke ca nhung vi tri gio khong con nhanh nao tro tay den.
git reflog | chua 'reset:' || die "reflog phai ghi lai thao tac reset"

# HEAD@{1} = cho HEAD dung ngay truoc thao tac vua roi.
[ "$(git rev-parse 'HEAD@{1}')" = "$truoc_tai_nan" ] || die "HEAD@{1} phai la vi tri truoc reset"

# Cuu: reset nguoc lai ve dung cho do.
git reset -q --hard 'HEAD@{1}'
[ "$(git rev-parse HEAD)" = "$truoc_tai_nan" ] || die "phai quay lai duoc vi tri truoc tai nan"
[ "$(cat bao-cao.md)" = "phan 1, 2 va 3" ] || die "noi dung file phai tro lai day du"

# --- Tai nan 2: xoa nhanh chua merge ---
git checkout -q -b tinh-nang-quan-trong
commit_file tinh-nang.js "code ca buoi chieu" "feat: tinh nang quan trong"
commit_da_xoa="$(git rev-parse HEAD)"

git checkout -q main
git branch -D tinh-nang-quan-trong >/dev/null      # git co canh bao, nhung ta bo qua

[ -z "$(git for-each-ref --contains "$commit_da_xoa" refs/heads/ --format='%(refname:short)')" ] \
  || die "khong nhanh nao con giu commit do"

# reflog cua HEAD van ghi lai luc ta dang o nhanh do va da commit gi.
git reflog | chua "$(git rev-parse --short "$commit_da_xoa")" \
  || die "reflog phai con dau vet commit cua nhanh da xoa"

# Cuu: tao lai nhanh tro vao dung commit do.
git branch tinh-nang-quan-trong "$commit_da_xoa"
[ "$(git rev-parse tinh-nang-quan-trong)" = "$commit_da_xoa" ] || die "phai tao lai duoc nhanh"

# --- Moi nhanh co reflog RIENG, khong chi HEAD ---
# `git reflog show <nhanh>` doc lich su di chuyen cua chinh con tro nhanh do.
git reflog show main | chua . || die "main phai co reflog rieng"

# Nen co hai cach viet, va chung tra loi hai cau hoi khac nhau:
#   HEAD@{2}  -> HEAD dung o dau, hai buoc truoc (ke ca khi buoc do la doi nhanh)
#   main@{2}  -> con tro main tro vao dau, hai lan cap nhat truoc
git rev-parse 'main@{0}' >/dev/null || die "main@{0} phai doc duoc"

# --- reflog ghi ca nhung thao tac KHONG tao commit ---
# checkout khong tao commit nao, nhung van vao reflog -- day la ly do reflog cuu duoc
# ca truong hop "toi di dau mat roi" chu khong chi "toi mat commit".
git checkout -q tinh-nang-quan-trong
git checkout -q main
git reflog -3 | chua 'checkout:' || die "reflog phai ghi ca thao tac checkout"

# --- Gioi han: reflog la CUC BO va co han su dung ---
# 1. reflog nam trong .git/logs, khong duoc push, khong duoc clone. Nguoi khac clone repo
#    cua ban se khong co reflog cua ban.
[ -f .git/logs/HEAD ] || die "reflog phai nam trong .git/logs/HEAD"

# 2. Mac dinh git giu 90 ngay cho commit con voi tay duoc (gc.reflogExpire), va 30 ngay cho
#    commit da mo coi (gc.reflogExpireUnreachable), sau do `git gc` don di that. Nen reflog la
#    phao cuu sinh, khong phai ban sao luu -- sao luu that su la push len remote.

# 3. Repo vua clone thi reflog gan nhu trong -- dung mong cuu duoc gi tu no.
git clone -q . ../ban-clone
[ "$(git -C ../ban-clone reflog | wc -l)" -le 2 ] || die "repo vua clone dang le reflog gan nhu trong"

echo "OK"
