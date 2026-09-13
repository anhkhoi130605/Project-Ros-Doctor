# Don nhanh chet -- ba loai, ba lenh

## 1. De bai
Repo lam viec vai thang la `git branch` in ra ba chuc dong, phan lon la nhanh cua PR da merge tu
doi nao. Chung khong ton dung luong dang ke, nhung lam ban khong tim ra nhanh dang can. Van de la
co **ba loai** nhanh chet khac nhau, va moi loai can mot lenh khac nhau.

## 2. Y tuong -- Checklist
| Loai | La gi | Lenh don |
|---|---|---|
| Nhanh **cuc bo** da merge | nhanh cua ban, viec da vao main | `git branch -d <ten>` |
| Nhanh **remote-tracking** treo | ghi nho cuc bo ve nhanh server **da bi nguoi khac xoa** | `git fetch --prune` |
| Nhanh **tren server** | nhanh that tren remote | `git push origin --delete <ten>` |

1. `git branch --merged main` -- liet ke nhanh ma **toan bo commit da nam trong main**, xoa la
   an toan.
2. Don hang loat an toan:
   ```bash
   git branch --merged main --format='%(refname:short)' | grep -v '^main$' | xargs -r git branch -d
   ```
   `-d` tu tu choi nhanh chua merge, nen ke ca danh sach co nham cung khong mat gi.
3. `fetch --prune` chi cham `refs/remotes/`, **khong** dung den nhanh cuc bo cung ten.
4. Bat cho tu dong: `git config --global fetch.prune true`.

## 3. Diem nhan thuc te
- **Cai bay: `-d` cung chap nhan xoa nhanh chua vao `main`.** No xet "da merge vao **upstream**
  hoac vao HEAD", chu khong phai chi vao main. Nen mot nhanh da push va dang khop
  `origin/<ten>` se bi xoa gon -- voi git the la an toan (ban sao con tren server), nhung
  **"xoa duoc bang -d" khong dong nghia voi "cong viec da vao main"**. Muon biet that su thi hoi
  thang: `git branch --merged main`. Git co in canh bao o truong hop nay -- nen doc no.
- Nhanh remote-tracking treo chi sinh ra khi **nguoi khac** xoa nhanh tren server. Neu chinh ban
  go `git push origin --delete`, git don luon ghi nho cuc bo, khong con gi de prune.
- Sau khi prune, nhanh cuc bo cung ten tro thanh mo coi: upstream tro vao mot cho khong con
  ton tai, va `git status` bao "upstream is gone" -- do la dau hieu PR da duoc merge va don.
- `git branch -D` (chu hoa) bo qua moi kiem tra. Dung cho **mot** nhanh ban chac chan, dung bao
  gio dung trong vong lap don hang loat.

## 4. Loi giai
[`don_nhanh_chet.sh`](don_nhanh_chet.sh) dung bon nhanh de tach bach ba loai: mot da merge vao
main, mot **da push nhung chua vao main**, mot bi nguoi khac xoa tren server, va mot **chua he
push**. Nho vay thay ro `-d` tu choi nhanh chua push chua merge, nhung lai **chap nhan** nhanh
da push -- kem mot dong `merge-base --is-ancestor` chung minh no that su chua vao main.

Canh "nhanh bi xoa tren server" duoc dung bang cach xoa thang trong repo bare
(`git -C "$remote" update-ref -d ...`) chu khong dung `git push --delete`, vi lenh do se don
luon ghi nho cuc bo va khong con nhanh chet nao de quan sat.

## 5. Self-check
```bash
bash don_nhanh_chet.sh
```
Don repo cua ban:
```bash
git fetch --prune
git branch --merged main            # DOC truoc khi xoa
git branch --merged main --format='%(refname:short)' | grep -v '^main$' | xargs -r git branch -d
```
