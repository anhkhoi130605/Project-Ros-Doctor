#!/usr/bin/env bash
# `git rebase -i` mo mot danh sach viec (todo list) roi lam dung nhung gi ban ghi trong do.
# Nghe dang so nhung thuc ra rat de kiem soat: ban sua mot file van ban, luu, git thi hanh.
# Bai nay thay editor bang lenh tu dong de tung thao tac deu kiem chung duoc.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

cd "$(new_sandbox_repo)"
commit_file app.js "phien ban 1" "feat: khoi tao"
goc="$(git rev-parse HEAD)"

dung_lai_bon_commit() {
  git checkout -q -B thu "$goc"
  commit_file a.js "a" "feat: them A"
  commit_file b.js "b" "feta: them B"      # co y go sai chinh ta, de phan reword sua
  commit_file c.js "c" "feat: them C"
  commit_file d.js "d" "feat: them D"
  return 0
}

# GIT_SEQUENCE_EDITOR nhan mot LENH; git goi lenh do kem duong dan file todo lam tham so.
# Dat no bang sed tuc la ta dang sua file todo y nhu go tay, chi la tu dong.
rebase_voi() { GIT_SEQUENCE_EDITOR="$1" git rebase -q -i "$goc" >/dev/null 2>&1; }

# --- Xem file todo that su chua gi ---
# Git chay lenh trong GIT_SEQUENCE_EDITOR va NOI duong dan file todo vao cuoi. Nen mot lenh
# nhu `tee ban-sao.txt` se tro thanh `tee ban-sao.txt <file-todo>` -- tee coi ca hai la file
# dau ra va CAT RONG file todo, rebase chet ngay. An toan nhat la mot script nhan "$1".
dung_lai_bon_commit
todo="$SANDBOX_ROOT/todo.txt"
luu_todo="$SANDBOX_ROOT/luu-todo.sh"
cat > "$luu_todo" <<SH
#!/usr/bin/env bash
cp "\$1" "$todo"      # chi sao chep de xem, khong sua -> rebase chay tiep binh thuong
SH
rebase_voi "bash $luu_todo" || die "rebase de xem todo phai chay duoc"

[ "$(grep -c '^pick ' "$todo")" = "4" ] || die "todo phai co 4 dong pick"
chua 'feat: them A' < "$todo" || die "todo phai liet ke tung commit"
# Cuoi file la phan huong dan liet ke moi lenh dung duoc.
chua 'reword' < "$todo" || die "todo phai kem huong dan cac lenh"

# Thu tu trong todo di tu CU den MOI -- nguoc voi `git log`. Nham cho nay la squash nham chieu.
# -m1 doc thang tu FILE nen khong co duong ong nao de gay SIGPIPE (khac `| head -1`).
chua 'them A' <<< "$(grep -m1 '^pick ' "$todo")" || die "dong dau todo phai la commit CU nhat"
[ "$(git log --format=%s -1)" = "feat: them D" ] || die "con git log thi moi nhat len dau"

# --- Khong sua gi thi giu nguyen ---
dung_lai_bon_commit
GIT_SEQUENCE_EDITOR=true git rebase -q -i "$goc" >/dev/null 2>&1
[ "$(git rev-list --count "$goc..HEAD")" = "4" ] || die "khong sua todo thi giu nguyen 4 commit"

# --- drop: bo han mot commit (xoa dong khoi todo) ---
dung_lai_bon_commit
rebase_voi "sed -i '/feat: them C/d'" || die "rebase drop phai chay duoc"
[ "$(git rev-list --count "$goc..HEAD")" = "3" ] || die "drop phai con 3 commit"
git log --format=%s | chua 'them C' && die "commit C phai bien mat"
[ -f c.js ] && die "file cua commit C phai bien mat theo"
[ -f d.js ] || die "commit sau no van phai con"

# --- reword: doi message, giu nguyen noi dung ---
# reword can them editor cho MESSAGE, nen phai dat ca GIT_EDITOR.
dung_lai_bon_commit
GIT_SEQUENCE_EDITOR="sed -i 's/^pick \(.*\)feta: them B/reword \1feta: them B/'" \
  GIT_EDITOR="sed -i '1s/.*/feat: them B/'" \
  git rebase -q -i "$goc" >/dev/null 2>&1 || die "rebase reword phai chay duoc"

git log --format=%s | chua '^feat: them B$' || die "message phai duoc sua lai"
git log --format=%s | chua 'feta' && die "khong con loi chinh ta"
[ "$(git rev-list --count "$goc..HEAD")" = "4" ] || die "reword khong lam doi so commit"
[ -f b.js ] || die "noi dung commit khong doi"

# --- Mau khong khop thi git KHONG lam gi, va cung khong bao loi ---
# Day la cho de tuong minh da sua ma thuc ra chua. Mau duoi day go "feat" trong khi message
# that la "feta" -- sed khong doi duoc dong nao, todo van la 4 dong pick.
dung_lai_bon_commit
rebase_voi "sed -i 's/^pick \(.*\)feat: them B/fixup \1feat: them B/'" \
  || die "rebase van chay binh thuong"
[ "$(git rev-list --count "$goc..HEAD")" = "4" ] || die "mau khong khop -> khong gop duoc gi"

# --- fixup: gop commit vao commit ngay TRUOC no, vut message di ---
dung_lai_bon_commit
rebase_voi "sed -i 's/^pick \(.*\)feta: them B/fixup \1feta: them B/'" \
  || die "rebase fixup phai chay duoc"

[ "$(git rev-list --count "$goc..HEAD")" = "3" ] || die "fixup phai giam 1 commit"
git log --format=%s | chua 'them B' && die "message cua B bi vut di khi dung fixup"
[ -f a.js ] && [ -f b.js ] || die "noi dung cua ca A lan B phai con"
git show --name-only --format= HEAD~2 | chua 'b.js' || die "b.js phai nam trong commit A"

# --- squash: cung gop, nhung GHEP ca hai message ---
dung_lai_bon_commit
GIT_SEQUENCE_EDITOR="sed -i 's/^pick \(.*\)feta: them B/squash \1feta: them B/'" \
  GIT_EDITOR=true \
  git rebase -q -i "$goc" >/dev/null 2>&1 || die "rebase squash phai chay duoc"

[ "$(git rev-list --count "$goc..HEAD")" = "3" ] || die "squash cung giam 1 commit"
# Khac fixup: message cua B duoc giu lai trong than commit gop.
git log --format=%B HEAD~2 | chua 'them B' || die "squash phai giu message cua B"

# --- Doi thu tu: chi la doi thu tu dong trong todo ---
# Viet han mot script nho cho de doc, thay vi nhoi vao mot dong sed.
doi_thu_tu="$SANDBOX_ROOT/dua-dong-cuoi-len-dau.sh"
cat > "$doi_thu_tu" <<'SH'
#!/usr/bin/env bash
# git goi script nay kem duong dan file todo. Dua dong pick CUOI cung len dau.
set -euo pipefail
todo="$1"
cuoi="$(grep '^pick ' "$todo" | tail -1)"
{ printf '%s\n' "$cuoi"; grep '^pick ' "$todo" | grep -vxF "$cuoi"; } > "$todo.moi"
mv "$todo.moi" "$todo"
SH
chmod +x "$doi_thu_tu"

dung_lai_bon_commit
rebase_voi "bash $doi_thu_tu" || die "rebase doi thu tu phai chay duoc"

[ "$(git rev-list --count "$goc..HEAD")" = "4" ] || die "van du 4 commit"
[ "$(git log --format=%s "$goc..HEAD" | tail -1)" = "feat: them D" ] \
  || die "D phai thanh commit dau tien"
[ "$(git log --format=%s -1)" = "feat: them C" ] || die "C gio la commit moi nhat"

# Doi thu tu chi an toan khi cac commit doc lap voi nhau. Neu D sua file ma A tao ra,
# dua D len truoc se conflict ngay -- va do la git dang noi "thu tu nay khong co nghia".

echo "OK"
