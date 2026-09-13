# Branch chi la mot con tro 41 byte

## 1. De bai
Nhieu nguoi hinh dung branch la "mot ban copy cua code", nen ngai tao nhanh, ngai xoa nhanh, va
hoang mang khi git bao "nhanh chua duoc merge". Thuc te branch la mot **file van ban chua dung
mot dong: hash cua commit**. Hay mo `.git` ra xem tan mat.

## 2. Y tuong -- Checklist
1. Nhanh nam o `.git/refs/heads/<ten>`. Noi dung dung bang hash commit: 40 ky tu + 1 ky tu
   xuong dong = **41 byte**. Do la toan bo chi phi cua mot nhanh.
2. `git branch <ten>` = ghi them mot file nua voi cung hash. Khong copy file nao, khong ton
   dung luong dang ke, tuc thi -- du repo co 10 nam lich su.
3. `HEAD` tro vao **ten nhanh**, khong tro thang vao commit: `.git/HEAD` chua
   `ref: refs/heads/main`. Nen "dang o nhanh nao" thuc chat la "HEAD dang tro vao ten nao".
4. `git commit` = tao commit object moi, roi **ghi de hash moi vao file cua nhanh dang dung**.
   Cac nhanh khac khong he bi anh huong.
5. `git branch -f <ten> <dich>` = ghi lai con tro, khong cham gi den commit.
6. `git branch -d <ten>` = **xoa cai ten**, khong xoa commit. Commit van doc duoc bang hash.

## 3. Diem nhan thuc te
- Vi tao nhanh gan nhu mien phi, khong co ly do gi de gom nhieu viec vao mot nhanh. Nhanh
  rieng cho tung viec la mac dinh, khong phai xa xi.
- Khi git tu choi `git branch -d` voi ly do "chua duoc merge", no dang bao: commit tren nhanh
  nay khong co duong nao khac de voi toi: xoa ten di la ban mat loi vao. `-D` (chu hoa) la
  cach noi "toi biet". Commit van chua mat ngay -- no con trong reflog khoang 90 ngay (bai 24).
- Hieu branch la con tro thi rebase, reset, merge deu tro nen de doan: tat ca chi la ghi lai
  mot vai con tro va tao them commit.
- `git branch --contains <hash>` liet ke nhanh nao voi toi duoc mot commit -- rat huu ich khi
  can biet "ban va nay da vao nhanh release chua".

## 4. Loi giai
[`branch_la_con_tro.sh`](branch_la_con_tro.sh) doc thang `.git/refs/heads/main` va `.git/HEAD`
bang `cat`, dem so byte, tao nhanh roi so hash, commit de thay con tro nao dich con tro nao dung
yen, va cuoi cung xoa nhanh de chung minh commit van con nguyen trong repo.

## 5. Self-check
```bash
bash branch_la_con_tro.sh
```
Xem trong repo cua ban:
```bash
cat .git/HEAD                    # ref: refs/heads/<nhanh dang dung>
cat .git/refs/heads/main         # dung mot hash
ls .git/refs/heads/              # moi nhanh la mot file
```
