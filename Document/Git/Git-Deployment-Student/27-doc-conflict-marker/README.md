# Doc dau conflict, va ba ban file trong index

## 1. De bai
Mo file ra thay `<<<<<<<`, `=======`, `>>>>>>>` va khong biet phan nao la cua minh. Hay doc cho
ky, va nhin vao thu it nguoi biet: trong luc conflict, git dang giu **dong thoi ba ban** cua
file do trong index -- doc thang ra duoc, khong can doan tu dau conflict.

## 2. Y tuong -- Checklist
```
<<<<<<< HEAD                 <- bat dau phan cua BEN TA (nhanh dang dung)
  return Math.round(x * 1.1)
=======                      <- ranh gioi
  return x * 1.08
>>>>>>> thue-moi             <- ket thuc; phan tren no la BEN KIA
```

1. Ten sau `>>>>>>>` cho biet phan duoi den tu dau. Rat can khi dang o giua rebase, luc do
   "ben ta" va "ben kia" bi dao nguoc (bai 28).
2. `git diff --name-only --diff-filter=U` -- liet ke **dung** cac file dang conflict.
   Dung cai nay thay vi doc bang mat `git status`, nhat la khi conflict hang chuc file.
3. `git ls-files -u <file>` -- in ra ba **stage** dang nam trong index:

   | Stage | La gi | Doc bang |
   |---|---|---|
   | 1 | base (to tien chung) | `git show :1:file` |
   | 2 | ours (ben ta) | `git show :2:file` |
   | 3 | theirs (ben kia) | `git show :3:file` |

4. Giai xong thi `git add <file>` -- chinh hanh dong add la loi noi "toi da giai xong file nay".
   Sau do `git ls-files -u` khong con dong nao.
5. `git commit` (thuong dung `--no-edit` de giu message merge git soan san) ket thuc merge, va
   `.git/MERGE_HEAD` bien mat.

## 3. Diem nhan thuc te
- **Git khong kiem tra ban giai co dung khong.** Ban hoan toan co the `git add` mot file van
  con nguyen dau `<<<<<<<` va commit no len. Git chi quan tam file da duoc add hay chua.
  Do la ly do nen co hook chan dau conflict truoc khi commit (bai 57).
- Phan lon truong hop, dap an dung **khong phai chon mot ben** ma la **gop y dinh cua ca hai**.
  Trong bai: mot ben lam tron, mot ben giam thue -- ket qua dung la lam tron *va* thue moi.
  Git khong tu lam duoc vi no khong biet y dinh.
- Ba stage giai thich vi sao `git diff` trong luc conflict in ra thu la mat voi hai cot dau
  `++`, `+-`: no dang so cung luc voi ca hai ben.
- Neu file conflict qua roi, `git checkout --merge <file>` dung lai dau conflict tu dau, xoa
  moi thu ban da sua do tren file do.

## 4. Loi giai
[`doc_conflict_marker.sh`](doc_conflict_marker.sh) tao mot conflict that, kiem tra du ba dau,
roi doc thang `:1:`, `:2:`, `:3:` de chung minh index dang giu ba ban. Phan giai conflict gop
y dinh cua ca hai ben chu khong chon ben nao, va kiem chung `git add` lam sach stage.

## 5. Self-check
```bash
bash doc_conflict_marker.sh
```
Khi dang conflict trong du an that:
```bash
git diff --name-only --diff-filter=U    # file nao dang conflict
git show :1:duong/dan/file              # ban goc, truoc khi hai ben dong vao
```
