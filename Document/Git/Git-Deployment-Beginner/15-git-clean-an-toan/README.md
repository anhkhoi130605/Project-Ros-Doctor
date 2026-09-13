# git clean an toan -- lenh khong co duong lui

## 1. De bai
Thu muc lam viec day file rac: output build, file thu nghiem, log. `git clean` don duoc het,
nhung no xoa **that** tren dia va **khong** co reflog nao cuu lai duoc -- day la mot trong vai
lenh git that su lam mat du lieu.

Hay di qua tung co de biet chinh xac moi co xoa nhung gi, truoc khi go no vao du an that.

## 2. Y tuong -- Checklist
| Lenh | Xoa gi |
|---|---|
| `git clean -n` | **Khong xoa gi**, chi in ra se xoa gi |
| `git clean -f` | File chua theo doi, **khong** vao thu muc moi, **khong** cham file bi ignore |
| `git clean -fd` | Them ca thu muc chua theo doi |
| `git clean -xfd` | Them ca file **dang bi .gitignore chan** -- nguy hiem nhat |
| `git clean -xfd -e .env` | Nhu tren nhung giu lai file duoc `-e` loai tru |

1. Luon go `-n` truoc. Khong co xac nhan lai, khong co undo.
2. Mac dinh git **khong nhin vao thu muc chua theo doi**. Nen `git clean -n` khong he liet ke
   `build/`, lam nhieu nguoi tuong da don sach. Phai them `-d` moi thay.
3. File dang theo doi (da commit) thi `clean` khong bao gio cham den -- muon bo thay doi cua
   chung thi la `git restore`, viec khac.

## 3. Diem nhan thuc te
- `git clean -xfd` la lenh xoa mat `.env` pho bien nhat. Logic tro treu: `.env` dung ra la
  **khong** duoc commit, nen no bi ignore, nen `-x` xoa no, va vi khong duoc commit nen khong
  co ban nao trong git de lay lai. Mat la mat han.
- Truoc khi go `-x`, hay go `git clean -nxd` va **doc het** danh sach. Neu thay `.env`,
  `*.pem`, `.vscode/`, hay file cau hinh may cua ban trong do thi them `-e` cho tung cai.
- Muon don cho nhe ma khong dung `-x`: `git clean -fd` la du cho hau het truong hop, vi
  `node_modules/` va `dist/` dang bi ignore thi cai lai bang `npm install` la xong.
- Co `-i` (interactive) cho ban duyet tung nhom truoc khi xoa -- an toan hon `-f` nhieu khi
  ban chua chac.

## 4. Loi giai
[`don_file_rac.sh`](don_file_rac.sh) dung mot repo co du bon loai file (da commit, rac thuong,
rac trong thu muc moi, va `.env` bi ignore) roi chay lan luot `-n`, `-f`, `-fd`, `-nxd`, `-xfd -e`
va kiem chung sau moi buoc cai gi con cai gi mat.

## 5. Self-check
```bash
bash don_file_rac.sh
```
Trong du an that, luon chay dong nay truoc va doc ky:
```bash
git clean -nxd
```
