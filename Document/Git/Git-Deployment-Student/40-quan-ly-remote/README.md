# Quan ly remote: chi la mot cai ten gan voi URL

## 1. De bai
Doi tu HTTPS sang SSH, tro repo sang server khac, lam viec voi nhieu remote cung luc -- nghe nhu
ba viec khac nhau. Thuc ra ca ba deu la sua **mot dong chu trong `.git/config`**.

## 2. Y tuong -- Checklist
```bash
git remote add <ten> <url>            # them
git remote -v                         # xem (in 2 dong moi remote: fetch va push)
git remote rename <cu> <moi>          # doi ten -- "origin" khong he dac biet
git remote set-url origin <url-moi>   # doi dich
git remote remove <ten>               # xoa
git remote show origin                # hoi thang server: nhanh nao con, nhanh nao chet
```

1. Tat ca nam trong `.git/config` (`remote.origin.url`), **khong co gi tren server**.
2. Viec hay lam nhat -- doi HTTPS sang SSH:
   ```bash
   git remote set-url origin git@github.com:congty/du-an.git
   ```
   Khong can clone lai, khong mat gi: commit nam trong `.git`, khong nam o remote.
3. URL **day** va URL **keo** co the khac nhau:
   ```bash
   git remote set-url --push origin <url-khac>
   ```
   Dung khi keo tu mot guong nhanh nhung day len may chu chinh. `git remote -v` in ca hai dong
   chinh la de thay cho lech nay.
4. Moi remote co **khong gian ten rieng** cho nhanh remote-tracking, nen `origin/main` va
   `du-phong/main` khong dam nhau.
5. Xoa remote **khong** xoa gi tren server va khong xoa commit -- chi bo cai ten va cac nhanh
   remote-tracking di kem.

## 3. Diem nhan thuc te
- Khi doi mat khau/token HTTPS lien tuc thi day la luc chuyen sang SSH: mot lenh `set-url`, khong
  can dung den repo dang lam.
- Them mot remote thu hai tro vao repo cua dong doi la cach nhanh nhat de lay nhanh cua ho ve
  xem, ma khong phai cho ho mo PR.
- `git remote show origin` hoi **thang server** nen no biet ca nhanh nao da chet -- huu ich hon
  `git branch -r` (chi doc ghi nho cuc bo).
- Trong script, **dung so ca duong dan URL**: git chuan hoa duong dan cuc bo theo kieu cua tung
  he dieu hanh (tren Windows `/tmp/x` thanh `C:/Users/.../Temp/x`), nen so chuoi se sai tuy may.

## 4. Loi giai
[`quan_ly_remote.sh`](quan_ly_remote.sh) dung **hai** may chu gia de lam ro tung thao tac: them,
doi ten, `set-url`, tach rieng URL day/keo (roi push that de kiem chung du lieu di den dung may
chu B chu khong phai A), nhieu remote cung luc, va xoa. Ham `tro_toi` so **ten thu muc cuoi**
thay vi ca duong dan, dung cho van de chuan hoa noi tren.

## 5. Self-check
```bash
bash quan_ly_remote.sh
```
Xem du an cua ban:
```bash
git remote -v
git remote show origin
```
