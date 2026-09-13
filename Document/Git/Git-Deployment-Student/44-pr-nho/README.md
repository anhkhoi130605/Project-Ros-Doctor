# PR nho -- do bang so va cach tach

## 1. De bai
"PR nen nho" la loi khuyen ai cung nghe va ai cung bo qua, vi no khong kem con so nao. Hay do
kich thuoc PR bang so that, va quan trong hon: tach mot PR to thanh chuoi PR nho ma tung buoc
van chay duoc.

## 2. Y tuong -- Checklist
1. Do dung nhu giao dien PR do -- **ba cham** (bai 43):
   ```bash
   git diff --numstat main...nhanh | awk '{t+=$1+$2} END {print t}'
   ```
2. Nguong tham khao (khong phai luat, nhung nhieu doi ngu dung lam moc):

   | So dong | Danh gia |
   |---|---|
   | <= 100 | de review |
   | <= 400 | chap nhan duoc |
   | > 400 | nen tach |

3. **Tach theo muc dich, khong theo so dong.** Moi PR phai tu no hoan chinh va merge duoc
   rieng le. Thu tu tot: refactor truoc -> tinh nang sau -> tai lieu cuoi.
4. **PR xep chong**: PR sau lay PR truoc lam nen, nen diff cua no chi chua phan moi.
   ```bash
   git checkout -b feat/2-tinh-nang feat/1-doi-ten
   ```
5. Loai file sinh tu dong ra khi do -- chung lam con so phong len va khong ai review:
   ```bash
   git diff --numstat main...HEAD -- . ':(exclude)package-lock.json'
   ```

## 3. Diem nhan thuc te
- Tach PR **khong lam it viec di**, chi lam moi lan doc it di. Tong so dong khong doi -- day la
  dieu nen noi ro voi nguoi phan doi rang "tach ra mat cong hon".
- PR to nhat va nguy hiem nhat la loai **tron refactor voi thay doi logic**: reviewer khong the
  tach hai thu do bang mat, nen ho hoac duyet bua, hoac bo qua. Bai 45 co co `-w` de xu ly.
- PR xep chong co gia: PR 1 duoc merge thi PR 2 tu dong thu hep lai (GitHub tu doi nen). Doi lai
  la neu PR 1 bi doi nhieu thi PR 2 phai rebase theo.
- Khi khong the tach (vd doi mot API duoc goi o 40 cho), hay tach **commit** cho sach (bai 18)
  de reviewer doc tung commit -- van tot hon mot cuc.
- Lockfile nen bi loai khoi con so nhung **van phai commit** (bai 30).

## 4. Loi giai
[`pr_nho.sh`](pr_nho.sh) gom hai phan. Phan mot la ham `cham_kich_thuoc` voi test bien (dung 100,
101, dung 400). Phan hai dung mot PR **500 dong** tron ba muc dich, do bang `--numstat`, roi tach
thanh ba PR xep chong va kiem chung tung con so (300 / 120 / 80) cong lai **dung bang** PR to ban
dau. Cuoi bai them mot lockfile 5000 dong de thay `:(exclude)` dua con so ve dung thuc te.

## 5. Self-check
```bash
bash pr_nho.sh
```
Do PR cua ban:
```bash
git diff --numstat main...HEAD | awk '{t+=$1+$2} END {print t" dong"}'
git diff --stat main...HEAD | tail -1
```
