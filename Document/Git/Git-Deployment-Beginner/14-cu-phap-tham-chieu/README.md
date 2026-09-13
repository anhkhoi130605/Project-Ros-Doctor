# Cu phap tham chieu commit: ~ , ^ , @{}

## 1. De bai
`git reset --hard HEAD~2` va `git reset --hard HEAD^2` khac nhau hoan toan, va go nham cai thu hai
la mot trong nhung ly do pho bien nhat khien nguoi ta xoa mat viec. Hay dung mot lich su co merge
roi giai tung tham chieu de khong bao gio nham nua.

## 2. Y tuong -- Checklist
Lich su dung trong bai:
```
A - B - C - D - M   <- main
     \         /
      ------- E     <- feature
```

1. **`^` chon cha nao.** Commit thuong co mot cha, commit merge co hai.
   - `HEAD^` = `HEAD^1` = cha thu nhat = nhanh ban **dang dung** khi go merge (o day: D).
   - `HEAD^2` = cha thu hai = nhanh **duoc merge vao** (o day: E).
2. **`~` di len bao nhieu buoc**, va luon di theo cha thu nhat.
   - `HEAD~1` = D, `HEAD~2` = C, `HEAD~3` = B.
   - Nen `~` khong bao gio re sang nhanh feature, du lich su co merge.
3. Ghep duoc, doc tu trai sang phai tung buoc: `HEAD^^` = C, `HEAD~2^` = B, `HEAD^2^` = B.
4. **`@{n}` quay lai theo thoi gian**, khong theo lich su. `HEAD@{1}` = cho HEAD dung mot buoc
   di chuyen truoc. No doc tu reflog nen biet ca nhung thao tac khong de lai dau trong lich su
   nhu `checkout` hay `reset`.
5. Doc noi dung file o mot thoi diem: `git show HEAD~4:so.txt`.
6. Khoang commit:
   - `B..D` = nhung gi co o D ma khong co o B (tuc C va D) -- **khong** tinh B.
   - `D...E` = phan rieng cua ca hai ben (C, D va E).

## 3. Diem nhan thuc te
- Meo nho: `~` la mot duong thang di nguoc len, `^` la mot cai re nhanh. Can dem buoc thi `~`,
  can chon nhanh thi `^`.
- Truoc khi go bat ky lenh `reset --hard`, `rebase` hay `push --force` co tham chieu, hay chay
  `git log --oneline -1 <tham-chieu>` xem no tro dung cho chua. Mat mot giay, tiet kiem mot buoi chieu.
- `HEAD^2` chi ton tai voi commit merge. Go no tren commit thuong thi git bao loi -- day la
  truong hop may man, vi loi con hon lam nham.
- Trong PowerShell, `^` la ky tu escape nen `HEAD^` co the bi an mat. Dung `HEAD~1` hoac boc
  nhay kep `"HEAD^"`.
- `git log --first-parent` di dung theo duong ma `~` di -- rat huu ich khi doc lich su cua nhanh
  `main` da merge nhieu PR, vi no bo qua chi tiet ben trong tung PR.

## 4. Loi giai
[`tham_chieu_commit.sh`](tham_chieu_commit.sh) dung dung lich su ve o tren (bang `merge --no-ff`
de chac chan co commit merge), luu hash tung commit, roi dung `git rev-parse` kiem chung tung
bieu thuc tro vao dung commit nao. Ham `la()` in ra ca hai ben khi lech de de doi chieu.

## 5. Self-check
```bash
bash tham_chieu_commit.sh
```
Thu trong repo that:
```bash
git log --oneline -5
git rev-parse --short HEAD~2      # doi chieu voi dong thu 3 o tren
git log --oneline --first-parent -5
```
