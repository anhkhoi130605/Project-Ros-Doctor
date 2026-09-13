# .gitignore dung cach

## 1. De bai
Trong repo co lan: ma nguon, thu muc `node_modules/`, file `.env` chua secret, va vai
file log/build ra (`npm-debug.log`, `dist/app.js`). Viet `.gitignore` sao cho Git
**khong bao gio** track cac file rac nay, ke ca khi ai do lo go `git add .`.

## 2. Y tuong -- Checklist
1. Tao file `.gitignore` o thu muc goc repo.
2. Liet ke pattern can bo qua, moi dong 1 pattern:
   - `node_modules/` -- ca thu muc dependency
   - `.env` -- file chua secret / API key
   - `*.log` -- moi file log
   - `dist/` (hoac `build/`) -- output build lai duoc, khong can luu
3. Neu file da lo bi track tu truoc, them vao `.gitignore` **la chua du** -- phai chay
   `git rm --cached <file>` de bo no khoi viec theo doi (file van con nguyen tren dia).
4. `git status` lai de chac chan cac file/thu muc tren khong con hien "Untracked".

## 3. Diem nhan thuc te
- Commit nham `.env` la mot trong nhung nguyen nhan leak API key/secret pho bien nhat --
  tung co khong it vu lo key len GitHub public chi vi thieu `.gitignore`.
- `.gitignore` chi chan file **chua tung** duoc track. File da commit roi van nam
  trong lich su -- muon go han phai `git rm --cached`, con muon xoa khoi lich su da
  push thi can cong cu nang hon (BFG, filter-branch).
- Khong can viet tay tu dau -- repo `github.com/github/gitignore` co san file mau theo
  tung ngon ngu/framework.

## 4. Loi giai
[`check_gitignore.sh`](check_gitignore.sh): ham so khop mot duong dan file voi danh
sach pattern kieu `.gitignore` rut gon (ho tro `*` va pattern ket thuc bang `/` de
khop ca thu muc con ben trong).

## 5. Self-check
```bash
bash check_gitignore.sh
```
