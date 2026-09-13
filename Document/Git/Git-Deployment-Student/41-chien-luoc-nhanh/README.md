# Chien luoc nhanh: trunk-based vs git-flow

## 1. De bai
Chien luoc nhanh khong phai chuyen thi hieu -- no quyet dinh doi ngu ban merge bao nhieu lan mot
ngay va conflict to co nao. Hay dung lai hai kieu pho bien tren repo that, do bang so, va cham
ten nhanh theo quy uoc.

## 2. Y tuong -- Checklist
**Ten nhanh** theo quy uoc `<loai>/<mo-ta-ngan-gach-noi>`, chu thuong khong dau:
`feat/gio-hang`, `fix/crash-khi-dang-nhap`, `hotfix/loi-thanh-toan`, `release/2-1-0`.
Loai hop le: `feat|fix|hotfix|chore|docs|refactor|test|release`.

**Trunk-based** -- nhanh song ngan, merge thang vao `main` nhieu lan trong ngay:
```
main  --*--------*--------*-->
         \      / \      /
          feat/a   feat/b
```
Moi nhanh chi song qua **mot** commit cua main, nen diem xuat phat chung (bai 26) luon gan --
it co hoi de conflict lon.

**git-flow** -- them nhanh `develop` lam vung dem, `main` chi nhan khi phat hanh:
```
feat/x --> develop --> release/1-1-0 --> main (+ tag v1.1.0)
                              |
                              +--------> develop (merge nguoc)
```

Do bang so: mot tinh nang di qua **1** buoc merge de len main o trunk-based, va **3** buoc o
git-flow.

## 3. Diem nhan thuc te
- **trunk-based** doi hai thu de chay duoc: CI tot (test chay tren moi PR) va **feature flag**
  -- de code chua xong van len main duoc ma khong lo ra cho nguoi dung. Thieu hai thu do thi no
  bien thanh "day code chua xong len production".
- **git-flow** hop khi phai ho tro nhieu phien ban cung luc (phan mem cai dat, thu vien co
  nguoi dung ban cu) hoac phat hanh theo dot co kiem thu rieng. Doi lai la nhieu buoc merge va
  nhanh song lau -> conflict to hon.
- Dem tong so commit merge tren mot nhanh **khong** noi len gi: sau khi merge release, `main`
  nuot ca lich su `develop` nen hai ben ra cung mot con so. Cai do duoc la **quang duong cua
  mot tinh nang**.
- Nhanh song cang lau thi merge cang dau -- khong phai vi git kem, ma vi diem xuat phat chung
  cang luc cang xa (bai 26). Bat ky chien luoc nao cung nen keo `main` ve thuong xuyen.
- Quy uoc ten nen duoc **may kiem tra**, khong phai nhac nhau trong review: hook `pre-push`
  (bai 59) hoac luat tren server.

## 4. Loi giai
[`chien_luoc_nhanh.sh`](chien_luoc_nhanh.sh) gom hai phan. Phan dau la logic thuan: ham
`ten_nhanh_hop_le` cham sau ten dung va sau ten sai. Phan hai dung ca hai chien luoc tren repo
that -- ba tinh nang theo trunk-based, hai tinh nang theo git-flow kem nhanh release va tag --
roi dem **so buoc merge tren duong di cua mot tinh nang** de so sanh.

## 5. Self-check
```bash
bash chien_luoc_nhanh.sh
```
Xem doi ngu ban dang theo kieu nao:
```bash
git log --oneline --graph --all -20
git branch -r        # co nhanh develop khong?
```
