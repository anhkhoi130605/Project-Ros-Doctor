# .gitignore nang cao: thu tu, dau !, va cai bay lon nhat

## 1. De bai
Bai 02 tu viet ham so khop pattern de hieu co che. Bai nay dung chinh git lam trong tai
(`git check-ignore`) de hoc ba thu ham do khong the hien: thu tu uu tien giua cac luat, dau `!`
phu dinh, va ly do `.gitignore` doi khi **khong an gi ca**.

## 2. Y tuong -- Checklist
1. **Luat sau thang luat truoc.** Voi hai dong `*.log` roi `!quan-trong.log`, file
   `quan-trong.log` khong bi chan. Dao thu tu hai dong lai thi no bi chan.
2. **`git check-ignore -q <file>`** tra loi co/khong bang **exit code**.
   **`git check-ignore -v <file>`** cho biet **dong nao trong file nao** da quyet dinh.
   Luu y: `-v` van in ra dong luat ke ca khi do la luat phu dinh (`!`), tuc la ke ca khi file
   **khong** bi chan -- nen dung doc "co output" thanh "dang bi chan", phai xem exit code.
3. **`!` khong cuu duoc file nam trong thu muc da bi chan.** Git khong buoc vao thu muc da bi
   loai tru nen no khong bao gio nhin thay file ben trong de xet luat `!`:
   ```
   build/                  <- SAI: khong the mo lai gi ben trong
   !build/giu-lai.txt

   build/*                 <- DUNG: chan cac file ben trong, khong chan thu muc
   !build/giu-lai.txt
   ```
4. **Dau `/` o dau** neo pattern vao goc repo: `/todo.md` chi chan file o goc, con `todo.md`
   chan o moi cap thu muc.
5. **`.gitignore` long nhau**: file trong thu muc con duoc uu tien hon file o ngoai.

## 3. Diem nhan thuc te
- **Cai bay lon nhat**: `.gitignore` chi co tac dung voi file **chua duoc theo doi**. Neu ban da
  tro commit `.env` mot lan, thi tu do ve sau du them `.env` vao `.gitignore` git van theo doi no
  nhu khong co gi. Phai `git rm --cached .env` (bai 16) thi luat moi bat dau co hieu luc.
- Khi mot file "khong hieu sao khong duoc commit", dung doan -- go
  `git check-ignore -v <file>` la ra ngay dong luat nao chan no. Luat co the den tu
  `.gitignore` o thu muc con, tu `~/.config/git/ignore` toan cuc, hoac tu `.git/info/exclude`.
- `.git/info/exclude` la cho de ignore rieng cho may ban ma khong ap len ca team -- dung cho
  file cua editor hay script ca nhan, thay vi nhet vao `.gitignore` chung.
- Luat trong `.gitignore` khong ap dung cho file da nam trong index, nen khi doi `.gitignore`
  cho ca repo, cach chac an la `git rm -r --cached . && git add .` roi xem `git status`.

## 4. Loi giai
[`uu_tien_gitignore.sh`](uu_tien_gitignore.sh) dung hai ham nho -- `bi_chan` doc exit code,
`luat` doc co `-v` -- roi di qua tung tinh huong: dao thu tu luat, `!` trong thu muc bi chan,
dau `/` neo goc, `.gitignore` long nhau, va cuoi cung dung tinh huong commit nham `.env` de
chung minh `.gitignore` khong cuu duoc file da theo doi.

## 5. Self-check
```bash
bash uu_tien_gitignore.sh
```
Khi mot file khong chiu vao git:
```bash
git check-ignore -v duong/dan/file
```
