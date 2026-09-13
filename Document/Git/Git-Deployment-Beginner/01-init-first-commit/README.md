# Khoi tao repo & commit dau tien

## 1. De bai
Ban co san mot thu muc project tren may (chua co Git). Hay bien no thanh mot Git repo
va tao commit dau tien **dung chuan** -- khong phai kieu `git add .` roi
`git commit -m "asdf"` cho xong chuyen.

- **Input:** mot thu muc project (vai file `.js`/`.py`/gi cung duoc).
- **Output:** repo Git voi it nhat 1 commit, message ro nghia, `git status` sach
  (khong con gi de commit).

## 2. Y tuong -- Checklist
1. `git init` -- khoi tao repo tai thu muc goc project (chi chay 1 lan).
2. `git status` -- xem Git dang thay nhung file nao (ban dau tat ca la "Untracked").
3. `git add <file>` hoac `git add .` -- dua file vao staging area.
4. `git status` lai -- kiem tra dung file minh muon da len staging (hien mau xanh).
5. `git commit -m "..."` -- chot lai. Message nen mo ta **lam gi**, khong phai
   "commit dau tien" hay de may chu vo nghia.
6. `git log --oneline` -- xac nhan commit da nam trong lich su.

## 3. Diem nhan thuc te
- `git add .` rat tien nhung de commit nham file rac (`node_modules`, file build,
  `.env`...) neu chua co `.gitignore` -- xem bai `02-gitignore-dung-cach`.
- Message kieu "asdf", "update", "commit" la vo dung khi 6 thang sau ban `git log`
  tim lai ly do vi sao doan code nay thay doi.
- `git init` chay nham o thu muc cha (vi du `C:\` hoac `~`) se bien ca dong thu muc
  con thanh mot repo khong lo -- luon kiem tra dang dung dung cho truoc khi `init`.

## 4. Loi giai
Day la thao tac tay tren may ban nen khong co "loi giai" co dinh. File
[`check_commit_msg.sh`](check_commit_msg.sh) chua ham cham mot commit message co dat
chuan toi thieu hay khong (khong rong, khong nam trong nhom message vo nghia hay gap,
co it nhat 3 tu).

## 5. Self-check
```bash
bash check_commit_msg.sh
```
In `OK` la ham cham chay dung. Thu cham message that cua ban:
```bash
bash check_commit_msg.sh "feat: them form dang nhap"
bash check_commit_msg.sh "asdf"
```
