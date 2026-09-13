# git rm va git mv -- va co --cached cuu ban

## 1. De bai
`git rm` va `git mv` khong lam duoc gi ma `rm`/`mv` roi `git add` khong lam duoc: chung chi gop
hai buoc thanh mot. Nhung co **mot** co that su khong the thay the la `git rm --cached`, va do
dung la co ban can den luc commit nham `.env` len repo.

## 2. Y tuong -- Checklist
1. `rm file` -- git thay file mat o **working tree**: status la `" D"`. Phai `git add file` nua
   thi viec xoa moi vao index.
2. `git rm file` -- xoa tren dia **va** ghi vao index luon: status thanh `"D  "`.
3. `git rm --cached file` -- **git ngung theo doi** file nhung **giu nguyen file tren dia**.
   Sau lenh nay cung mot file hien ra hai dong trong `git status`:
   ```
   D  .env     <- index: da bo theo doi
   ?? .env     <- working tree: file van do, gio thanh file chua theo doi
   ```
4. Ngay sau `--cached`, phai them file vao `.gitignore`. Khong thi lan `git add .` sau se
   commit lai y nhu cu.
5. `git mv a b` = `mv a b` + `git add -A`. Git **khong luu "phep doi ten"** o dau ca -- no so
   noi dung hai file va tu suy ra khi ban xem diff. Nen ca hai cach deu cho ra `R` trong
   `git show --name-status`.

## 3. Diem nhan thuc te
- `git rm --cached` **khong** xoa file khoi lich su. Ai clone repo va xem commit cu van doc
  duoc noi dung `.env` do. Neu day la secret that thi phai coi nhu **da bi lo**: doi key ngay,
  roi moi tinh den viec viet lai lich su (bai 74).
- Vi git tu suy ra doi ten tu noi dung, neu ban doi ten **va** sua nhieu trong cung mot commit
  thi git se bao "xoa file cu, them file moi" thay vi "doi ten". Mat het lich su theo doi file.
  Cach lam: doi ten trong mot commit, sua noi dung trong commit sau.
- `git mv` co loi nho la bao loi ngay khi dich da ton tai, con `mv` thuong thi ghi de im lang.
- `git rm -r --cached .` roi `git add .` la cach thuong dung de ap dung `.gitignore` moi cho
  toan repo -- no khong xoa file nao tren dia, chi bat git doc lai danh sach theo doi.

## 4. Loi giai
[`xoa_va_doi_ten.sh`](xoa_va_doi_ten.sh) di lan luot: xoa bang tay (`" D"` -> add -> `"D  "`),
`git rm`, roi dung `git rm --cached` cho tinh huong commit nham `.env` -- kem mot dong kiem chung
rang commit cu **van** doc duoc secret. Phan cuoi so `git mv` voi `mv` + `add` de thay ca hai
deu ra `R`.

## 5. Self-check
```bash
bash xoa_va_doi_ten.sh
```
Kiem tra du an cua ban co dang theo doi file dang le khong duoc commit:
```bash
git ls-files | grep -E '\.env|\.pem|\.key' || echo "sach"
```
