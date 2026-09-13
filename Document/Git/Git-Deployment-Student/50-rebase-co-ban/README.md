# Rebase co ban -- phat lai, khong phai di chuyen

## 1. De bai
Rebase bi mo ta sai o khap noi la "di chuyen commit sang nhanh khac". Hieu vay thi khong bao gio
giai thich noi vi sao hash doi, vi sao no nguy hiem voi lich su chung, hay vi sao no conflict
nhieu lan. Hay hieu dung mot cau -- roi moi thu con lai tu suy ra duoc.

## 2. Y tuong -- Checklist
**Rebase PHAT LAI tung commit len mot nen khac, tao ra commit MOI co cung noi dung nhung khac
cha -- nen khac ca hash.**

1. Hash cua mot commit duoc tinh tu **noi dung cong voi cha** cua no. Doi cha thi doi hash,
   khong co cach nao khac.
2. Sau rebase: so commit giu nguyen, thu tu giu nguyen, message giu nguyen, **noi dung file giu
   nguyen** -- chi hash va cha la khac.
3. Commit cu **chua bien mat**, chi la khong con nhanh nao tro toi. `ORIG_HEAD` tro vao dinh
   truoc thao tac, nen lui lai duoc ngay:
   ```bash
   git reset --hard ORIG_HEAD
   ```
4. Loi ich thuc te: sau rebase, nhanh nam **thang tren dinh main**, nen merge la fast-forward --
   lich su thang, khong co nut merge.
5. Merge va rebase cho **cung mot noi dung cuoi cung**, chi khac lich su.

## 3. Diem nhan thuc te
- Vi rebase tao commit moi, moi thu gan voi hash cu deu tro thanh lac hau: link trong issue,
  ban ghi CI, comment review tren GitHub. Do la mot phan cai gia cua lich su dep.
- `ORIG_HEAD` bi ghi de boi thao tac lon tiep theo (merge, reset, rebase khac). Neu da lam
  vai buoc nua thi dung `git reflog` (bai 24).
- Rebase **thuong xuyen** de re hon rebase **mot lan sau ba tuan**: nhanh cang lac hau thi cang
  nhieu commit cham vao cung mot cho, va rebase se dung lai o tung commit (bai 55).
- Chon merge hay rebase khong phai chuyen dung sai tuyet doi. Quy tac an toan duy nhat nam o
  bai 52: dung rebase lich su ma nguoi khac dang dung lam nen.

## 4. Loi giai
[`rebase_co_ban.sh`](rebase_co_ban.sh) rebase mot nhanh hai commit len main da di tiep, roi kiem
chung **tung menh de** cua dinh nghia: so commit va thu tu khong doi, noi dung file khong doi,
hash **doi**, va cha cua commit dau tien gio dung bang dinh main. Sau do dung `ORIG_HEAD` de lui
lai, va cuoi cung so ket qua rebase voi ket qua merge -- hai `tree` bang nhau, lich su khac nhau.

## 5. Self-check
```bash
bash rebase_co_ban.sh
```
Trong du an that:
```bash
git fetch && git rebase origin/main
git log --oneline --graph -10
git reset --hard ORIG_HEAD     # neu muon lui lai ngay sau do
```
