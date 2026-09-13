# Doc & viet lich su commit chuan

## 1. De bai
Team ban thong nhat dung **Conventional Commits** (`feat:`, `fix:`, `docs:`,
`chore:`, `refactor:`, `test:`...) de `git log` de doc va co the tu sinh changelog
sau nay. Viet ham kiem tra mot commit message co dung dinh dang nay khong.

## 2. Y tuong -- Checklist
1. `git log --oneline -10` -- xem 10 commit gan nhat, cam nhan format chung cua team.
2. `git log --oneline --graph --all` -- xem ca nhanh khi can (dung nhieu hon o tang
   `02-student` sau khi biet branch/merge).
3. Format chuan: `<type>: <mo ta ngan, viet thuong, khong cham cuoi cau>`
   Vi du: `feat: them form dang nhap`, `fix: sua loi crash khi gio hang rong`.
4. `type` hop le hay gap: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `style`,
   `perf`. Co the them scope trong ngoac: `fix(cart): ...`.
5. Neu message sai dinh dang va **chua push**, sua bang `git commit --amend`.

## 3. Diem nhan thuc te
- Nhieu cong ty gan Git hook (`commit-msg`) hoac buoc CI de **chan merge** neu commit
  message sai dinh dang -- khong phai chuyen hinh thuc suong.
- `type` + mo ta ro rang giup tool nhu `standard-version`/`semantic-release` tu sinh
  `CHANGELOG.md`, khoi ngoi viet tay moi lan release.
- Tuyet doi khong `--amend` hay sua lich su commit **da push** len nhanh chung -- se
  lam lech lich su voi dong doi, gay conflict kho hieu khi ho pull lai.

## 4. Loi giai
[`check_commit_convention.sh`](check_commit_convention.sh): ham `is_conventional_commit`
dung regex kiem tra format `type(scope)?: mo ta`.

## 5. Self-check
```bash
bash check_commit_convention.sh
```
Thu cham message that cua ban:
```bash
bash check_commit_convention.sh "fix(cart): sua loi tinh sai tong tien"
```
