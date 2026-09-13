# git reflog -- phao cuu sinh

## 1. De bai
`git reset --hard` nham. Xoa nhanh chua merge. Rebase hong giua chung. Amend mat commit. Bon tai
nan nay deu **cuu duoc**, va deu cuu bang cung mot cong cu: reflog.

## 2. Y tuong -- Checklist
reflog **khong phai lich su commit** -- no la **lich su thao tac**: so ghi chep moi lan HEAD di
chuyen tren may ban.

1. `git reflog` liet ke tung vi tri HEAD da dung, ke ca nhung vi tri gio khong con nhanh nao
   tro tay den.
2. `HEAD@{1}` = cho HEAD dung ngay truoc thao tac vua roi. Cuu `reset --hard` nham chi la
   `git reset --hard HEAD@{1}`.
3. Xoa nhanh nham: tim hash trong reflog roi `git branch <ten> <hash>` de tao lai.
4. Moi nhanh co reflog **rieng**: `git reflog show main`. Hai cach viet tra loi hai cau hoi
   khac nhau -- `HEAD@{2}` la HEAD dung o dau hai buoc truoc, `main@{2}` la con tro main tro
   vao dau hai lan cap nhat truoc.
5. reflog ghi ca thao tac **khong tao commit** (checkout, reset, merge) -- do la ly do no cuu
   duoc ca truong hop "toi di dau mat roi" chu khong chi "toi mat commit".

## 3. Diem nhan thuc te
- **reflog la cuc bo.** No nam trong `.git/logs`, **khong duoc push, khong duoc clone**. Nguoi
  khac clone repo cua ban se khong co reflog cua ban, va repo ban vua clone thi reflog gan nhu
  trong. Dung mong cuu duoc gi tu reflog cua mot repo vua tai ve.
- **reflog co han su dung.** Mac dinh git giu 90 ngay cho commit con voi tay duoc va 30 ngay
  cho commit da mo coi, sau do `git gc` don di that. Nen no la phao cuu sinh, **khong phai ban
  sao luu** -- viec sao luu that su la push len remote.
- Phan xa nen tap: vua lam gi do sai voi lich su thi **go `git reflog` truoc khi lam bat cu dieu
  gi khac**. Cang thao tac them thi cang kho doc, va commit mo coi cang gan ngay bi don.
- reflog chi theo doi **commit**. Thay doi chua bao gio duoc commit (hoac it nhat `git add`) thi
  khong nam o dau ca -- do la ly do `git checkout -- file` (bai 21) nguy hiem hon `reset --hard`.

## 4. Loi giai
[`reflog_cuu_ho.sh`](reflog_cuu_ho.sh) dung hai tai nan that: `reset --hard HEAD~2` lam mat hai
commit (cuu bang `HEAD@{1}`), va xoa nhanh chua merge (cuu bang cach tao lai nhanh tu hash trong
reflog). Phan cuoi kiem chung ba gioi han: reflog nam trong `.git/logs`, va repo vua clone thi
reflog gan nhu trong.

## 5. Self-check
```bash
bash reflog_cuu_ho.sh
```
Xem so ghi chep cua chinh ban:
```bash
git reflog | head -20
git reflog show main | head -5
```
