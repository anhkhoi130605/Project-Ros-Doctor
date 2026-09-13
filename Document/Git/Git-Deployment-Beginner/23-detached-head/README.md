# Detached HEAD -- hieu va thoat ra ma khong mat viec

## 1. De bai
`You are in 'detached HEAD' state` la dong canh bao lam nhieu nguoi moi hoc so nhat. No **khong
phai loi**. No chi co nghia: HEAD dang tro thang vao mot commit thay vi tro vao mot ten nhanh.
Hay vao trang thai do, commit trong do, roi cuu lai commit vua tao.

## 2. Y tuong -- Checklist
1. Binh thuong `.git/HEAD` chua `ref: refs/heads/main` -- tro vao **ten nhanh**.
   Sau `git checkout <hash>` thi no chua **thang hash**. Do la toan bo su khac biet.
2. Cach kiem tra trong script: `git branch --show-current` tra ve chuoi **rong** khi detached.
3. Van commit duoc binh thuong, nhung **khong nhanh nao tien theo**. Ban co the lam ca buoi,
   commit deu, ma khong con tro nao ghi nhan -- day la cho nguy hiem.
4. Thoat ra ma giu viec: `git switch -c <ten-nhanh-moi>` **ngay tai do**. Commit vua tao gio
   co nhanh giu, khong con mo coi.
5. Neu tro di mat (`git switch main`) roi moi nho ra: commit chua mat, tim lai bang
   `git reflog` roi `git branch <ten> <hash>`.

## 3. Diem nhan thuc te
- Kiem tra bang `git branch --contains <hash>` o trang thai detached se lam ban nham: lenh do
  tu them mot dong gia `* (HEAD detached from ...)` cho chinh HEAD, nen ket qua khong bao gio
  rong. Muon hoi "co nhanh that nao giu commit nay khong" thi dung
  `git for-each-ref --contains <hash> refs/heads/`.
- Detached HEAD la trang thai **binh thuong** trong nhieu tinh huong: CI thuong checkout dung
  mot commit (khong phai nhanh) de build dung ma da duoc test, nen thay dong nay trong log CI
  la chuyen thuong. `git bisect` (bai 81) cung chay o trang thai nay.
- No huu ich khi ban muon xem lai code tai mot thoi diem trong qua khu ma khong pha gi:
  `git checkout <hash>`, xem xong `git switch -` de quay lai.
- Neu ban thay minh dang detached ma khong nho vi sao, dung hoang: `git reflog` cho biet ban
  den day tu dau, va `git switch -` dua ban ve cho cu.

## 4. Loi giai
[`detached_head.sh`](detached_head.sh) doc thang `.git/HEAD` truoc va sau khi detach, commit
trong trang thai do, roi lam ca hai ket cuc: mot lan dat ten kip (`switch -c`) va mot lan bo di
roi phai truy nguoc bang reflog. Phan cuoi nhac lai truong hop detached la binh thuong (CI).

## 5. Self-check
```bash
bash detached_head.sh
```
Thu trong repo that (an toan, khong mat gi):
```bash
git checkout HEAD~2      # git in canh bao detached
git branch --show-current # rong
git switch -             # ve cho cu
```
