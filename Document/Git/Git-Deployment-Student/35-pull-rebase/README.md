# pull --rebase vs pull merge

## 1. De bai
Ban va dong doi cung day len mot nhanh. `git pull` mac dinh tao mot commit
`Merge branch 'main' of ...` khong mang thong tin gi, va lich su dan thanh mang nhen. Ba lua chon
cua `git pull` cho ba lich su khac nhau -- hay chon mot cach co y thuc thay vi de mac dinh quyet.

## 2. Y tuong -- Checklist
| Lenh | Ket qua | Khi that bai |
|---|---|---|
| `git pull --no-rebase` | tao commit merge | (khong that bai) |
| `git pull --rebase` | lich su thang, commit cua ban duoc phat lai | dung lai o conflict |
| `git pull --ff-only` | **khong tu quyet** | bao loi de ban chon |

1. `--rebase` **viet lai commit cua ban**: noi dung giu nguyen nhung **hash doi**, va commit cua
   ban duoc dat len tren commit cua dong doi.
2. An toan vi commit cua ban **chua tung duoc push** -- viet lai chung khong anh huong den ai.
   Do la ranh gioi: rebase chi viet lai phan lich su rieng cua ban.
3. `--ff-only` khong tao gi ca khi hai ben da re nhau, va **khong de lai trang thai do dang**.
4. Chon mac dinh mot lan cho may:
   ```bash
   git config --global pull.rebase true    # lich su thang (pho bien nhat)
   git config --global pull.ff only        # khong tu quyet, bao loi de ban chon
   git config --global pull.rebase false   # giu kieu merge cu
   ```

## 3. Diem nhan thuc te
- Git tu 2.27 **canh bao** neu ban chua chon, vi ba kieu tren cho ba lich su khac nhau va git
  khong muon doan ho.
- `pull --rebase` gap conflict thi ban dang o giua mot **rebase**, khong phai merge: lenh thoat
  la `git rebase --abort`, va "ours/theirs" bi dao nguoc (bai 28).
- Neu nhanh cua ban **da duoc push va co nguoi khac dung**, dung `--rebase` vao no la viet lai
  lich su chung -- luc do `--no-rebase` moi dung. Quy tac o bai 52.
- Commit merge do `pull` sinh ra khac han commit merge cua mot PR: commit PR ghi lai mot don vi
  cong viec, con commit nay chi ghi lai "hai nguoi tinh co day len cung luc" -- khong co gia tri
  lich su nao.

## 4. Loi giai
[`pull_rebase.sh`](pull_rebase.sh) dung mot ham `dung_tinh_huong_re_nhanh` de tao lai dung mot
canh (ban va dong doi cung tien len) cho ca ba lua chon, roi kiem chung tung ket qua: co/khong co
commit merge, thu tu commit sau rebase, va hash **doi** sau rebase. Cuoi bai dat `pull.rebase`
roi chay `git pull` tran de thay config that su co tac dung.

## 5. Self-check
```bash
bash pull_rebase.sh
```
Xem may ban dang dat gi:
```bash
git config --get pull.rebase ; git config --get pull.ff
```
