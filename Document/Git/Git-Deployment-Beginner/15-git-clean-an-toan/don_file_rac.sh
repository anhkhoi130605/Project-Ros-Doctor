#!/usr/bin/env bash
# `git clean` xoa file THAT tren dia va khong co reflog nao cuu lai duoc -- day la mot trong
# vai lenh git that su lam mat du lieu. Bai nay di qua tung co de biet chinh xac moi co
# xoa nhung gi, va vi sao phai go -n truoc khi go -f.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

cd "$(new_sandbox_repo)"

# --- Dung mot thu muc lam viec giong du an that ---
commit_file src/app.js "console.log('app')" "feat: khoi tao app"
printf '%s\n' "node_modules/" > .gitignore
printf '%s\n' ".env" >> .gitignore
git add .gitignore && git commit -q -m "chore: them gitignore"

# Ba loai file khong duoc theo doi, ban chat khac nhau han:
printf '%s\n' "console.log('ghi chu')" > ghi-chu.js        # rac that, quen xoa
mkdir -p build && printf '%s\n' "output" > build/app.js    # rac nam trong thu muc moi
mkdir -p node_modules/express && printf '%s\n' "x" > node_modules/express/index.js
printf '%s\n' "DB_PASSWORD=that-su-quan-trong" > .env      # bi ignore NHUNG khong phai rac

# --- git clean -n : chi bao se xoa gi, khong xoa ---
# Luon go co nay truoc. `git clean` khong hoi lai, khong undo duoc.
du_kien="$(git clean -n)"
grep -q 'ghi-chu.js' <<< "$du_kien" || die "clean -n phai liet ke ghi-chu.js"
[ -f ghi-chu.js ] || die "clean -n khong duoc xoa gi ca"

# --- Mac dinh: KHONG nhin vao thu muc moi, KHONG cham file bi ignore ---
# Cho nay hay lam nguoi ta tuong da don sach: `git clean -n` khong he liet ke build/,
# vi mac dinh git bo qua ca thu muc chua duoc theo doi. Phai them -d moi thay.
grep -q 'build' <<< "$du_kien" && die "clean -n khong duoc liet ke thu muc build/ khi chua co -d"
grep -q 'node_modules' <<< "$du_kien" && die "clean mac dinh khong duoc cham file bi ignore"
grep -q '.env' <<< "$du_kien" && die "clean mac dinh khong duoc cham .env (dang bi ignore)"

# Them -d thi thu muc moi hien ra.
git clean -nd | chua 'build/' || die "clean -nd phai bao thu muc build/"

# --- -f xoa file, nhung thu muc thi phai them -d ---
git clean -qf
[ ! -f ghi-chu.js ] || die "clean -f phai xoa ghi-chu.js"
[ -f build/app.js ] || die "clean -f mot minh khong xoa duoc file trong thu muc moi"

git clean -qfd
[ ! -d build ] || die "clean -fd phai xoa ca thu muc build/"

# File bi ignore van con nguyen -- day la hanh vi dung va la thu bao ve ban.
[ -f node_modules/express/index.js ] || die "clean -fd khong duoc cham node_modules"
[ -f .env ] || die "clean -fd khong duoc cham .env"

# --- -x : xoa CA file bi ignore. Day la co nguy hiem nhat ---
# Rat nhieu nguoi go `git clean -xfd` de "lam sach cho gon" roi mat file .env
# khong co ban sao o dau -- vi .env dung ra la khong duoc commit.
du_kien_x="$(git clean -nxd)"
grep -q '.env' <<< "$du_kien_x" || die "clean -nxd phai canh bao se xoa ca .env"

# Muon xoa cache/build ma giu .env thi loai tru ra bang -e:
git clean -qxfd -e .env
[ ! -d node_modules ] || die "clean -xfd phai xoa node_modules"
[ -f .env ] || die "-e .env phai giu lai .env"

# --- File dang theo doi thi clean khong bao gio cham den ---
[ -f src/app.js ] || die "clean khong duoc xoa file da commit"

echo "OK"
