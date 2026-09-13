#!/usr/bin/env bash
# Nut merge tren GitHub co ba lua chon, va chung cho ba lich su khac han nhau. Ben duoi khong co
# gi bi an: ca ba deu la lenh git thuan. Bai nay chay ca ba tren cung mot PR de so ket qua.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

cd "$(new_sandbox_repo)"
commit_file app.js "phien ban 1" "feat: khoi tao"
commit_file doc.md "tai lieu" "docs: tai lieu"
goc="$(git rev-parse HEAD)"

# Mot PR ba commit, trong do co mot commit "sua theo review" khong dang luu lai.
git checkout -q -b feat/gio-hang
commit_file gio-hang.js "gio hang ban dau" "feat: them gio hang"
commit_file gio-hang.js "gio hang ban dau
them nut xoa" "feat: them nut xoa"
commit_file gio-hang.js "gio hang ban dau
them nut xoa
da sua chinh ta" "fix: sua theo review"
dinh_pr="$(git rev-parse HEAD)"

# main di tiep trong luc PR dang cho review -- de thay ro khac biet giua ba kieu.
git checkout -q main
commit_file thanh-toan.js "thanh toan" "feat: viec cua dong doi"

# ============ Kieu 1: Create a merge commit ============
git checkout -q -b thu-merge main
git merge -q --no-ff feat/gio-hang -m "Merge pull request #1 from feat/gio-hang" >/dev/null

# Giu nguyen ca ba commit cua PR, cong mot commit merge.
[ "$(git rev-list --count "$goc..HEAD")" = "5" ] || die "phai co 3 commit PR + 1 dong doi + 1 merge"
[ -n "$(git rev-list --merges -1 HEAD)" ] || die "phai co commit merge"
git log --format=%s | chua 'fix: sua theo review' || die "giu nguyen ca commit sua theo review"

# Commit goc cua PR van con nguyen hash -> `git branch --contains` tim ra duoc.
git merge-base --is-ancestor "$dinh_pr" HEAD || die "commit PR phai nam trong lich su"

# ============ Kieu 2: Squash and merge ============
git checkout -q -b thu-squash main
git merge -q --squash feat/gio-hang >/dev/null 2>&1
git commit -q -m "feat: them gio hang (#1)"

# Ba commit gop thanh MOT. Khong co commit merge.
[ "$(git rev-list --count "$goc..HEAD")" = "2" ] || die "phai co 1 commit gop + 1 cua dong doi"
[ -z "$(git rev-list --merges HEAD)" ] || die "squash khong tao commit merge"
git log --format=%s | chua 'sua theo review' && die "commit trung gian phai bien mat"

# Noi dung cuoi cung y het kieu 1 -- chi lich su khac.
[ "$(git show HEAD:gio-hang.js)" = "$(git show thu-merge:gio-hang.js)" ] \
  || die "noi dung file phai giong kieu merge"

# Nhung commit goc cua PR KHONG con nam trong lich su main.
git merge-base --is-ancestor "$dinh_pr" HEAD \
  && die "squash tao commit moi hoan toan, commit goc khong nam trong lich su"

# Hau qua thuc te: nhanh feat/gio-hang gio "chua duoc merge" duoi mat git, nen
# `git branch --merged` khong liet ke no, va `git branch -d` se tu choi (bai 42).
git branch --merged HEAD --format='%(refname:short)' | chua 'feat/gio-hang' \
  && die "git khong coi nhanh do la da merge"

# ============ Kieu 3: Rebase and merge ============
# Cach GitHub lam: phat lai tung commit cua PR len tren main, roi fast-forward.
# (cherry-pick khong co co -q nen phai tu dap output)
git checkout -q -b thu-rebase main
git cherry-pick "$goc..$dinh_pr" >/dev/null 2>&1 \
  || die "phat lai cac commit cua PR phai chay duoc"

# Giu ca ba commit, nhung KHONG co commit merge, va hash da doi (vi cha da khac).
[ "$(git rev-list --count "$goc..HEAD")" = "4" ] || die "phai co 3 commit PR + 1 cua dong doi"
[ -z "$(git rev-list --merges HEAD)" ] || die "rebase merge khong tao commit merge"
git log --format=%s | chua 'fix: sua theo review' || die "van giu ca ba commit"
git merge-base --is-ancestor "$dinh_pr" HEAD && die "hash da doi vi commit duoc phat lai"

# ============ So sanh ============
#
#   Kieu            | So commit vao main | Commit merge | Giu hash goc | Nhanh duoc coi la merged
#   ----------------|--------------------|--------------|--------------|-------------------------
#   Merge commit    | 3 + 1 merge        | co           | co           | co
#   Squash          | 1                  | khong        | KHONG        | KHONG
#   Rebase merge    | 3                  | khong        | KHONG        | KHONG
#
# Kiem chung lai bang so:
[ "$(git rev-list --count "$goc..thu-merge")"  = "5" ] || die "bang so lieu sai o kieu merge"
[ "$(git rev-list --count "$goc..thu-squash")" = "2" ] || die "bang so lieu sai o kieu squash"
[ "$(git rev-list --count "$goc..thu-rebase")" = "4" ] || die "bang so lieu sai o kieu rebase"

# Ca ba deu cho ra CUNG mot noi dung file cuoi cung:
a="$(git rev-parse thu-merge^{tree})"
b="$(git rev-parse thu-squash^{tree})"
c="$(git rev-parse thu-rebase^{tree})"
[ "$a" = "$b" ] && [ "$b" = "$c" ] || die "ba kieu phai cho cung noi dung cuoi cung"

echo "OK"
