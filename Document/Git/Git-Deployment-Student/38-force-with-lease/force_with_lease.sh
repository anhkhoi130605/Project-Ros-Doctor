#!/usr/bin/env bash
# Doi khi phai ghi de lich su tren remote that: sau khi rebase nhanh cua minh, hoac sau khi
# amend mot commit da push. `--force` lam duoc, nhung no ghi de MU -- khong kiem tra xem trong
# luc do co ai day them gi len khong. `--force-with-lease` kiem tra dieu do.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

remote="$(new_bare_remote)"

cd "$(new_sandbox_repo)"
git remote add origin "$remote"
commit_file app.js "phien ban 1" "feat: khoi tao"
git push -q -u origin main
goc="$(git rev-parse HEAD)"
cua_ban="$PWD"

dong_doi="$(sandbox_clone "$remote" "$SANDBOX_ROOT/dong-doi")"

# Tinh huong that: ban dang lam tren nhanh rieng, rebase lai cho gon truoc khi mo PR.
dung_canh() {
  cd "$cua_ban"
  git checkout -q main

  # Don nhanh cu neu co. Viet bang `co-thi-moi-xoa` thay vi `xoa || true`: cach sau cung chay
  # nhung no nuot MOI loi, ke ca loi that su -- con cach nay chi bo qua dung truong hop
  # "chua ton tai", va doc la biet ngay y dinh.
  git show-ref --verify -q refs/heads/tinh-nang && git branch -D tinh-nang >/dev/null
  git ls-remote --exit-code --heads origin tinh-nang >/dev/null 2>&1 \
    && git push -q origin --delete tinh-nang

  git checkout -q -b tinh-nang "$goc"
  commit_file a.js "ban nhap" "feat: ban nhap"
  git push -q -u origin tinh-nang

  # Ban sua lai commit (amend) -> lich su cuc bo khac han lich su tren server.
  printf '%s\n' "ban da don" > a.js
  git add a.js
  git commit -q --amend -m "feat: tinh nang hoan chinh"
  return 0
}

# --- Push thuong bi tu choi vi da viet lai lich su ---
dung_canh
git push -q origin tinh-nang >/dev/null 2>&1 && die "viet lai lich su thi push thuong phai bi tu choi"

# --- --force-with-lease: cho phep, VI khong ai dong vao trong luc do ---
git push -q --force-with-lease origin tinh-nang \
  || die "khong ai day them gi thi --force-with-lease phai cho qua"
[ "$(git rev-parse origin/tinh-nang)" = "$(git rev-parse HEAD)" ] || die "remote phai nhan lich su moi"

# --- Tinh huong nguy hiem: co nguoi day len trong luc ban dang lam ---
dung_canh

# Dong doi lay nhanh cua ban ve va them mot commit (review xong sua giup, chuyen rat thuong).
git -C "$dong_doi" fetch -q origin
git -C "$dong_doi" checkout -q -B tinh-nang origin/tinh-nang
printf '%s\n' "dong doi sua them" > "$dong_doi/b.js"
git -C "$dong_doi" add b.js && git -C "$dong_doi" commit -qm "fix: sua theo review"
git -C "$dong_doi" push -q origin tinh-nang
commit_cua_ho="$(git -C "$dong_doi" rev-parse HEAD)"

# May ban VAN dang nho vi tri cu cua origin/tinh-nang -- chua fetch nen chua biet gi.
[ "$(git rev-parse origin/tinh-nang)" != "$commit_cua_ho" ] || die "ban chua fetch nen chua biet"

# --force-with-lease so vi tri THAT tren server voi vi tri ban dang NHO. Lech -> tu choi.
git push -q --force-with-lease origin tinh-nang >/dev/null 2>&1 \
  && die "co nguoi day len thi --force-with-lease phai tu choi"

# Commit cua ho van con nguyen tren server.
git fetch -q origin
[ "$(git rev-parse origin/tinh-nang)" = "$commit_cua_ho" ] || die "commit cua dong doi phai con"

# --- Trong khi do --force ghi de mu, khong hoi gi ---
git push -q --force origin tinh-nang || die "--force thi luon lam duoc, do moi la van de"
git fetch -q origin
[ "$(git rev-parse origin/tinh-nang)" != "$commit_cua_ho" ] || die "--force da day commit cua ho di"

# --- Cai bay: fetch tu dong lam --force-with-lease mat tac dung ---
# Lease duoc so voi nhanh remote-tracking tren may ban. Neu ban (hoac mot cong cu, hoac IDE)
# vua fetch xong, ghi nho do da duoc cap nhat thanh vi tri moi -> lease khop -> push di qua,
# va ban ghi de dung cai vua fetch ve ma chua he doc.
dung_canh
git -C "$dong_doi" fetch -q origin
git -C "$dong_doi" checkout -q -B tinh-nang origin/tinh-nang
printf '%s\n' "them lan hai" > "$dong_doi/c.js"
git -C "$dong_doi" add c.js && git -C "$dong_doi" commit -qm "fix: sua them lan hai"
git -C "$dong_doi" push -q origin tinh-nang
ho_lan_hai="$(git -C "$dong_doi" rev-parse HEAD)"

git fetch -q origin          # <- chinh dong nay lam mat tac dung bao ve
git push -q --force-with-lease origin tinh-nang \
  || die "sau khi fetch, lease khop nen push di qua duoc"
git fetch -q origin
[ "$(git rev-parse origin/tinh-nang)" != "$ho_lan_hai" ] || die "commit cua ho da bi ghi de"

# Cach chan chac hon: noi ro ban ky vong remote dang o dau.
#   git push --force-with-lease=tinh-nang:<hash-ban-da-xem> origin tinh-nang
dung_canh
git -C "$dong_doi" fetch -q origin
git -C "$dong_doi" checkout -q -B tinh-nang origin/tinh-nang
printf '%s\n' "lan ba" > "$dong_doi/d.js"
git -C "$dong_doi" add d.js && git -C "$dong_doi" commit -qm "fix: lan ba"
git -C "$dong_doi" push -q origin tinh-nang

hash_ban_da_xem="$(git rev-parse origin/tinh-nang)"
git fetch -q origin
git push -q --force-with-lease="tinh-nang:$hash_ban_da_xem" origin tinh-nang >/dev/null 2>&1 \
  && die "chi ro hash thi du da fetch van phai tu choi"

echo "OK"
