# fixup! va autosquash -- sua theo review ma lich su van sach

## 1. De bai
Reviewer bao sua ba cho. Ban commit them "sua theo review", "sua theo review 2", "fix typo" --
va lich su cua PR day nhung commit chi co nghia trong vong doi cua PR do. `--fixup` cho ban danh
dau "commit nay thuoc ve commit kia", roi mot lenh gop chung vao dung cho.

## 2. Y tuong -- Checklist
1. Sua xong, commit voi nhan tro nguoc ve commit goc:
   ```bash
   git commit --fixup=<hash-commit-goc>
   ```
   Git tu dat message `fixup! <tieu de cua commit goc>`.
2. Day len de reviewer xem **tung gop y da duoc xu ly**, doi chieu voi comment cua ho.
3. Truoc khi merge, gop lai:
   ```bash
   git rebase -i --autosquash main
   ```
   `--autosquash` **tu doi thu tu** va danh dau `fixup` cho cac commit `fixup!` ung voi commit goc.
4. `fixup!` vs `squash!`:
   - `fixup!` -- vut bo message cua commit sua, giu message commit goc.
   - `squash!` -- **ghep** hai message lai va mo editor cho ban bien tap.
5. Bat mac dinh cho do phai nho co:
   ```bash
   git config --global rebase.autoSquash true
   git config --global alias.fix 'commit --fixup'
   ```

## 3. Diem nhan thuc te
- Diem manh that su khong phai lich su dep, ma la **reviewer khong phai doc lai ca commit to**.
  Neu ban squash ngay khi sua, ho mat dau vet gop y cua minh da duoc xu ly the nao.
- Sau khi autosquash, lich su bi viet lai -> day len phai `--force-with-lease` (bai 38). An toan
  vi day la nhanh PR cua rieng ban.
- Neu doi ngu dung "Squash and merge" (bai 47) thi moi commit trong PR deu bi gop lam mot khi
  merge, va `--fixup` co ve thua. No van dang dung: no giu PR **de doc trong luc review**,
  do moi la giai doan can.
- `git commit --fixup=HEAD~2` dung duoc luon, khong phai tra cuu hash.
- Trong script, `GIT_SEQUENCE_EDITOR=true` nghia la "chap nhan ke hoach git da soan san, khong mo
  editor" -- do la cach chay `rebase -i` tu dong. Go tay thi git mo editor cho ban xem truoc.

## 4. Loi giai
[`fixup_commit.sh`](fixup_commit.sh) tao mot PR hai commit, roi them hai fixup tro ve **hai commit
khac nhau** de chung minh autosquash dua tung cai vao dung cho: sau khi gop, `dang-nhap.js` co
phan validate va commit do **khong** chua `dang-xuat.js`. Cuoi bai so `squash!` voi `fixup!`.

## 5. Self-check
```bash
bash fixup_commit.sh
```
Trong PR that:
```bash
git log --oneline main..HEAD          # tim hash commit can sua
git add . && git commit --fixup=<hash>
git rebase -i --autosquash main       # xem ke hoach git soan, roi luu
git push --force-with-lease
```
