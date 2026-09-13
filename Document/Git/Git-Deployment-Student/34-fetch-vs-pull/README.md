# fetch vs pull -- va origin/main thuc ra la gi

## 1. De bai
`git pull` = `git fetch` + `git merge`. Cau nay ai cung thuoc nhung no bo qua phan quan trong
nhat: **giua hai buoc do co mot cho de ban nhin truoc khi nhap**. Hay tach doi ra de thay, va
nhan tien lam ro `origin/main` la cai gi.

## 2. Y tuong -- Checklist
`origin/main` **khong phai** "nhanh main tren server". No la **ghi nho cuc bo**: "lan cuoi toi
noi chuyen voi server, main cua no o cho nay". Khong co mang no van doc duoc, va no co the cu.

1. `git fetch origin` -- tai commit moi ve, **cap nhat `origin/main`**, va **khong dung** den
   nhanh cua ban lan file tren dia.
2. Giua hai buoc, xem truoc cai sap nhap:
   ```bash
   git log --oneline main..origin/main      # nhung commit sap vao
   git diff main origin/main --name-only    # nhung file se bi doi
   ```
3. `git merge origin/main` -- gio moi nhap.
4. `git pull` lam ca hai, va lay mat cua ban buoc 2.
5. `git fetch --prune` -- don cac nhanh remote-tracking **da bi xoa tren server**. Fetch thuong
   khong don, nen chung nam lai lam ban tuong nhanh do con song.

## 3. Diem nhan thuc te
- Thoi quen dang tap: `git fetch` roi `git log --oneline main..origin/main` truoc khi nhap.
  Mat vai giay, va ban biet minh sap nhan cai gi -- nhat la truoc mot ban release.
- `git branch -r` cua repo lau ngay day nhanh chet chinh la vi khong ai `--prune` bao gio. Bat
  cho tu dong:
  ```bash
  git config --global fetch.prune true
  ```
- `git pull` mac dinh tao **commit merge** khi ban va remote da re nhau, nen lich su day nhung
  commit "Merge branch 'main' of ..." vo nghia. Bai 35 xu ly cho nay.
- Cu phap `main..origin/main` doc la "co o ben phai ma khong co o ben trai". Dao lai
  `origin/main..main` cho biet **ban** dang co gi ma server chua co -- tuc la cai ban sap push.
- Repo vua clone thi `origin/HEAD` cho biet nhanh mac dinh cua server. Neu server doi tu
  `master` sang `main`, chay `git remote set-head origin -a` de cap nhat lai.

## 4. Loi giai
[`fetch_vs_pull.sh`](fetch_vs_pull.sh) dung mot repo bare lam "server" va hai ban sao (cua ban va
cua dong doi). Dong doi push len, roi script kiem chung tung buoc: sau `fetch` thi `origin/main`
tien len nhung `main` va file tren dia **khong doi**; xem truoc duoc bang `main..origin/main`;
`merge` moi that su nhap. Phan cuoi tao roi xoa mot nhanh tren server de thay `--prune` lam gi.

## 5. Self-check
```bash
bash fetch_vs_pull.sh
```
Trong du an that:
```bash
git fetch --prune
git log --oneline main..origin/main    # sap nhan gi
git log --oneline origin/main..main    # sap day len gi
```
