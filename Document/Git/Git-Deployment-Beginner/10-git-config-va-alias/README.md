# Git config & alias

## 1. De bai
Ban go `git status`, `git checkout`, `git commit` hang chuc lan mot ngay. Hoc cach
cau hinh Git (danh tinh, editor mac dinh) va tao **alias** de rut ngan cac lenh hay
dung -- roi viet ham "giai ma" mot alias quen thuoc ra lenh Git day du cua no.

- **Input:** mot ten alias, vi du `co`, `st`, `lg`.
- **Output:** lenh Git day du tuong ung, hoac bao loi neu alias khong ton tai.

## 2. Y tuong -- Checklist
1. `git config --global user.name "Ten Ban"` va
   `git config --global user.email "email@ban.com"` -- bat buoc thiet lap truoc khi
   commit lan dau tren may moi, quyet dinh ten/email hien trong lich su commit.
2. `git config --global core.editor "code --wait"` -- chon editor mo khi Git can ban
   go message dai (vd `git commit` khong kem `-m`).
3. `git config --global alias.co checkout` -- tao alias, gio go `git co` thay vi
   `git checkout`.
4. Alias hay dung thuc te:
   - `alias.st` -> `status`
   - `alias.co` -> `checkout`
   - `alias.ci` -> `commit`
   - `alias.br` -> `branch`
   - `alias.lg` -> `log --oneline --graph --all`
5. `git config --list --show-origin` -- xem toan bo config dang ap dung va file nao
   dinh nghia no (global `~/.gitconfig` hay local `.git/config` cua rieng repo).

## 3. Diem nhan thuc te
- `user.email` sai (dung email ca nhan thay vi email cong ty, hoac nguoc lai) khien
  commit khong duoc GitHub/GitLab gan dung vao profile cua ban -- kiem tra bang
  `git config user.email` truoc khi bat dau du an moi.
- Config **local** (trong 1 repo, khong co `--global`) override config **global** --
  huu ich khi 1 project can email khac (vd repo cong ty) so voi cac project ca nhan.
- Alias khong chi rut gon ten lenh ma con "dong goi" ca cau lenh dai phuc tap nhu
  `lg` o tren thanh mot tu go nhanh, giam loi go sai co moi lan can xem lich su.

## 4. Loi giai
[`expand_alias.sh`](expand_alias.sh): ham `expand_alias` tra mot alias trong bang
alias mau o muc 2 va tra ve lenh Git day du.

## 5. Self-check
```bash
bash expand_alias.sh
```
Thu voi alias cua ban:
```bash
bash expand_alias.sh lg
bash expand_alias.sh xyz
```
