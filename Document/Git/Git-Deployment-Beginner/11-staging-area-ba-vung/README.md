# Staging area -- ba vung cua git

## 1. De bai
Nhieu nguoi dung git nhu mot cai nut "luu len may chu": sua file, `git add .`, `git commit`,
xong. Den luc `git diff` khong in ra gi du vua sua ca chuc dong, hoac `git reset` lam mat
viec, thi khong hieu tai sao.

Hay lam mot file mang ba noi dung khac nhau o ba vung cua git **cung mot luc**, roi doc
tung vung ra de thay chung tach biet that.

## 2. Y tuong -- Checklist
Git khong co "mot ban file". Voi moi file dang theo doi, luon co ba ban:

| Vung | La gi | Doc bang |
|---|---|---|
| **HEAD** | Ban trong commit cuoi cung -- da chot vao lich su | `git show HEAD:file` |
| **Index** (staging area) | Ban dang xep hang cho commit tiep theo | `git show :file` |
| **Working tree** | Ban thuc te tren dia, editor dang mo | `cat file` |

1. `git add` copy tu **working tree** sang **index**. Chi vay thoi -- no khong ghi gi vao lich su.
2. `git commit` copy tu **index** sang **HEAD** (tao commit moi). No **khong** doc file tren dia,
   nen file sua roi ma chua add thi khong vao commit.
3. `git diff` so **index <-> working tree** = phan ban chua add.
4. `git diff --staged` so **HEAD <-> index** = phan ban da add, sap commit.
5. `git status --porcelain` cho ca hai: ky tu thu nhat la trang thai o index, ky tu thu hai
   la o working tree. Nen `MM` = da add roi lai sua tiep.
6. `git reset <file>` keo index ve bang HEAD, **khong** cham file tren dia.

## 3. Diem nhan thuc te
- `git diff` mot minh **khong** bao gom phan da add. Go `git diff`, thay trong, roi ket luan
  "khong con gi de commit" la loi rat pho bien -- dung `git diff HEAD` neu muon xem ca hai vung.
- Commit thieu file gan nhu luon la loi nay: sua 5 file, `git add` 4 file, commit. Git khong
  canh bao gi vi no chi lam dung viec duoc yeu cau. `git status` truoc khi commit la de chan cho nay.
- `git add -p` cho add tung doan trong cung file. Day la cach tach mot lan sua lon thanh
  nhieu commit sach thay vi don het vao mot commit "sua abc" khong ai review duoc.
- Ba vung nay cung giai thich vi sao `git commit -a` tien ma nguy: no add het file dang theo doi
  roi commit luon, ban mat hoan toan buoc chon loc.

## 4. Loi giai
[`show_three_areas.sh`](show_three_areas.sh) dung mot repo tam trong thu muc temp roi dat
`config.js` vao ba trang thai `timeout = 1000 / 2000 / 3000` o ba vung, sau do doc lai tung
vung va kiem chung. Phan cuoi thu `git reset` de chung minh no khong cham file tren dia.

## 5. Self-check
```bash
bash show_three_areas.sh
```
Thu tay trong repo cua ban -- sua mot file da commit, `git add` no, roi sua tiep:
```bash
git diff              # chi ra phan sua SAU khi add
git diff --staged     # chi ra phan da add
git status --porcelain # cot dau = index, cot hai = working tree
```
