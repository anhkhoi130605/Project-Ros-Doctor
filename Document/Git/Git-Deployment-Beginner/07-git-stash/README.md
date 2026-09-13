# Luu tam thay doi voi git stash

## 1. De bai
Ban dang sua do mot tinh nang thi bi goi sang sua gap mot loi khac tren cung
branch. Working tree chua san sang de commit. Hoc cach dung `git stash` de cat
tam thay doi, xu ly viec gap, roi quay lai lay ra lam tiep -- khong mat code, khong
commit "rac" chi de giu cho.

## 2. Y tuong -- Checklist
1. `git stash` (hoac `git stash push -m "wip: form dang nhap"`) -- cat toan bo thay
   doi da tracked (staged + unstaged) vao mot "ngan keo", tra working tree ve sach
   nhu commit gan nhat.
2. `git stash list` -- xem cac stash dang co, moi dong dang
   `stash@{0}: On <branch>: <message>`.
3. Xu ly viec gap, commit, push nhu binh thuong tren working tree sach.
4. `git stash pop` -- lay lai stash moi nhat **va xoa no khoi danh sach**.
5. `git stash apply stash@{1}` -- lay lai mot stash cu the nhung **giu nguyen** no
   trong danh sach (dung khi muon ap dung lai nhieu lan).
6. `git stash drop stash@{0}` -- xoa han mot stash khong can nua.

## 3. Diem nhan thuc te
- Mac dinh `git stash` **khong** cat file moi hoan toan chua `git add` (untracked) --
  can them co `-u` (`git stash push -u`) neu muon cat ca untracked.
- `pop` co the bao conflict neu working tree da doi khac tu luc stash -- khi do Git
  giu lai stash trong danh sach de ban khong mat du lieu, phai tu xu ly conflict roi
  `git stash drop` tay.
- Nhieu stash chong chat theo thoi gian ma khong dat message ro rang se khong ai
  nho `stash@{3}` la gi -- luon dat `-m` khi cat.

## 4. Loi giai
[`parse_stash_line.sh`](parse_stash_line.sh): ham `parse_stash_line` tach mot dong
output cua `git stash list` thanh 3 phan: chi so (`index`), branch, va message.

## 5. Self-check
```bash
bash parse_stash_line.sh
```
Thu voi dong that tu `git stash list`:
```bash
git stash list | while read -r line; do bash parse_stash_line.sh "$line"; done
```
