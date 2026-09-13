# Commit atomic -- tach mot commit gop thanh nhieu commit

## 1. De bai
Mot commit nen la **mot** thay doi mo ta duoc trong mot cau, va revert duoc doc lap. Thuc te thi
ai cung tung commit gop: sua bug, them tinh nang, doi format, tat ca trong mot commit
"sua mot so thu".

Hay lam nguoc lai: co tinh commit gop hai viec khong lien quan, roi tach ra -- vi ban se gap
tinh huong "da commit gop roi" nhieu hon la lam dung ngay tu dau.

## 2. Y tuong -- Checklist
Tach commit cuoi thanh nhieu commit:
1. `git reset --soft HEAD~1` -- bo commit nhung **giu nguyen** thay doi trong index.
   (`--mixed` bo luon index, `--hard` mat ca thay doi. Bai 09 so sanh ba co nay.)
2. `git reset` -- bo het khoi index de chon lai tung file. Khong cham file tren dia.
3. `git add <file-nhom-1>` roi `git commit` -- lam lai voi tung nhom.

Khi hai thay doi nam trong **cung mot file**, `git add <file>` khong tach duoc nua:
4. `git add -p <file>` -- git dua tung doan (hunk) ra hoi, tra loi `y` de lay, `n` de bo qua.
5. Git **gop cac thay doi gan nhau vao cung mot hunk** (mac dinh moi ben lay 3 dong ngu canh).
   Hai thay doi cach nhau duoi 7 dong se thanh mot hunk va `add -p` khong con gi de tach.
   Luc do dung `git add -p` voi phim `s` (split) hoac `e` (sua tay patch).

## 3. Diem nhan thuc te
- Loi ich cu the nhat khong phai tham my: khi mot phan thay doi gay loi tren production, commit
  atomic cho ban `git revert` dung phan do trong mot lenh. Commit gop thi revert la mat ca thu
  khong lien quan.
- Ly do thu hai la review. Reviewer doc mot diff tron ca sua bug lan doi format se bo qua
  cho quan trong -- vi 90% dong thay doi la nhieu.
- Ly do thu ba la `git bisect` (bai 81). Bisect chi huu ich khi tung commit lam mot viec;
  commit gop khien ket qua bisect chi ra "commit nay" ma trong do co 5 thay doi khac nhau.
- Doi format va sua logic **khong bao gio** nen cung commit. Neu buoc phai doi format ca file,
  tach thanh commit rieng va ghi hash cua no vao `.git-blame-ignore-revs`.
- Commit atomic khong co nghia la commit nho nhat co the. Mot commit khong chay duoc (vd them
  ham nhung chua them cho goi) thi khong atomic, du no nho.

## 4. Loi giai
[`tach_commit.sh`](tach_commit.sh) tao mot commit gop (sua bug + them tai lieu), tach bang
`reset --soft`, roi chung minh hai dieu: noi dung cuoi cung khong doi (`tree` giong y truoc), va
gio `git revert` bo duoc rieng phan sua bug. Phan cuoi lam viec kho hon -- hai thay doi trong cung
mot file -- bang chinh `git add -p`, bom san cau tra loi `y` roi `n` vao dau vao chuan de chay
tu dong duoc.

## 5. Self-check
```bash
bash tach_commit.sh
```
Thu tay: sua hai cho khong lien quan trong cung mot file roi go
```bash
git add -p <file>      # tra loi y cho doan dau, n cho doan sau
git diff --staged      # chi thay doan dau
```
