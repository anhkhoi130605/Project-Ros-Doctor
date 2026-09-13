# So sanh thay doi voi diff --stat va blame

## 1. De bai
Truoc khi commit hoac review, ban can biet nhanh: dot sua nay dung vao bao nhieu
file, file nao sua nhieu nhat -- va khi gap mot dong code la, ai la nguoi viet ra no.
Viet ham doc output rut gon cua `git diff --stat` de lay ra so dong them/bot theo
tung file.

- **Input:** mot dong trong output `git diff --stat`, vi du
  `" src/app.js | 12 +++++-------"`.
- **Output:** ten file, tong so thay doi, so dong them, so dong bot.

## 2. Y tuong -- Checklist
1. `git diff` -- xem chi tiet tung dong thay doi (unstaged).
2. `git diff --stat` -- xem tom tat: moi file 1 dong, so thay doi va chuoi
   `+`/`-` bieu dien ti le them/bot.
3. `git diff HEAD~3 HEAD -- path/to/file` -- so sanh 1 file giua 2 commit bat ky,
   khong chi working tree voi HEAD.
4. `git blame path/to/file` -- xem tung dong trong file hien tai do commit nao,
   tac gia nao tao ra lan cuoi.
5. `git blame -L 10,20 path/to/file` -- chi xem blame cho mot khoang dong, do ngop
   voi file dai.

## 3. Diem nhan thuc te
- `git diff --stat` la thu dau tien reviewer liec qua trong mot PR lon de uoc luong
  do rui ro -- mot file thay doi 300 dong can doc ky hon nhieu so voi doi 3 dong.
- `git blame` khong phai de "quy trach nhiem" -- muc dich thuc te la tim commit da
  doi 1 dong de doc **message** va **PR lien quan**, hieu ly do lich su dang sau no.
- Dong bi `git blame` chi ve mot commit "reformat toan bo file" la dau hieu nen
  dung `git blame -w` (bo qua doi khoang trang) hoac truy tiep `-L` lich su truoc do.

## 4. Loi giai
[`parse_diff_stat.sh`](parse_diff_stat.sh): ham `parse_diff_stat_line` tach 1 dong
`git diff --stat` thanh ten file, tong thay doi, so `+` va so `-`.

## 5. Self-check
```bash
bash parse_diff_stat.sh
```
Thu voi dong that:
```bash
git diff --stat | while read -r line; do bash parse_diff_stat.sh "$line"; done
```
