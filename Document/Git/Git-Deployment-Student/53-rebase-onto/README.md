# rebase --onto -- noi ro ba thu thay vi de git doan

## 1. De bai
`git rebase main` tu suy ra "lay tu diem tach chung den HEAD". Suy luan do dung trong da so
truong hop va **sai** trong mot truong hop rat hay gap: nhanh cua ban tach tu nhanh cua nguoi
khac, khong phai tu `main`.

## 2. Y tuong -- Checklist
```bash
git rebase --onto <dat-len-dau> <lay-tu-sau-cai-nay> <lay-den-day>
```
Ba tham so, doc thang tu trai sang phai. `git rebase main nhanh` chi la loi viet tat cua
`git rebase --onto main <diem-tach-chung> nhanh`.

**Ba cong dung:**

1. **Nhanh tach nham cho** -- ban tach tu `feat/cua-dong-doi`, gio muon chi lay phan cua minh
   dat len `main`:
   ```bash
   git rebase --onto main feat/cua-dong-doi feat/cua-toi
   ```
2. **Bo mot commit o giua lich su** -- tuong duong `rebase -i` + `drop`, khong can mo todo:
   ```bash
   git rebase --onto <hash-Y>^ <hash-Y> <nhanh>
   ```
3. **Cuu nhanh sau khi nguoi khac viet lai lich su chung** (bai 52) -- dat lai phan cua rieng
   ban len nen moi:
   ```bash
   git rebase --onto <nhanh-chung> <hash-nen-cu> <nhanh-cua-ban>
   ```

## 3. Diem nhan thuc te
- Cach nho tham so thu hai: no la **cai bi loai tru**. Moi thu tu no tro xuong bi bo lai;
  moi thu tren no duoc phat lai.
- Cong dung 3 la ly do nen biet lenh nay: khi lich su chung bi viet lai, day la cach duy nhat
  lay lai viec cua ban **ma khong nhan doi commit** (nhu `pull` merge) va **khong mat viec**
  (nhu `reset --hard`).
- Truoc khi chay, kiem tra minh dang lay dung nhung gi:
  ```bash
  git log --oneline <lay-tu-sau-cai-nay>..<lay-den-day>
  ```
  Danh sach in ra chinh la nhung commit se duoc phat lai. Doc no truoc.
- Neu chay nham, `git reset --hard ORIG_HEAD` dua lai nhu cu (bai 50).

## 4. Loi giai
[`rebase_onto.sh`](rebase_onto.sh) dung ca ba cong dung tren repo that. Truong hop dau kiem chung
ro rang nhat: truoc khi chay, tu diem tach chung den HEAD co **4 commit** (2 cua dong doi + 2 cua
ta); sau `--onto` chi con **2 cua ta**, va file cua dong doi bien mat khoi nhanh. Truong hop cuoi
kiem chung commit chung xuat hien **dung mot lan** -- khac han ket qua `pull` merge o bai 52.

## 5. Self-check
```bash
bash rebase_onto.sh
```
Truoc khi chay that:
```bash
git log --oneline <tu-sau-cai-nay>..<den-day>    # dung nhung commit nay se duoc phat lai
```
