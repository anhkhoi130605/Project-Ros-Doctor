# Cong tu kiem tra truoc khi mo PR

## 1. De bai
Reviewer khong nen la nguoi phat hien ban quen commit mot file, con commit `wip`, hay nhanh da
lac hau ba ngay. Hay viet mot cong tu kiem tra chay truoc khi mo PR -- kieu cua no la
`predeploy_check.sh` (bai 56) nhung cho giai doan som hon.

## 2. Y tuong -- Checklist
Bon dieu kien ham `kiem_tra_truoc_pr` kiem tra:

1. **`git status` sach** -- con thay doi chua commit thi diff cua PR se thieu.
2. **Khong con commit tam** -- `wip`, `fixup!`, `squash!` con sot lai
   (`git rebase -i --autosquash main`, bai 46).
3. **Khong lac hau so voi nen** -- `git rev-list --count nhanh..main` phai la 0, khong thi
   reviewer se thay ca thay doi cua nguoi khac.
4. **PR khong rong** -- co it nhat mot commit khac nen.

Danh sach day du truoc khi bam "Create pull request":
- 4 muc tren, cong:
- Tu doc lai diff cua **chinh minh**: `git diff main...HEAD` (ba cham, bai 43).
- Kich thuoc hop ly -- tren 400 dong thi tach (bai 44).
- Test chay xanh o may minh truoc khi de CI phat hien.
- Mo ta PR noi **vi sao**, va cach kiem thu thu cong neu can.

## 3. Diem nhan thuc te
- Ham nay **bao het moi van de mot luc** thay vi dung o cai dau tien. Khac biet nay quan trong
  hon ve ngoai: nguoi dung sua mot lan, thay vi chay lai bon lan de lo dan tung loi.
- Dieu kien 3 la cai hay bi bo qua nhat, va cung la cai lam reviewer kho chiu nhat: PR lac hau
  hien ca commit cua nguoi khac trong diff.
- Cong nay chay o **may ban**, truoc khi CI ton mot luot build. Dat vao hook `pre-push`
  (bai 59) thi khong ai phai nho chay no.
- Trong script co nhieu `|| true`: ham `kiem_tra_truoc_pr` **co y** tra ve khac 0 khi no chan,
  va `grep -c` tra ve khac 0 khi dem duoc 0. Ca hai la ket qua binh thuong chu khong phai loi,
  nen phai chan `set -e` de con doc duoc noi dung chung in ra.

## 4. Loi giai
[`truoc_khi_mo_pr.sh`](truoc_khi_mo_pr.sh) kiem chung tung dieu kien bang mot canh rieng, roi
dung mot canh **co ba van de cung luc** de chung minh ham bao du ca ba chu khong dung o cai dau.

## 5. Self-check
```bash
bash truoc_khi_mo_pr.sh
```
Truoc khi mo PR that:
```bash
git status --porcelain                          # phai rong
git log --format=%s origin/main..HEAD           # con wip/fixup! khong?
git fetch && git rev-list --count HEAD..origin/main   # phai la 0
git diff --stat main...HEAD                     # tu doc lai
```
