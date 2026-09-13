#!/usr/bin/env bash
# Conflict trong file khoa phu thuoc (package-lock.json, yarn.lock, go.sum, Gemfile.lock) la
# loai conflict hay gap nhat va cung la loai bi giai sai nhieu nhat. Ly do: no trong nhu mot
# file van ban binh thuong nen ai cung giai tay -- trong khi cach dung la KHONG giai tay.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

cd "$(new_sandbox_repo)"

# package.json va lockfile luon di theo cap: package.json ghi y muon ("^4.17.0"),
# lockfile ghi ket qua da giai ("4.17.21" kem hash cua tung goi phu thuoc).
cat > package.json <<'JSON'
{
  "dependencies": {
    "express": "^4.18.0"
  }
}
JSON
cat > package-lock.json <<'JSON'
{
  "packages": {
    "node_modules/express": { "version": "4.18.0", "integrity": "sha512-AAA" }
  }
}
JSON
git add . && git commit -q -m "chore: khoi tao phu thuoc"
goc="$(git rev-parse HEAD)"

# --- Hai nguoi cung them mot goi, moi nguoi chay npm install tren may minh ---
git checkout -q -b them-lodash
cat > package.json <<'JSON'
{
  "dependencies": {
    "express": "^4.18.0",
    "lodash": "^4.17.21"
  }
}
JSON
cat > package-lock.json <<'JSON'
{
  "packages": {
    "node_modules/express": { "version": "4.18.0", "integrity": "sha512-AAA" },
    "node_modules/lodash": { "version": "4.17.21", "integrity": "sha512-BBB" }
  }
}
JSON
git commit -qam "feat: them lodash"

git checkout -q main
cat > package.json <<'JSON'
{
  "dependencies": {
    "express": "^4.18.0",
    "dayjs": "^1.11.0"
  }
}
JSON
cat > package-lock.json <<'JSON'
{
  "packages": {
    "node_modules/express": { "version": "4.18.0", "integrity": "sha512-AAA" },
    "node_modules/dayjs": { "version": "1.11.9", "integrity": "sha512-CCC" }
  }
}
JSON
git commit -qam "feat: them dayjs"

# --- Merge: ca hai file deu conflict ---
git merge them-lodash -m "merge: gop lodash" >/dev/null 2>&1 && die "dang le phai conflict"

conflict="$(git diff --name-only --diff-filter=U | sort | tr '\n' ' ')"
[ "$conflict" = "package-lock.json package.json " ] \
  || die "ca hai file phai conflict, dang la: $conflict"

# --- Buoc 1: giai package.json BANG TAY (day la file nguoi viet) ---
# Gop y dinh cua ca hai ben: giu ca lodash lan dayjs.
cat > package.json <<'JSON'
{
  "dependencies": {
    "express": "^4.18.0",
    "dayjs": "^1.11.0",
    "lodash": "^4.17.21"
  }
}
JSON
git add package.json

# --- Buoc 2: KHONG giai lockfile bang tay ---
# Ly do: lockfile la ket qua SINH RA tu package.json, khong phai thu nguoi viet. Ghep tay hai
# ben lai gan nhu chac chan cho ra mot cay phu thuoc khong nhat quan: thieu goi phu, sai hash,
# hoac phien ban khong thoa man rang buoc cua goi khac. Va no chay duoc tren may ban, roi hong
# tren CI hoac tren may nguoi khac -- kieu loi ton nhieu thoi gian nhat de tim.
#
# Cach dung: vut ban dang conflict di, sinh lai tu package.json da giai xong.
#   npm install            (npm)
#   yarn install           (yarn)
#   go mod tidy            (Go)
#   bundle install         (Ruby)
#
# O day khong co npm nen mo phong dung buoc do: lay mot ban bat ky roi sinh lai tu dau.
git checkout --theirs -- package-lock.json

# "Sinh lai" -- trong du an that day la viec cua npm, khong phai cua ban.
sinh_lai_lockfile() {
  # Doc danh sach goi tu package.json roi dung lai lockfile cho khop.
  {
    echo '{'
    echo '  "packages": {'
    echo '    "node_modules/express": { "version": "4.18.0", "integrity": "sha512-AAA" },'
    echo '    "node_modules/dayjs": { "version": "1.11.9", "integrity": "sha512-CCC" },'
    echo '    "node_modules/lodash": { "version": "4.17.21", "integrity": "sha512-BBB" }'
    echo '  }'
    echo '}'
  } > package-lock.json
}
sinh_lai_lockfile
git add package-lock.json

grep -q '<<<<<<<' package-lock.json && die "lockfile khong duoc con dau conflict"
git commit -q --no-edit

# --- Kiem chung: lockfile phai khop voi package.json ---
# Moi goi trong package.json phai co mat trong lockfile. Day chinh la thu bi pha khi ghep tay.
for goi in express dayjs lodash; do
  grep -q "\"$goi\"" package.json      || die "$goi phai co trong package.json"
  grep -q "node_modules/$goi" package-lock.json || die "$goi phai co trong lockfile"
done

# --- Giam conflict lockfile ngay tu dau: .gitattributes ---
# Danh dau lockfile la "khong merge tu dong" -- git se de nguyen ban cua ben ta va bat ban
# xu ly co y thuc, thay vi tron hai ban thanh mot mo hon do.
printf '%s\n' "package-lock.json merge=binary -diff" > .gitattributes
git add .gitattributes && git commit -q -m "chore: khong tu dong merge lockfile"

# `-diff` con lam git thoi in ca nghin dong diff cua lockfile khi review -- doc PR de tho hon nhieu.
grep -q 'merge=binary' .gitattributes || die ".gitattributes phai co luat cho lockfile"

echo "OK"
