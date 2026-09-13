# Tim trong lich su: --grep, -S, -G, blame

## 1. De bai
Vao mot codebase la, gap mot dong code khong hieu tai sao co. Hoac nguoc lai: mot bien mat tich,
khong biet ai bo di va vi sao. Lich su git co cau tra loi, van de la biet hoi bang lenh nao.

## 2. Y tuong -- Checklist
| Lenh | Tim trong | Tra loi cau hoi |
|---|---|---|
| `git log --grep='x'` | **message** commit | "co commit nao noi ve x khong" |
| `git log -S'x'` | **noi dung thay doi** | "chuoi x duoc them vao / bo di o commit nao" |
| `git log -G'regex'` | noi dung thay doi (regex) | "diff nao co khop mau nay" |
| `git log --author='Lan'` | tac gia | "Lan da lam gi" |
| `git log -- duong/dan` | pham vi file | "file nay tung bi cham o dau" |
| `git blame file` | tung dong | "dong nay den tu commit nao" |

1. `--grep` mac dinh **phan biet chu hoa/thuong**; them `-i` neu khong muon vay.
2. Nhieu `--grep` la dieu kien **HOAC**. Muon **VA** thi them `--all-match`.
3. `-S` (goi la pickaxe) dem so lan chuoi xuat hien va bao nhung commit lam con so do **doi**.
   Nen no ra dung hai commit: luc them vao va luc bo di.
4. `-G` nhan bieu thuc chinh quy va bat moi diff co khop -- ke ca khi so lan xuat hien khong doi
   (vd chi doi `5000` thanh `3000`).
5. Luon go `--` truoc duong dan. Neu co nhanh trung ten voi file thi git khong biet ban muon gi.

## 3. Diem nhan thuc te
- `-S` la lenh dang gia nhat trong bang tren va it nguoi biet. Ly do: `--grep` chi hoat dong khi
  nguoi ta viet message tu te. Trong codebase that, day commit "update code" thi `--grep` vo dung,
  con `-S` van tim ra vi no doc chinh phan diff.
- `git log` va `git blame` tra loi hai cau hoi nguoc nhau. Can biet "commit nao doi file nay" thi
  `log`; can biet "dong nay den tu dau" thi `blame`.
- `git blame` hay chi vao mot commit format lai code (doi indent, doi quote) thay vi commit viet
  logic that. Dung `git blame --ignore-rev <commit-format>`, hoac tao file `.git-blame-ignore-revs`
  liet ke cac commit format de git bo qua vinh vien.
- Quy trinh thuc te khi truy mot dong la: `git log -S'chuoi' --oneline` de tim commit, roi
  `git show <commit>` de doc ca thay doi kem message va context.

## 4. Loi giai
[`tim_trong_lich_su.sh`](tim_trong_lich_su.sh) dung mot lich su nho co commit cua hai tac gia
khac nhau, co mot hang `TIMEOUT_MS` duoc them roi bi bo, roi chay tung lenh o bang tren va kiem
chung so commit tra ve. Doan quan trong nhat la chung minh `-S` van tim ra commit da **xoa**
chuoi do, con `--grep` thi khong.

## 5. Self-check
```bash
bash tim_trong_lich_su.sh
```
Thu trong repo that -- chon mot ten ham trong code roi truy nguon goc no:
```bash
git log --oneline -S 'tenHamCanTim'
```
