# Sua sai lich su: reset vs revert

## 1. De bai
Ban can "undo" mot commit, nhung co 2 cong cu khac nhau tuy tinh huong:
`git reset` (viet lai lich su) va `git revert` (tao commit moi dao nguoc thay doi).
Viet ham chon dung chien luoc dua tren: commit **da push len remote chung** chua, va
ban muon giu lai thay doi do o dau (staged / unstaged / bo han).

- **Input:** da push hay chua (`pushed`: `yes`/`no`), muon giu thay doi o dau
  (`keep`: `staged`/`unstaged`/`none`, chi ap dung khi chua push).
- **Output:** ten lenh nen dung.

## 2. Y tuong -- Checklist
1. `git reset --soft HEAD~1` -- bo commit gan nhat, giu nguyen thay doi o
   **staging area** (san sang commit lai ngay, kieu sua message hoac gop commit).
2. `git reset --mixed HEAD~1` (mac dinh khi khong truyen co) -- bo commit, dua thay
   doi ve **working tree, chua staged** -- muon sua them roi add lai tu dau.
3. `git reset --hard HEAD~1` -- bo commit **va xoa luon thay doi**, khong the lay lai
   bang cach thong thuong. Chi dung khi chac chan muon vut bo hoan toan.
4. `git revert <commit>` -- tao mot commit **moi** lam nguoc lai thay doi cua commit
   do, lich su cu van con nguyen -- an toan cho commit da len nhanh chung.
5. Quy tac quyet dinh: **da push cho nguoi khac thay -> luon `revert`**, khong
   `reset` (vi reset viet lai lich su, gay lech voi ban dong doi da pull).

## 3. Diem nhan thuc te
- `reset --hard` sau khi da `push` roi `push --force` la mot trong nhung cach pho
  bien nhat lam dong doi "mat commit" (that ra van con trong `git reflog` mot thoi
  gian, nhung khong phai ai cung biet cach cuu lai).
- `revert` an toan hon cho nhanh chung vi khong xoa lich su -- ai dang o commit cu
  van `pull` binh thuong, khong bi conflict lich su.
- `git reflog` la "luoi an toan" khi trot `reset --hard` nham tren may minh (chua
  push) -- commit van ton tai trong reflog vai chuc ngay truoc khi bi don rac that.

## 4. Loi giai
[`choose_undo_strategy.sh`](choose_undo_strategy.sh): ham `choose_undo_strategy`
nhan `pushed` va `keep`, tra ve lenh nen dung theo quy tac o muc 2.

## 5. Self-check
```bash
bash choose_undo_strategy.sh
```
Thu voi tinh huong that:
```bash
bash choose_undo_strategy.sh yes -
bash choose_undo_strategy.sh no staged
```
