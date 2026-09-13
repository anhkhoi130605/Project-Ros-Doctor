# Fork: origin va upstream

## 1. De bai
Dong gop cho mot du an nguon mo: ban khong co quyen day len repo goc, nen phai fork. Luc do may
ban co **hai** remote, va nham chung la loi kinh dien -- fork lac hau ca thang ma khong biet,
hoac PR mo ra tu nham nhanh.

## 2. Y tuong -- Checklist
| Ten | Tro vao | Quyen |
|---|---|---|
| `origin` | ban fork cua **rieng ban** | doc + ghi |
| `upstream` | repo **goc** cua du an | chi doc |

Quy tac mot dong: **keo tu `upstream`, day len `origin`.**

1. Clone tu fork, roi them upstream:
   ```bash
   git clone <url-fork>
   git remote add upstream <url-repo-goc>
   ```
2. **Fork khong tu dong cap nhat.** Day la dieu nguoi moi bat ngo nhat: tac gia day len repo goc
   thi fork cua ban van dung yen mai mai.
3. Dong bo `main`:
   ```bash
   git fetch upstream
   git checkout main
   git merge --ff-only upstream/main
   git push origin main
   ```
   `--ff-only` la **co y**: `main` cua ban chi nen la ban sao cua upstream. Neu lenh nay that bai
   tuc la ban da li commit thang vao `main` -- va do la luc can biet.
4. Lam viec tren nhanh rieng, **tach tu `upstream/main`** chu khong phai tu `main` cua fork
   (co the da cu). Push nhanh do len `origin`, roi mo PR sang repo goc.
5. Nhanh lac hau thi `git fetch upstream && git rebase upstream/main`, sau do day lai bang
   `--force-with-lease` (bai 38).

## 3. Diem nhan thuc te
- Day la truong hop `--force-with-lease` **dung nhat**: nhanh PR cua rieng ban, tren fork cua
  rieng ban, khong ai dung lam nen.
- Nhieu du an yeu cau rebase len ban moi nhat truoc khi review. Neu ban merge `upstream/main`
  vao nhanh PR thay vi rebase, diff cua PR se lan ca commit cua nguoi khac va reviewer phai loc
  bang mat.
- Nut "Sync fork" tren giao dien GitHub lam dung buoc 3. Nhung neu ban da commit vao `main` cua
  fork, no se de nghi merge -- luc do nen sua bang tay theo huong tren.
- Kiem tra nhanh xem minh dang tro dung cho chua: `git remote -v` phai in bon dong (fetch/push
  cho ca hai remote).

## 4. Loi giai
[`fork_origin_upstream.sh`](fork_origin_upstream.sh) dung ba repo: repo goc, ban fork, va may ban.
Script kiem chung fork **khong** tu cap nhat khi tac gia day len goc, dong bo lai bang `--ff-only`,
tao nhanh lam viec tu `upstream/main` va kiem tra nhanh do **khong** xuat hien tren repo goc.
Cuoi bai tac gia day them commit de nhanh cua ban lac hau, roi rebase va day lai bang
`--force-with-lease`.

## 5. Self-check
```bash
bash fork_origin_upstream.sh
```
Kiem tra fork cua ban:
```bash
git remote -v
git fetch upstream && git log --oneline main..upstream/main   # fork dang thieu gi
```
