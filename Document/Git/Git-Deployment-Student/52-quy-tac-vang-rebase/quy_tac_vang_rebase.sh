#!/usr/bin/env bash
# Quy tac vang: DUNG rebase lich su ma nguoi khac dang dung lam nen. Ai cung thuoc cau nay
# nhung it ai thay hau qua cu the. Bai nay dung lai tai nan do tren hai ban sao that, va do
# thiet hai bang so: commit bi nhan doi, va cong viec bi mat han.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

remote="$(new_bare_remote)"
cd "$(new_sandbox_repo)"
git remote add origin "$remote"
commit_file app.js "phien ban 1" "feat: khoi tao"
git push -q -u origin main

# Ban va dong doi cung lam tren mot nhanh chung.
git checkout -q -b tinh-nang-chung
commit_file a.js "a" "feat: buoc 1"
commit_file b.js "b" "feat: buoc 2"
git push -q -u origin tinh-nang-chung
cua_ban="$PWD"

dong_doi="$(sandbox_clone "$remote" "$SANDBOX_ROOT/dong-doi")"
git -C "$dong_doi" checkout -q -b tinh-nang-chung origin/tinh-nang-chung

# Dong doi da lay nhanh nay ve va bat dau lam tiep tren do.
printf '%s\n' "c" > "$dong_doi/c.js"
git -C "$dong_doi" add c.js
git -C "$dong_doi" commit -qm "feat: buoc 3 cua dong doi"
viec_dong_doi="$(git -C "$dong_doi" rev-parse HEAD)"

# --- Ban rebase lich su DA PUSH ---
# Vi du: don lai message cho dep truoc khi mo PR.
cd "$cua_ban"
GIT_SEQUENCE_EDITOR="sed -i 's/^pick \(.*\)feat: buoc 1/reword \1feat: buoc 1/'" \
  GIT_EDITOR="sed -i '1s/.*/feat: buoc 1 (da don)/'" \
  git rebase -q -i HEAD~2 >/dev/null 2>&1 || die "rebase phai chay duoc"

git push -q --force-with-lease origin tinh-nang-chung || die "push de len duoc"

# --- Hau qua o phia dong doi ---
git -C "$dong_doi" fetch -q origin

# Nhanh cua ho va nhanh tren server gio KHONG con to tien chung gan nhat la diem ho tach ra.
# Hai buoc dau tien da bi thay bang hai commit khac hash nhung cung noi dung.
[ "$(git -C "$dong_doi" rev-list --count 'tinh-nang-chung..origin/tinh-nang-chung')" = "2" ] \
  || die "server co 2 commit ma ho khong co"
[ "$(git -C "$dong_doi" rev-list --count 'origin/tinh-nang-chung..tinh-nang-chung')" = "3" ] \
  || die "ho co 3 commit ma server khong co"

# Ba commit do la: hai ban CU cua buoc 1, buoc 2, cong viec that cua ho.
# Neu ho lam theo phan xa thong thuong -- pull cho het bao loi -- thi:
git -C "$dong_doi" -c pull.rebase=false pull -q origin tinh-nang-chung >/dev/null 2>&1 \
  || die "pull merge se chay duoc, va do moi la van de"

# Lich su bay gio chua CA HAI ban cua buoc 1 va buoc 2: ban cu va ban da rebase.
so_buoc_1="$(git -C "$dong_doi" log --format=%s | grep -c 'buoc 1' || true)"
[ "$so_buoc_1" = "2" ] || die "buoc 1 phai xuat hien 2 lan, dem duoc $so_buoc_1"
so_buoc_2="$(git -C "$dong_doi" log --format=%s | grep -c 'buoc 2' || true)"
[ "$so_buoc_2" = "2" ] || die "buoc 2 phai xuat hien 2 lan, dem duoc $so_buoc_2"

# Do la "lich su nhan doi": doc log thay moi viec lam hai lan, khong biet cai nao that.
# Va neu ho day len, ca doi ngu se nhan mo hon nay.

# --- Cach hong nang hon: ho lam theo loi khuyen tren mang la reset --hard ---
git -C "$dong_doi" checkout -q -B tinh-nang-chung "$viec_dong_doi"
git -C "$dong_doi" reset -q --hard origin/tinh-nang-chung

# Cong viec cua ho bien mat hoan toan khoi nhanh.
git -C "$dong_doi" cat-file -e "$viec_dong_doi" || die "commit van con trong repo cua ho"
[ -z "$(git -C "$dong_doi" branch --contains "$viec_dong_doi" 2>/dev/null)" ] \
  || die "khong nhanh nao con chua viec cua ho"
[ -f "$dong_doi/c.js" ] && die "file cua ho da bien mat khoi thu muc lam viec"

# Cuu duoc bang reflog (bai 24) -- neu ho biet den no.
git -C "$dong_doi" reflog | chua "$(git -C "$dong_doi" rev-parse --short "$viec_dong_doi")" \
  || die "reflog van con dau vet"

# --- Ranh gioi an toan ---
# An toan  : rebase commit CHUA push, hoac nhanh PR chi minh ban dung (bai 38-39).
# Khong an toan: rebase nhanh chung ma nguoi khac da tach ra tu do.
#
# Kiem tra nhanh "commit nay da len server chua":
cd "$cua_ban"
git fetch -q origin
commit_moi="$(git rev-parse HEAD)"
git merge-base --is-ancestor "$commit_moi" origin/tinh-nang-chung \
  || die "commit nay dang o tren server -> viet lai no la dong den nguoi khac"

# Cach dung khi lich su chung da lo bi viet lai: bao ca doi ngu, va nguoi khac chay
#   git rebase --onto origin/<nhanh> <hash-cu-cua-nhanh> <nhanh-cua-ho>
# de dat lai phan viec CUA RIENG HO len nen moi (bai 53) -- thay vi merge hay reset --hard.

echo "OK"
