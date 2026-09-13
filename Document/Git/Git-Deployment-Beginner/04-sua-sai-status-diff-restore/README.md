# Sua sai voi status / diff / restore

## 1. De bai
Ban sua nham file, hoac `git add` nham file chua muon commit. Hoc cach doc output
cua `git status --porcelain` de biet chinh xac file nao dang o trang thai nao, roi
dung dung lenh de "sua sai" -- khong phai xoa file di roi chep lai tu cho khac.

## 2. Y tuong -- Checklist
1. `git status` (ban nguoi doc) hoac `git status --porcelain` (ban on dinh cho may
   doc -- dung khi viet script/CI, khong phu thuoc ngon ngu hien thi).
2. Doc 2 ky tu dau moi dong cua `--porcelain`:
   - `??` -- file moi, Git chua biet toi (untracked)
   - `M ` -- file da sua **va da** add (staged)
   - ` M` -- file da sua, **chua** add (unstaged)
3. Sua nham nhung **chua add**: `git restore <file>` -- tra file ve dung nhu ban
   commit gan nhat.
4. Lo **add** nham nhung chua commit: `git restore --staged <file>` -- bo khoi
   staging, van giu nguyen noi dung da sua tren working tree.
5. `git diff` -- xem noi dung thay doi (unstaged) truoc khi quyet dinh giu hay bo.
6. `git diff --staged` -- xem noi dung da add, chac chan truoc khi commit.

## 3. Diem nhan thuc te
- `git restore <file>` se **mat vinh vien** phan sua chua commit -- luon `git diff`
  xem lai truoc khi restore, dung lam theo phan xa.
- Lenh cu `git checkout -- <file>` lam viec tuong tu `git restore` nhung de go nham
  voi `git checkout <branch>` (chuyen nhanh) -- ban Git moi nen uu tien `restore`/
  `switch` cho tach bach ro rang.
- Thoi quen tot: `git status` truoc **va sau** moi lan sua sai, de chac trang thai
  dung nhu minh nghi, tranh restore nham file.

## 4. Loi giai
[`check_status_porcelain.sh`](check_status_porcelain.sh): ham `parse_status_code`
doc 2 ky tu dau cua mot dong `git status --porcelain` va tra ve ten trang thai
tuong ung.

## 5. Self-check
```bash
bash check_status_porcelain.sh
```
