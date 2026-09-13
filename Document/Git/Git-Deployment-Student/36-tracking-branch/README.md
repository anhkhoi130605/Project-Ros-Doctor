# Nhanh upstream -- goc cua "ahead 2, behind 1"

## 1. De bai
`git status` bao "ahead 2, behind 1" so voi cai gi? Vi sao co nhanh go `git push` la chay, nhanh
khac lai bao `no upstream branch`? Tat ca deu tu **mot** thu: nhanh upstream duoc gan cho nhanh
cuc bo. Hay dat, doc, doi va go no ra.

## 2. Y tuong -- Checklist
1. Nhanh moi tao **chua co upstream** -> `git push` tran bao loi vi thieu thong tin, khong phai
   vi mang hong.
2. `git push -u origin <nhanh>` (viet tat cua `--set-upstream`) vua push vua gan. Thong tin nam
   trong `.git/config`, **khong** phai tren server:
   ```
   branch.<nhanh>.remote = origin
   branch.<nhanh>.merge  = refs/heads/<nhanh>
   ```
3. `@{u}` (viet tat cua `@{upstream}`) dung duoc o moi cho nhan mot tham chieu:
   ```bash
   git rev-list --count '@{u}..HEAD'   # nhung gi ban sap PUSH
   git rev-list --count 'HEAD..@{u}'   # nhung gi ban sap NHAN
   ```
4. `git branch -vv` -- xem nhanh nao dang theo doi nhanh nao.
5. Doi/go: `git branch --set-upstream-to=origin/x x` va `git branch --unset-upstream x`.
6. Git >= 2.37: `git config --global push.autoSetupRemote true` -- tu gio `git push` tren nhanh
   moi tu tao nhanh cung ten tren remote va gan upstream luon, khoi phai nho `-u`.

## 3. Diem nhan thuc te
- **"ahead/behind" duoc dem so voi ghi nho cuc bo, khong phai voi server.** Chua `git fetch` thi
  con so do co the da cu tu hom qua. Nhieu nguoi nhin `git status` thay "up to date" roi tuong
  minh dang co ban moi nhat -- khong phai.
- Nen phan xa dung la `git fetch` truoc, roi moi doc `git status`.
- Khi nhanh tren server bi xoa va ban `fetch --prune`, upstream cua nhanh cuc bo tro thanh
  **treo**: config van tro vao mot cho khong con ton tai. `git status` luc do bao
  "upstream is gone" -- do la dau hieu PR da duoc merge va nhanh da bi don.
- Upstream khong bat buoc phai cung ten. Nhanh `sua-loi` cua ban co the theo doi
  `origin/feature/sua-loi-tren-server` -- huu ich khi doi ngu co quy uoc ten rieng.

## 4. Loi giai
[`tracking_branch.sh`](tracking_branch.sh) di tu trang thai chua co upstream (push tran that bai),
gan bang `-u`, roi doc chinh `.git/config` de chung minh thong tin nam o may ban. Phan giua tao
mot dong doi day len de kiem chung con so ahead/behind **truoc** va **sau** `fetch` khac nhau --
do la diem de gay hieu nham nhat. Cuoi bai go upstream, prune, va thu `push.autoSetupRemote`
neu git du moi.

## 5. Self-check
```bash
bash tracking_branch.sh
```
Trong du an that:
```bash
git branch -vv
git fetch && git status -sb
```
