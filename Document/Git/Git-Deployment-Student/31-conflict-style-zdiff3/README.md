# merge.conflictStyle -- hien ca ban goc khi conflict

## 1. De bai
Dau conflict mac dinh chi cho thay **hai** ban: cua ta va cua ho. Thieu ban **goc**, ma khong co
goc thi nhieu khi khong biet ben nao da them, ben nao da xoa. Doi mot dong config la git hien ca
ba -- va co mot kieu thu ba con don gon vung conflict lai.

## 2. Y tuong -- Checklist
Ba kieu, dat qua `git config merge.conflictStyle`:

| Kieu | Hien ban goc | Vung conflict |
|---|---|---|
| `merge` (mac dinh) | khong | vua |
| `diff3` | co, giua `\|\|\|\|\|\|\|` va `=======` | phinh: dong giong nhau o hai ben bi ke vao |
| `zdiff3` | co | gon nhat: dong giong nhau bi day ra ngoai |

```
<<<<<<< HEAD
  const duocPhep = ['admin', 'owner']
||||||| 89d09cb                          <- BAN GOC, chi co voi diff3/zdiff3
  const duocPhep = ['admin']
=======
  const duocPhep = ['admin', 'editor']
>>>>>>> them-editor
```

1. Co ban goc thi doc duoc ngay **y dinh**: o vi du tren, ca hai ben deu **them** mot vai tro
   vao mang, khong ben nao xoa gi -- nen dap an dung la gop ca hai vai tro.
2. `z` trong `zdiff3` la **zealous**: nhung dong giong nhau o dau va cuoi cac ben duoc day
   **ra ngoai** vung conflict. Voi conflict trong ham dai, phan phai doc it hon han.
3. Bat mot lan cho moi repo tren may:
   ```bash
   git config --global merge.conflictStyle zdiff3
   ```

## 3. Diem nhan thuc te
- Khong co ban goc, hai tinh huong sau **nhin y het nhau** ma cach giai nguoc nhau:
  ben kia *them* mot dong, hay ban *xoa* mot dong ma ben kia giu. Chon nham la lang le lam song
  lai code nguoi khac vua co y bo di.
- `zdiff3` can git >= 2.35 (2022). Tai lieu cu khuyen dung `diff3` -- do la ban viet truoc khi
  co `zdiff3`; neu git cua ban du moi thi khong co ly do dung `diff3` nua.
- Doi kieu conflict **khong** doi cach git merge, chi doi cach no **trinh bay** cho ban doc.
  Bat sau cung khong pha gi.
- Neu vung conflict van qua roi du da bat zdiff3, do la dau hieu hai nhanh song qua lau khong
  dong bo. Cach chua nam o cho khac: merge `main` vao nhanh cua ban thuong xuyen hon.

## 4. Loi giai
[`conflict_style.sh`](conflict_style.sh) dung mot conflict **co ca dong chung o cuoi hai ben**,
roi chay lan luot ca ba kieu tren cung tinh huong do -- nho vay khac biet giua `diff3` va
`zdiff3` hien ra cu the: dong `ghiLog` bi lap hai lan trong vung conflict voi `diff3`, va bi day
han ra ngoai voi `zdiff3`.

Trong script co mot bay dang chu y: ham `thu_kieu` phai ket thuc bang `return 0` tuong minh.
Khong co no thi gia tri tra ve cua ham la cua `git merge` da that bai (dung y do), va `set -e`
giet script ngay o cho goi ham ma khong in ra loi nao.

## 5. Self-check
```bash
bash conflict_style.sh
git config --global merge.conflictStyle zdiff3    # bat cho may cua ban
```
