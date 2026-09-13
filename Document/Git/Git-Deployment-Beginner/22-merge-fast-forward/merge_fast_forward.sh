#!/usr/bin/env bash
# Co hai kieu merge hoan toan khac nhau, va git tu chon giup ban ma khong noi gi:
# fast-forward (chi dich con tro, khong tao commit nao) va merge that (tao commit co hai cha).
# Biet phan biet la biet vi sao doi khi merge xong lich su "mat" ten nhanh.
set -euo pipefail
. "$(dirname "$0")/../../lib/sandbox.sh"

cd "$(new_sandbox_repo)"

commit_file app.js "v1" "feat: khoi tao"
goc="$(git rev-parse HEAD)"

# --- Truong hop 1: fast-forward duoc ---
# main dung yen tu luc tach nhanh -> lich su cua feature da chua toan bo lich su cua main.
git checkout -q -b tinh-nang
commit_file tinh-nang.js "noi dung" "feat: them tinh nang"
dinh_nhanh="$(git rev-parse HEAD)"

git checkout -q main
so_commit_truoc="$(git rev-list --count HEAD)"

git merge -q tinh-nang

# Khong co commit merge nao duoc tao. Git chi ghi lai con tro main sang dung cho ma
# tinh-nang dang dung -- dung nghia "chay nhanh len phia truoc".
[ "$(git rev-parse HEAD)" = "$dinh_nhanh" ] || die "sau FF, main phai tro dung vao dinh cua nhanh"
[ "$(git rev-list --count HEAD)" = "$((so_commit_truoc + 1))" ] \
  || die "FF khong duoc tao them commit nao ngoai commit cua nhanh"
[ -z "$(git rev-list --merges HEAD)" ] || die "FF khong duoc sinh ra commit merge"

# Hau qua: lich su thanh mot duong thang, khong con dau vet nao cho biet tung co nhanh
# ten `tinh-nang`. Voi nhanh nho thi gon; voi mot PR gom 8 commit thi mat het ranh gioi.

# --- Truong hop 2: bat git tao commit merge du co the FF ---
git checkout -q -b tinh-nang-2
commit_file hai.js "noi dung 2" "feat: them tinh nang 2"
git checkout -q main
git merge -q --no-ff tinh-nang-2 -m "merge: dua tinh-nang-2 vao main"

[ -n "$(git rev-list --merges -1 HEAD)" ] || die "--no-ff phai tao commit merge"
# Commit merge co dung hai cha.
[ "$(git rev-parse HEAD^1)" != "$(git rev-parse HEAD^2)" ] || die "commit merge phai co hai cha khac nhau"

# Bay gio lich su giu lai ranh gioi cua nhanh: doc `git log --first-parent` la thay
# dung mot dong cho ca nhanh do, khong bi tron commit ben trong.

# --- Truong hop 3: khong the FF vi hai ben da re nhau ---
git checkout -q -b tinh-nang-3 "$goc"
commit_file ba.js "tu nhanh 3" "feat: tinh nang 3"

git checkout -q main
commit_file main-rieng.js "chi tren main" "feat: viec rieng cua main"

# Luc nay main co commit ma nhanh 3 khong co, va nguoc lai -> khong con la duong thang.
# `--ff-only` bao git: neu khong FF duoc thi dung lai, dung tu y tao commit merge.
git merge -q --ff-only tinh-nang-3 2>/dev/null && die "da re nhanh thi --ff-only phai that bai"

# Va repo phai con nguyen, khong dang o giua mot merge do dang.
[ ! -f .git/MERGE_HEAD ] || die "--ff-only that bai khong duoc de lai merge do dang"

# Merge binh thuong thi git tu tao commit merge (day la merge 3-way, bai 26).
git merge -q tinh-nang-3 -m "merge: dua tinh-nang-3 vao main"
[ -n "$(git rev-list --merges -1 HEAD)" ] || die "khi da re nhanh, merge phai tao commit merge"

# --- Kiem tra nhanh co the FF duoc hay khong TRUOC khi merge ---
# `merge-base --is-ancestor A B` = A co nam trong lich su cua B khong.
# Neu dinh main la to tien cua nhanh -> FF duoc.
git checkout -q -b tinh-nang-4
commit_file bon.js "x" "feat: tinh nang 4"
git checkout -q main
git merge-base --is-ancestor main tinh-nang-4 || die "truong hop nay dang le FF duoc"

commit_file main-rieng-2.js "y" "feat: main lai di tiep"
git merge-base --is-ancestor main tinh-nang-4 && die "main da di tiep thi khong con FF duoc"

echo "OK"
