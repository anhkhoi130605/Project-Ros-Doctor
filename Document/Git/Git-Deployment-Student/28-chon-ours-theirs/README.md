# ours va theirs -- ba cach "lay ben toi", ba ket qua khac nhau

## 1. De bai
"Lay ben toi" nghe don gian, nhung git co ba cach lam khac han nhau va hai trong so do **vut bo
cong viec cua nguoi khac ma khong bao gi**. Hay do ranh gioi giua chung truoc khi dung nham
trong mot merge that.

## 2. Y tuong -- Checklist
| Lenh | Lay gi | Doan KHONG conflict cua ben kia |
|---|---|---|
| `git checkout --ours -- <file>` | **ca file** cua ben ta | **mat** |
| `git merge -X ours` | ben ta, **chi o cho conflict** | giu |
| `git merge -s ours` | ca cay cua ben ta, bo het ben kia | mat |

1. `--ours` thao tac **theo file**, khong theo doan. Neu file co mot cho conflict va nam cho
   khac ben kia sua ma khong tranh chap, `--ours` vut luon ca phan khong tranh chap do.
2. `-X ours` la **tuy chon cua chien luoc** merge: van merge ba chieu binh thuong, chi khi gap
   tranh chap thi im lang chon ben ta. Day thuong la thu nguoi ta thuc su muon.
3. `-s ours` la **chien luoc** khac han: ket qua co noi dung y het ben ta, khong lay mot dong
   nao cua ben kia. Nhung commit merge **van co hai cha**.
4. Mot chu cai `-s` va `-X` cho hai hanh vi khac han -- doc lenh cua nguoi khac phai nhin ky.

## 3. Diem nhan thuc te
- **Trong rebase, ours va theirs dao nguoc.** Rebase phat lai commit cua ban len tren nhanh nen,
  nen "ours" la **nhanh nen**, con "theirs" moi la commit cua ban. Rat nhieu nguoi chon nham o
  day. Cach an toan: doc dong `>>>>>>>` de biet ben nao la ben nao, thay vi tin vao tu "ours".
- Cong dung that cua `-s ours` khong phai de giai conflict, ma de **danh dau** "nhanh kia da duoc
  xu ly roi, dung merge lai nua" ma khong lay code cua no. Vi du: mot hotfix da duoc lam lai
  bang cach khac tren main, ban muon git thoi bao nhanh do chua merge.
- Truoc khi go `-X ours` cho ca merge, hay tu hoi: co that la moi tranh chap trong merge nay
  deu nen chon ben ta khong? Neu chi mot vai file thi giai tay tung file van hon.
- `-X ours` co ban doi xung la `-X theirs`. Con `git checkout --theirs -- <file>` cung ton tai
  va cung tho bao y het `--ours`.

## 4. Loi giai
[`chon_ours_theirs.sh`](chon_ours_theirs.sh) dung mot file co **hai doan cach xa nhau**: doan
tren se conflict, doan duoi thi khong. Nho vay chay ca ba cach tren cung mot tinh huong la thay
ngay khac biet -- `--ours` lam mat `retries = 3` cua ben kia du no khong he tranh chap, con
`-X ours` giu lai. Phan cuoi dung mot rebase that de chi ra `<<<<<<<` luc do la **nhanh nen**.

## 5. Self-check
```bash
bash chon_ours_theirs.sh
```
Khi dang conflict, xem ben kia dinh lam gi truoc khi quyet dinh:
```bash
git diff :1:file :3:file     # ben kia doi gi so voi goc
```
