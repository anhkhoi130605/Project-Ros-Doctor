#!/usr/bin/env bash
# Bai 02 tu viet ham so khop pattern de hieu co che. Bai nay dung chinh git lam trong tai
# (`git check-ignore`) de hoc ba thu ham do khong the hien: thu tu uu tien, dau ! phu dinh,
# va cai bay lon nhat -- .gitignore khong co tac dung voi file DA duoc theo doi.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

cd "$(new_sandbox_repo)"

# Hai ham doc hai thu khac nhau, va phan biet duoc chung la chia khoa cua bai:
#
#   bi_chan  -> cau tra loi CO/KHONG, lay tu exit code.
#   luat     -> luat nao da quyet dinh, lay tu co -v.
#
# Cho de nham: `check-ignore -v` in ra dong luat KE CA khi luat do la luat phu dinh (!),
# tuc la ke ca khi file KHONG bi chan. Nen khong duoc doc "co dong output" thanh
# "dang bi chan" -- phai xem exit code.
bi_chan() { git check-ignore -q "$1"; }
luat()    { git check-ignore -v "$1" 2>/dev/null | tr '\t' ' '; }

# --- Thu tu uu tien: luat SAU thang luat truoc ---
cat > .gitignore <<'RULES'
*.log
!quan-trong.log
RULES

bi_chan debug.log      || die "*.log phai chan debug.log"
bi_chan quan-trong.log && die "! phai mo lai cho quan-trong.log"

# Ca hai file deu co "luat quyet dinh", chi khac la mot cai chan va mot cai mo:
grep -q '\*.log'           <<< "$(luat debug.log)"      || die "luat chan debug.log phai la *.log"
grep -q '!quan-trong.log'  <<< "$(luat quan-trong.log)" || die "luat mo phai la !quan-trong.log"

# Dao thu tu hai dong -> ket qua nguoc lai, vi luat cuoi cung khop moi co hieu luc.
cat > .gitignore <<'RULES'
!quan-trong.log
*.log
RULES
bi_chan quan-trong.log || die "dao thu tu thi quan-trong.log phai bi chan lai"

# --- Cai bay: ! khong cuu duoc file nam trong thu muc da bi chan ---
# Ly do: git khong buoc vao thu muc da bi loai tru, nen no khong bao gio nhin thay file
# ben trong de ma xet luat ! cho no.
cat > .gitignore <<'RULES'
build/
!build/giu-lai.txt
RULES
mkdir -p build && printf 'x\n' > build/giu-lai.txt
bi_chan build/giu-lai.txt || die "! ben trong thu muc bi chan dang le KHONG co tac dung"

# Cach lam dung: chan cac file BEN TRONG thu muc, khong chan chinh thu muc.
cat > .gitignore <<'RULES'
build/*
!build/giu-lai.txt
RULES
bi_chan build/giu-lai.txt && die "dung build/* thi ! phai co tac dung"
bi_chan build/app.js      || die "cac file khac trong build/ van phai bi chan"

# --- Dau / o dau pattern neo vao goc repo ---
printf '%s\n' "/todo.md" > .gitignore
mkdir -p ghi-chu && printf 'x\n' > ghi-chu/todo.md && printf 'x\n' > todo.md
bi_chan todo.md         || die "/todo.md phai chan todo.md o goc"
bi_chan ghi-chu/todo.md && die "/todo.md khong duoc chan file trong thu muc con"

# Khong co dau / thi pattern khop o MOI cap.
printf '%s\n' "todo.md" > .gitignore
bi_chan ghi-chu/todo.md || die "khong co / thi phai chan o moi cap"

# --- .gitignore long nhau: file o thu muc con duoc uu tien hon ---
printf '%s\n' "*.tmp" > .gitignore
mkdir -p cache && printf '%s\n' "!giu.tmp" > cache/.gitignore
printf 'x\n' > cache/giu.tmp && printf 'x\n' > cache/bo.tmp
bi_chan cache/giu.tmp && die ".gitignore trong thu muc con phai thang cai o ngoai"
bi_chan cache/bo.tmp  || die "cache/bo.tmp van phai bi chan"

# --- Cai bay lon nhat: file DA theo doi thi .gitignore khong con y nghia ---
printf '%s\n' "SECRET=abc" > .env
git add -f .env && git commit -q -m "feat: commit nham .env"

printf '%s\n' ".env" > .gitignore
git add .gitignore && git commit -q -m "chore: them .env vao gitignore"

# .env dang nam trong .gitignore, nhung git van theo doi no nhu khong co gi:
git ls-files --error-unmatch .env >/dev/null 2>&1 \
  || die ".env dang le VAN con duoc theo doi du da nam trong .gitignore"

# Sua tiep file do thi thay doi van hien ra binh thuong.
printf '%s\n' "SECRET=xyz" > .env
[ -n "$(git status --porcelain .env)" ] \
  || die "file da theo doi thi thay doi cua no van phai hien ra"

# Phai bao git ngung theo doi (bai 16) thi .gitignore moi bat dau co tac dung.
git rm -q --cached .env
git commit -q -m "chore: ngung theo doi .env"
bi_chan .env || die "sau khi bo theo doi thi .gitignore moi chan duoc"

echo "OK"
