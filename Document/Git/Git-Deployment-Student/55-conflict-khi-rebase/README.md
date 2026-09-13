# Conflict khi rebase -- continue, skip, abort

## 1. De bai
Conflict trong rebase khac conflict trong merge o hai diem lam nguoi ta lung tung nhat: no
**dung lai nhieu lan** (moi commit mot lan), va **"ours/theirs" bi dao nguoc**.

## 2. Y tuong -- Checklist
| Lenh | Lam gi |
|---|---|
| `git rebase --continue` | da giai xong commit nay, ap tiep commit sau |
| `git rebase --skip` | **vut han** commit dang bi ket |
| `git rebase --abort` | bo toan bo, tra nhanh ve dung truoc rebase |

1. **Dung lai nhieu lan**: merge chi dung **mot** lan cho ca nhanh; rebase dung o **tung commit**
   co tranh chap. Nhanh 10 commit co the bat ban giai 10 lan.
2. **ours/theirs dao nguoc**: rebase phat lai commit cua ban len tren nhanh nen, nen voi git
   "ours" la cai da co san o do -- tuc **nhanh nen** -- con "theirs" moi la **commit cua ban**.
   ```bash
   git show :2:<file>   # ours  = nhanh nen (main)
   git show :3:<file>   # theirs = commit cua ban dang duoc ap
   ```
   Nen `git checkout --ours` o day lay **main**, nguoc han truc giac.
3. **Cach ban giai lan nay quyet dinh co dung lai lan sau khong.** Neu ban giai thanh dung gia tri
   ma commit ke tiep mong doi, patch cua no ap sach va rebase chay thang. Giai thanh gia tri khac
   thi git phai hoi tiep.
4. Sau moi lan giai: `git add <file>` roi `git rebase --continue`.

## 3. Diem nhan thuc te
- **`--skip` nguy hiem**: no vut han commit dang bi ket, khong hoi lai, khong canh bao gi them.
  Trong bai, skip hai lan lam **ca hai commit bien mat** va nhanh khong con gi. Chi dung khi
  commit do da thua that su (thay doi cua no da co san tren nhanh nen).
- Cach an toan de biet ben nao la ben nao: doc dong `>>>>>>>` trong dau conflict, hoac doc thang
  stage `:2:` / `:3:`. Dung tin vao tu "ours".
- Bat **rerere** (bai 32) truoc khi rebase nhanh dai: cung mot conflict co the lap lai o nhieu
  commit lien tiep, va tu lan thu hai git tu dien ban giai.
- Bat **`merge.conflictStyle = zdiff3`** (bai 31) de nhin thay ban goc -- trong rebase, khong co
  no thi rat kho biet ben nao them ben nao xoa.
- Tranh conflict tu dau van hieu qua hon moi meo xu ly: rebase som va thuong xuyen
  (`git fetch && git rebase origin/main` moi ngay), va tach commit cho gon (bai 18) de moi lan
  dung lai chi phai giai mot viec.

## 4. Loi giai
[`conflict_khi_rebase.sh`](conflict_khi_rebase.sh) dung mot nhanh co **hai commit deu cham vao
cung mot dong**, nen rebase dung lai hai lan. Script di qua ca ba duong ra, va kiem chung truc
tiep chuyen dao nguoc bang cach doc `:2:` va `:3:` -- stage 2 la gia tri cua main, stage 3 moi la
gia tri cua ta. Phan `--skip` do thiet hai bang so: skip het thi khong con commit nao cua ta.

## 5. Self-check
```bash
bash conflict_khi_rebase.sh
```
Khi ket giua mot rebase:
```bash
git status                       # git in san buoc tiep theo
git show :2:<file>               # ban cua nhanh NEN
git show :3:<file>               # ban cua commit DANG AP (cua ban)
git rebase --abort               # duong lui an toan nhat
```
