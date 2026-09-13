# rebase -i -- sua lich su bang mot file van ban

## 1. De bai
`git rebase -i` bi coi la thu dang so. Thuc ra no chi mo mot **danh sach viec** (todo list) va
lam dung nhung gi ban ghi trong do: ban sua mot file van ban, luu, git thi hanh.

## 2. Y tuong -- Checklist
File todo trong nhu the nay:
```
pick a1b2c3d feat: them A
pick e4f5g6h feat: them B
pick i7j8k9l feat: them C
```
Doi tu dau dong de doi hanh vi:

| Lenh | Lam gi |
|---|---|
| `pick` | giu nguyen (mac dinh) |
| `reword` | giu noi dung, **doi message** |
| `edit` | dung lai o commit do de ban sua |
| `squash` | gop vao commit **ngay tren**, **ghep** ca hai message |
| `fixup` | gop vao commit ngay tren, **vut** message di |
| `drop` | bo han commit (xoa dong cung tuong duong) |

Doi **thu tu dong** = doi thu tu commit.

**Thu tu trong todo di tu CU den MOI** -- nguoc voi `git log`. Nham cho nay la squash nham chieu.

## 3. Diem nhan thuc te
- **Mau khong khop thi git khong lam gi va cung khong bao loi.** Sua nham ten commit trong todo
  se cho ket qua "chay xong ma khong doi gi" -- de tuong minh da sua ma thuc ra chua. Luon doc
  lai todo truoc khi luu.
- Doi thu tu chi an toan khi cac commit **doc lap** voi nhau. Neu commit D sua file ma commit A
  tao ra, dua D len truoc se conflict ngay -- do la git dang noi "thu tu nay khong co nghia".
- `squash`/`fixup` gop vao commit **ngay phia tren** trong todo, khong phai commit ban dang tro
  chuot vao. Nen dat dong `fixup` **duoi** dong dich.
- Trong thuc te it khi phai go tay: `git commit --fixup` + `--autosquash` (bai 46) tu soan san
  todo dung roi.
- Vi rebase viet lai lich su, sau do phai `push --force-with-lease` (bai 38), va chi lam tren
  nhanh cua rieng ban (bai 52).

## 4. Loi giai
[`rebase_tuong_tac.sh`](rebase_tuong_tac.sh) thay editor bang lenh tu dong (`GIT_SEQUENCE_EDITOR`)
de tung thao tac deu kiem chung duoc: xem noi dung todo that, drop, reword, fixup, squash, va doi
thu tu. Co mot phan co y dung mau **khong khop** de chung minh git im lang khong lam gi.

Hai chi tiet ky thuat: git **noi duong dan file todo vao cuoi** lenh trong `GIT_SEQUENCE_EDITOR`,
nen mot lenh nhu `tee ban-sao.txt` se thanh `tee ban-sao.txt <file-todo>` -- tee coi ca hai la
file dau ra va **cat rong file todo**, rebase chet ngay. An toan nhat la mot script nhan `"$1"`.
Phan doi thu tu cung viet thanh script rieng cho de doc thay vi nhoi vao mot dong sed.

## 5. Self-check
```bash
bash rebase_tuong_tac.sh
```
Trong du an that (mo editor cho ban xem truoc khi lam):
```bash
git rebase -i main
git rebase --abort      # neu doi y
```
