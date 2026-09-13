# git mergetool -- giai conflict bang ba khung

## 1. De bai
Conflict lon, nhieu doan xen ke, doc dau `<<<<<<<` trong mot file mai khong ra. `git mergetool`
mo mot cong cu ba khung de doi chieu. No can giao dien do hoa nen khong the chay trong self-check
-- nhung **co che** ben duoi thi kiem chung duoc het, va do moi la phan can hieu.

## 2. Y tuong -- Checklist
mergetool khong lam gi ma ban khong lam duoc bang tay. No doc dung **ba stage trong index**
(bai 27) va do ra ba file tam:

| Khung tren man hinh | Ten thuong goi | Lenh tuong duong |
|---|---|---|
| trai | LOCAL / ours | `git show :2:<file>` |
| giua | BASE | `git show :1:<file>` |
| phai | REMOTE / theirs | `git show :3:<file>` |

1. Chon cong cu: `git config --global merge.tool <ten>`.
   Xem git biet nhung gi: `git mergetool --tool-help`.
2. Chay: `git mergetool` -- git mo lan luot tung file dang conflict.
3. Luu va thoat, git tu `git add` file do.
4. **File `.orig`**: mac dinh mergetool de lai ban goc day dau conflict duoi ten `<file>.orig`.
   Rat hay bi quen roi commit nham. Xu ly ca hai duong:
   ```bash
   git config --global mergetool.keepBackup false
   echo "*.orig" >> .gitignore
   ```

## 3. Diem nhan thuc te
- **Khi nao dang cong**: conflict lon, nhieu doan xen ke, hoac file ban khong quen -- ba khung
  canh nhau de doi chieu hon han doc mot file day dau conflict.
- **Khi nao khong**: conflict mot dong. Mo cong cu do hoa cho mot dong thi cham hon sua thang
  trong editor.
- Neu ban da bat `zdiff3` (bai 31) thi phan lon conflict vua doc thang trong editor duoc, va
  mergetool tro thanh thu chi dung cho ca kho.
- Dung VS Code lam cong cu:
  ```bash
  git config --global merge.tool vscode
  git config --global mergetool.vscode.cmd 'code --wait $MERGED'
  ```
  VS Code cung co giao dien giai conflict san ngay trong editor, khong can goi mergetool.
- Cong cu hay dung khac: `meld`, `kdiff3`, `vimdiff`, `nvimdiff`.

## 4. Loi giai
[`mergetool.sh`](mergetool.sh) khong mo giao dien nao. No chung minh ba khung cua mergetool
chinh la ba stage `:1:`, `:2:`, `:3:` trong index, kiem tra `merge.tool` dat duoc va git biet
den cong cu do, tat `keepBackup`, roi giai conflict bang tay -- ket thuc bang dung buoc
`git add` ma mergetool lam ho.

## 5. Self-check
```bash
bash mergetool.sh
git mergetool --tool-help     # xem may ban dang co cong cu nao
```
