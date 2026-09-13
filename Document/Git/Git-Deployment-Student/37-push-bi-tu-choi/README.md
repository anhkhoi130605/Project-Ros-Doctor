# Push bi tu choi -- git dang bao ve dieu gi

## 1. De bai
```
! [rejected]  main -> main (fetch first)
error: failed to push some refs
```
Loi push pho bien nhat, va bi xu ly sai nhieu nhat: rat nhieu nguoi go thang `--force` cho xong.
Hay hieu git dang bao ve cai gi truoc khi quyet dinh.

## 2. Y tuong -- Checklist
1. Ly do that su: commit dang o **dinh remote khong nam trong lich su cua ban**. Neu git nhan
   push, commit cua dong doi se khong con nhanh nao tro toi -- tuc la **bien mat** khoi lich su
   chung. Git tu choi de bao ve viec cua **nguoi khac**, khong phai de lam kho ban.
2. Kiem chung bang lenh:
   ```bash
   git merge-base --is-ancestor origin/main HEAD   # that bai = ban dang thieu commit cua ho
   ```
3. Hai cach xu ly **dung**:
   ```bash
   git pull --rebase origin main && git push    # lich su thang
   git pull --no-rebase origin main && git push # de lai commit merge
   ```
4. Mot cach **sai**: `git push --force`. No day commit cua dong doi ra khoi nhanh; ai clone moi
   se khong con thay viec cua ho.
5. Khi that su phai ghi de (sau rebase nhanh rieng), dung `--force-with-lease` -- bai 38.

## 3. Diem nhan thuc te
- Doc ky thong bao truoc khi lam gi: git ghi ro `rejected`, `non-fast-forward` va goi y
  `fetch first`. Phan lon truong hop lam theo goi y do la xong.
- `--force` khong xoa commit khoi **may cua dong doi**. Ho van con no, nen lan push tiep theo
  cua ho lai bi tu choi, va ho phai tu di tim hieu vi sao lich su chung tu nhien thieu mat mot
  mang. Chi phi that cua `--force` roi vao nguoi khac chu khong roi vao ban.
- Neu day len nhanh `main` chung ma bi tu choi, gan nhu **khong bao gio** dung force la dung.
  Neu day len nhanh PR cua rieng ban thi khac -- bai 38.
- Tren repo that nen bat branch protection cho `main` de server tu choi force push, khong phu
  thuoc vao viec moi nguoi nho quy tac (bai 65).

## 4. Loi giai
[`push_bi_tu_choi.sh`](push_bi_tu_choi.sh) dung mot ham `dung_canh` de tao lai dung tinh huong
cho ca ba cach xu ly. Ngoai viec kiem tra push bi tu choi, script con **doc noi dung thong bao**
va dung `merge-base --is-ancestor` de chi ra nguyen nhan. Phan cuoi chay `--force` that roi clone
moi mot ban tu server de chung minh file cua dong doi **da bien mat** khoi ban lam viec.

## 5. Self-check
```bash
bash push_bi_tu_choi.sh
```
Khi bi tu choi trong du an that:
```bash
git fetch origin
git log --oneline HEAD..origin/main    # ban dang thieu nhung gi
git pull --rebase origin main && git push
```
