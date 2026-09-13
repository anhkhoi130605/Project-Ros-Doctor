# Duong lui khi dang merge do dang

## 1. De bai
Dang giai conflict giua chung thi nhan ra merge nham nhanh, hoac conflict qua lon can hoi lai
dong doi. Git co duong lui -- va co ba lenh nghe giong nhau nhung de lai **ba ket qua khac han**.

## 2. Y tuong -- Checklist
| Lenh | Trang thai merge | File dang do | Thay doi khac chua commit |
|---|---|---|---|
| `git merge --abort` | xoa | quay ve truoc merge | **giu** |
| `git merge --quit` | xoa | **giu nguyen** | giu |
| `git reset --hard` | xoa | quay ve HEAD | **mat** |

1. Dang merge do dang thi co file `.git/MERGE_HEAD`, va `git diff --name-only --diff-filter=U`
   liet ke cac file conflict. Git tu choi phan lon thao tac khac cho den khi ban xu ly xong.
2. `--abort` la mac dinh nen dung: tra repo ve dung truoc luc go `git merge`.
3. `--quit` chi bo **trang thai** merge, giu nguyen ket qua ban dang lam do. Dung khi ban da
   giai gan xong va muon giu, nhung khong muon git coi day la mot merge. Hau qua: commit sau do
   chi co **mot cha**, lich su khong ghi nhan da merge nhanh kia.
4. `reset --hard` cung xoa trang thai merge nhung **vut luon moi thay doi chua commit trong ca
   repo**, ke ca file khong lien quan gi den merge.

## 3. Diem nhan thuc te
- Git chi tu choi merge khi viec do **se ghi de len file ban dang sua do**. Neu file ban dang sua
  khong nam trong pham vi merge, git cu merge binh thuong -- va ban roi vao trang thai conflict
  trong khi van co viec do dang. Luc do `git stash` **khong dung duoc nua** (bao `needs merge`),
  duong lui chi con `--abort`.
- Vi vay thoi quen dung la: **commit hoac stash truoc khi merge**, dung buoc vao merge voi mot
  dong viec do dang.
- `--abort` khoi phuc duoc vi git da luu trang thai truoc merge. Nhung dung dua vao no de bao ve
  viec chua commit -- cai gi chua commit thi git khong co trach nhiem gi voi no.
- Neu li commit nham mot merge chua giai xong (con dau `<<<<<<<`), do la commit thuong nhu moi
  commit khac: `git reset --hard HEAD~1` neu chua push, hoac `git revert` neu da push.

## 4. Loi giai
[`merge_abort.sh`](merge_abort.sh) chay ca ba lenh tren cung mot conflict va kiem chung tung o
cua bang: `--abort` tra repo ve sach, `--quit` giu file va cho ra commit mot cha, `reset --hard`
vut ca file khong lien quan. O giua co doan chung minh su khac nhau giua "file dang sua nam
trong pham vi merge" (git tu choi) va "khong nam trong" (git merge, roi stash chet).

## 5. Self-check
```bash
bash merge_abort.sh
```
Khi lo vao merge do dang:
```bash
git status                              # git in san goi y o cuoi
git diff --name-only --diff-filter=U    # con file nao chua giai
git merge --abort                       # lui ve, an toan nhat
```
