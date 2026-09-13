# Clone & lam viec voi remote co ban

## 1. De bai
Ban duoc them vao mot repo tren GitHub/GitLab. Hay clone ve may, hieu remote
`origin` la gi, va day (push) thay doi dau tien len dung cach.

## 2. Y tuong -- Checklist
1. `git clone <url>` -- tai toan bo repo (kem lich su) ve may, tu dong tao remote
   ten `origin`.
2. `git remote -v` -- xem remote dang tro toi dau (fetch URL va push URL).
3. Nhan biet 2 kieu URL remote:
   - HTTPS: `https://github.com/user/repo.git` -- hoi username/token khi push.
   - SSH: `git@github.com:user/repo.git` -- dung SSH key, khong hoi mat khau moi lan.
4. Sua & commit xong: `git push origin <ten-nhanh>` de day len remote.
5. `git pull` truoc khi bat dau lam viec moi ngay -- tranh code cu tren may de len
   ban moi cua dong doi.

## 3. Diem nhan thuc te
- Push HTTPS bang mat khau thuong (khong phai token) da bi GitHub tat tu lau -- can
  Personal Access Token, hoac chuyen sang SSH cho gon.
- Nham remote (`origin` tro ve fork ca nhan thay vi repo goc cua team) la loi hay
  gap khi moi clone -- luon `git remote -v` kiem tra truoc khi push vao du an la.
- SSH tien khi lam viec lau dai tren may ca nhan (setup 1 lan, dung mai); HTTPS
  tien hon khi chi can thao tac nhanh tren may muon/CI.

## 4. Loi giai
[`check_remote_url.sh`](check_remote_url.sh): ham `parse_remote_url` tach
`owner/repo` va kieu giao thuc (`https`/`ssh`) tu mot remote URL.

## 5. Self-check
```bash
bash check_remote_url.sh
```
Thu voi remote that cua ban:
```bash
bash check_remote_url.sh "$(git remote get-url origin)"
```
