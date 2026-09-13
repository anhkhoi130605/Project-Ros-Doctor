# switch va restore -- vi sao git tach doi checkout

## 1. De bai
`git checkout` lam hai viec hoan toan khac nhau: doi nhanh, va lay lai noi dung file. Mot trong
hai viec do **xoa thay doi chua luu ma khong hoi gi**. Git 2.23 (2019) tach no thanh `switch` va
`restore`. Hay chi ro cho nhap nhang nam o dau.

## 2. Y tuong -- Checklist
| Viec | Lenh cu | Lenh moi |
|---|---|---|
| Doi nhanh | `git checkout <nhanh>` | `git switch <nhanh>` |
| Tao va sang nhanh moi | `git checkout -b <nhanh>` | `git switch -c <nhanh>` |
| Bo thay doi trong file | `git checkout -- <file>` | `git restore <file>` |
| Bo file khoi index | `git reset <file>` | `git restore --staged <file>` |
| Bo ca hai vung | (khong co lenh gon) | `git restore --staged --worktree <file>` |

1. `git checkout -- file` **ghi de file bang ban trong git**. Thay doi vua roi mat sach:
   khong hoi lai, khong vao stash, khong co trong reflog (reflog theo doi commit, khong theo doi
   file chua commit). Mat la mat han.
2. Cho nhap nhang that su xuat hien khi **ten nhanh trung ten file**: `git checkout app.js`
   nghia la doi sang nhanh `app.js` hay lay lai file `app.js`? Git chon nhanh, nhung ban khong
   the doan truoc tu cu phap.
3. `restore` con tach ro dang lay lai vao **vung nao**: `--staged` cho index, `--worktree` cho
   file tren dia, hoac ca hai.

## 3. Diem nhan thuc te
- `checkout` khong bi bo va se khong bi bo -- ca rung tai lieu, script CI va thoi quen tay dang
  dung no. Biet ca hai la can thiet, nhung khi viet huong dan cho nguoi khac thi dung lenh moi:
  doc `git restore file` la biet ngay no lam gi, con `git checkout -- file` thi khong.
- Truoc khi go bat ky lenh nao bo thay doi, `git status` mat mot giay va cho ban thay chinh xac
  cai gi sap mat.
- Neu li mat thay doi chua commit theo cach nay: neu truoc do da tung `git add` file, noi dung
  van con trong object database va co the tim bang `git fsck --lost-found` (bai 83). Neu chua
  add lan nao thi git chua he biet den no -- khong cuu duoc.
- `git switch` tu choi doi nhanh khi thay doi chua luu se bi ghi de, va co `--discard-changes`
  de noi thang y dinh thay vi vo tinh mat.

## 4. Loi giai
[`switch_va_restore.sh`](switch_va_restore.sh) chay tung cap lenh cu/moi, roi dung mot nhanh dat
ten **trung ten file** de thay chinh xac cho nhap nhang. Script bao SKIP neu git cu hon 2.23
thay vi de git bao loi cu phap kho hieu.

## 5. Self-check
```bash
bash switch_va_restore.sh
git --version                 # can >= 2.23 cho switch/restore
```
