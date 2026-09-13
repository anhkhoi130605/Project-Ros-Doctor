# Conflict trong lockfile -- dung giai bang tay

## 1. De bai
Hai nguoi cung them mot goi phu thuoc, moi nguoi chay `npm install` tren may minh. Merge lai:
`package.json` conflict, va `package-lock.json` conflict hang tram dong. Day la loai conflict
hay gap nhat va bi giai sai nhieu nhat.

## 2. Y tuong -- Checklist
Mau chot: `package.json` la thu **nguoi viet**, con lockfile la **ket qua sinh ra** tu no.
Hai loai file do can hai cach xu ly khac han.

1. Giai `package.json` **bang tay** -- gop y muon cua ca hai ben (giu ca hai goi moi).
2. **Khong** giai lockfile bang tay. Vut ban dang conflict di roi **sinh lai** tu
   `package.json` da giai xong:
   ```bash
   git checkout --theirs -- package-lock.json   # lay dai mot ban, se bi ghi de ngay
   npm install                                  # sinh lai cho khop package.json
   git add package.json package-lock.json
   git commit --no-edit
   ```
3. Lenh sinh lai theo he sinh thai: `npm install` - `yarn install` - `pnpm install` -
   `go mod tidy` - `bundle install` - `composer update --lock` - `cargo build`.
4. Kiem chung: moi goi trong `package.json` phai co mat trong lockfile.

## 3. Diem nhan thuc te
- Ghep tay hai ban lockfile gan nhu chac chan cho ra mot cay phu thuoc **khong nhat quan**:
  thieu goi phu, sai hash toan ven, hoac phien ban khong thoa man rang buoc cua goi khac. Te hon
  nua, no thuong **van chay duoc tren may ban** (vi `node_modules` da co san) roi hong tren CI
  hoac tren may nguoi moi vao. Day la kieu loi ton nhieu thoi gian nhat de tim ra.
- Sau khi sinh lai, hay **doc qua diff cua lockfile** truoc khi commit. Neu no doi hang nghin
  dong khong lien quan gi den hai goi vua them, nghia la phien ban npm cua ban khac dong doi
  hoac ban vo tinh nang cap ca cay -- can hoi lai truoc khi day len.
- Giam dau ngay tu dau bang `.gitattributes`:
  ```
  package-lock.json merge=binary -diff
  ```
  `merge=binary` bao git dung tron hai ban thanh mot mo hon do, `-diff` lam git thoi in ca nghin
  dong diff khi review -- doc PR de tho hon han.
- Lockfile **van phai duoc commit**. Bo no ra khoi repo de tranh conflict la doi mot phien phuc
  nho lay mot phien phuc lon: moi may se cai mot phien ban khac nhau.

## 4. Loi giai
[`conflict_lockfile.sh`](conflict_lockfile.sh) dung tinh huong hai nguoi them hai goi khac nhau,
merge cho conflict ca hai file, roi lam dung quy trinh: giai `package.json` bang tay, sinh lai
lockfile (o day mo phong buoc `npm install` vi sandbox khong co npm), va kiem chung moi goi
trong `package.json` deu co mat trong lockfile.

## 5. Self-check
```bash
bash conflict_lockfile.sh
```
Trong du an that:
```bash
git checkout --theirs -- package-lock.json && npm install
git diff --stat package-lock.json    # doc qua truoc khi commit
```
