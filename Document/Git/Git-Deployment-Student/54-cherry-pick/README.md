# cherry-pick -- lay mot commit tu nhanh khac

## 1. De bai
Ban dang lam mot tinh nang chua xong thi phat hien va sua mot loi quan trong trong do. Loi do
can len production **ngay**, con tinh nang thi con lau. Lay rieng commit sua loi ra.

## 2. Y tuong -- Checklist
```bash
git cherry-pick <hash>              # mot commit
git cherry-pick -x <hash>           # kem ghi chu nguon goc vao message
git cherry-pick <A>..<B>            # mot day, KHONG gom A
git cherry-pick <A>^..<B>           # mot day, co gom A
```

1. cherry-pick khong "sao chep commit" ma **ap lai thay doi** cua commit do len noi dung hien
   tai -- nen hash chac chan khac, va ket qua **co the** khac.
2. `-x` ghi `(cherry picked from commit ...)` vao message. Rat nen dung khi lay commit tu nhanh
   khac: sau nay doc log con biet no tu dau ra.
3. Conflict thi xu ly y nhu merge (bai 29): `--continue`, `--abort`, `--skip`.
   Trang thai do dang nam o `.git/CHERRY_PICK_HEAD`.
4. `git cherry <nhanh-dich> <nhanh-nguon>` tra loi "commit nao ben kia da co mat o day roi":
   dau `-` = da co (theo **noi dung thay doi**, khong theo hash), dau `+` = chua co.

## 3. Diem nhan thuc te
- **cherry-pick cang it cang tot.** Moi lan pick la mot ban sao noi dung ton tai song song, va
  sau nay khong ai biet hai commit do co that su giong nhau khong -- nhat la khi mot ben duoc
  sua tiep con ben kia thi khong.
- Khi merge ca nhanh vao sau do, git **khong nhan doi noi dung file** (no nhan ra thay doi da co
  san), nhung **lich su thi co hai commit cung mot y nghia**. Log doc len nhu lam viec do hai lan.
- cherry-pick chi troi chay khi **nen du gan voi nguon**. Ap mot commit sua file X len mot nhanh
  chua he co file X la conflict ngay -- day cung la ly do nen pick **commit nho, doc lap**
  (bai 18).
- Dung khi: hotfix can len production ngay, lay mot commit tu nhanh sap bi bo, hoac dua mot ban
  va sang nhanh release cu. Khong dung de thay cho merge.

## 4. Loi giai
[`cherry_pick.sh`](cherry_pick.sh) di qua: pick mot commit (va kiem chung **khong keo theo** tinh
nang chua xong), `-x`, pick mot day voi ca hai kieu dau cham, conflict va `--abort`. Phan cuoi
dung lai cai bay quan trong nhat -- cherry-pick roi merge ca nhanh: noi dung file **khong** nhan
doi nhung message xuat hien **dung 2 lan** trong lich su, va `git cherry` chi ra dieu do.

Mot chi tiet trong script: nhanh thu day phai tach tu nen **da co san** `tinh-nang.js`, vi commit
thu hai trong day co sua file do -- ap len nen khong co no la conflict ngay.

## 5. Self-check
```bash
bash cherry_pick.sh
```
Trong du an that:
```bash
git log --oneline <nhanh-nguon>          # tim hash can lay
git checkout main && git cherry-pick -x <hash>
git cherry main <nhanh-nguon>            # con gi chua duoc ap?
```
