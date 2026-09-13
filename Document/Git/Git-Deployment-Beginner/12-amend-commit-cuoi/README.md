# Amend commit cuoi -- va vi sao no doi hash

## 1. De bai
Vua commit xong thi phat hien go sai chinh ta trong message, hoac quen mot file. Khong ai
muon them mot commit "sua chinh ta commit truoc" vao lich su. `git commit --amend` giai quyet
viec do -- nhung phai hieu no lam gi thi moi biet khi nao duoc dung.

Hay chung minh: amend **khong** sua commit cu, no tao commit moi va bo commit cu lai phia sau.

## 2. Y tuong -- Checklist
1. `git commit --amend -m "message moi"` -- doi message cua commit cuoi.
2. `git add file-quen; git commit --amend --no-edit` -- nhet file vao commit cuoi, giu message cu.
3. Sau amend, `git rev-parse HEAD` cho ra **hash khac**. Ly do: hash cua commit duoc tinh tu
   toan bo noi dung commit object -- ma message va danh sach file deu nam trong do. Doi mot
   ky tu trong message la doi hash.
4. So commit **khong** tang. Nhung commit cu cung **khong** mat: no van nam trong repo, chi la
   khong con nhanh nao tro tay den duoc.
5. `git reflog` van giu dau vet commit cu -- do la duong ve neu amend nham.

## 3. Diem nhan thuc te
- Quy tac: **chi amend khi chua push**. Da push roi thi nguoi khac co the da pull commit cu ve;
  amend xong lich su cua ban khong con la phan mo rong cua lich su ho, va git se tu choi push.
- Neu buoc phai sua sau khi push, dung `git push --force-with-lease`, **khong** dung `--force`.
  `--force-with-lease` kiem tra remote co dung o cho ban tuong khong; neu dong doi vua push them
  thi no dung lai thay vi xoa viec cua ho. Bai 38 di sau vao cho nay.
- `--amend` chi voi tay den commit cuoi cung. Muon sua commit xa hon thi dung `rebase -i` (bai 51).
- Amend tren nhanh dang co PR mo la binh thuong va rat pho bien -- PR cua ban khong ai khac dang
  dung lam nen, nen force-push vao no khong pha gi. Amend tren `main` thi khac han.

## 4. Loi giai
[`amend_va_hash.sh`](amend_va_hash.sh) chay ba doan: doi message (tree khong doi, hash doi),
them file quen (tree doi), va cuoi cung tao mot remote gia bang `git init --bare` roi push,
amend, push lai -- de thay chinh mat push bi tu choi va `--force-with-lease` xu ly the nao.

## 5. Self-check
```bash
bash amend_va_hash.sh
```
Thu tay:
```bash
git log -1 --pretty=%H          # ghi lai hash
git commit --amend -m "message khac"
git log -1 --pretty=%H          # hash da khac
git reflog | head -3            # commit cu van con day
```
