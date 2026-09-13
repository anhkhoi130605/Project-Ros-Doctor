# git rerere -- giai mot lan, dung lai mai

## 1. De bai
Ban co mot nhanh song lau, ngay nao cung merge `main` vao de khoi lac hau. Va ngay nao cung phai
giai lai **dung mot conflict do**. Hoac ban rebase mot nhanh 10 commit, conflict o commit thu 3
lap lai o commit thu 7. Git ghi nho duoc cach ban da giai -- chi la mac dinh no tat.

## 2. Y tuong -- Checklist
`rerere` = **re**use **re**corded **re**solution.

1. Bat len (mac dinh tat):
   ```bash
   git config --global rerere.enabled true
   ```
2. Khi conflict xay ra, git ghi lai **hinh dang** conflict do vao `.git/rr-cache`.
3. Khi ban giai xong va commit, git luu lai **cach giai** ung voi hinh dang do.
4. Lan sau gap **dung hinh dang** conflict ay, git tu dien san ban giai vao file.
5. **rerere khong tu `git add`.** No chi dien noi dung; ban van phai xem lai roi add. Day la co y.

Hai lenh cho hai cau tra loi khac nhau, dung nham la hieu sai:
| Lenh | Tra loi |
|---|---|
| `git rerere remaining` | con file nao **rerere chua lo duoc** |
| `git diff --name-only --diff-filter=U` | con file nao **index chua ghi nhan da giai** |

Sau khi rerere tu dien: lenh dau **rong**, lenh sau **van liet ke file** -- vi ban chua add.

## 3. Diem nhan thuc te
- Loi ich lon nhat khong phai luc merge ma luc **rebase nhanh dai**: cung mot conflict co the
  lap lai o nhieu commit lien tiep, rerere lo tu commit thu hai tro di.
- rerere khop theo **hinh dang** conflict. Doi mot ky tu trong vung conflict la thanh conflict
  khac, khong khop nua. Nen dung mong no lo duoc moi thu.
- **Ban giai sai cung duoc nho** va duoc dien lai y nguyen o lan sau, im lang. Neu li giai sai
  roi commit, phai xoa ban ghi di: `git rerere forget <duong-dan-file>`.
- `.git/rr-cache` la **cuc bo**: khong push duoc, khong clone theo. Dong doi cua ban khong duoc
  huong loi tu ban giai cua ban.
- Vi rerere im lang, no de gay cam giac "conflict tu bien mat". Thoi quen nen giu: van doc lai
  file truoc khi `git add`, dung tin tuong tuyet doi.

## 4. Loi giai
[`git_rerere.sh`](git_rerere.sh) giai mot conflict bang tay, `reset --hard` de lam lai chinh
merge do, roi kiem chung file da duoc **tu dien** giong het ban giai lan truoc trong khi index
**van** o trang thai chua giai. Phan cuoi chung minh ba gioi han: conflict khac hinh dang thi
khong khop, `rr-cache` nam trong `.git`, va ban giai sai cung se duoc dien lai.

## 5. Self-check
```bash
bash git_rerere.sh
git config --global rerere.enabled true    # bat cho may cua ban
```
Khi thay conflict tu dien san:
```bash
git rerere remaining     # rong = rerere da lo het
git diff                 # van doc lai truoc khi add
```
