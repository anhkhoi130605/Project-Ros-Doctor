# PR thuc ra la gi: hai cham va ba cham

## 1. De bai
Git **khong biet** Pull Request la gi -- PR la tinh nang cua GitHub/GitLab. Ben duoi no chi la
mot cau hoi: "lay nhung gi nhanh A co ma nhanh B chua co". Hay dung lai cau hoi do bang git
thuan, va lam ro cho nham lan nhieu nhat: `..` va `...`.

## 2. Y tuong -- Checklist
| Cau hoi | Lenh | Dau cham |
|---|---|---|
| PR gom **commit** nao? | `git log main..nhanh` | **hai** |
| PR **doi** nhung gi? | `git diff main...nhanh` | **ba** |

Dau cham **nguoc nhau** giua hai lenh, va do la ly do nhieu nguoi go nham.

1. `git diff main...nhanh` = so tu **diem tach nhanh** (merge base) den dinh nhanh cua ban.
   Chi ra dung thay doi cua ban.
2. `git diff main..nhanh` = so **thang** dinh main voi dinh nhanh. Neu main da di tiep, no lan ca
   thay doi cua dong doi -- va **dao nguoc dau**: file ban chua he dong vao bi bao la ban da
   xoa thay doi cua ho.
3. Giao dien GitHub/GitLab luon hien ban **ba cham**. Nen khi diff tren may khac tren web, gan
   nhu chac chan la ban dang go hai cham.
4. Kiem tra PR co merge sach khong ma khong dung den thu muc lam viec:
   ```bash
   git merge-tree --write-tree main nhanh    # git >= 2.38; tra 0 = sach
   ```

## 3. Diem nhan thuc te
- Cho `..` va `...` doi nghia giua `log` va `diff` la mot trong nhung cho khong nhat quan
  cua git. Cach nho: **`log` dem commit** nen `..` (bo phan chung) la du; **`diff` so noi dung**
  nen phai neo vao diem tach nhanh, tuc `...`.
- Truoc khi mo PR, tu doc `git diff main...HEAD` la thoi quen tot nhat: ban thay dung cai
  reviewer se thay, va thuong tu phat hien file thua hoac console.log con sot.
- `gh pr diff` cung dung ban ba cham -- dung no de doc PR ngay trong terminal.
- Neu diff cua ban lan file cua nguoi khac tren giao dien web, do khong phai loi cua `...` --
  do la dau hieu ban da **merge main vao nhanh** thay vi rebase, hoac PR nham nhanh nen.

## 4. Loi giai
[`pr_la_gi.sh`](pr_la_gi.sh) dung mot canh that: ban tach nhanh, lam hai commit, **trong luc do
main di tiep** hai commit cua dong doi. Sau do so hai cach diff -- ban ba cham chi ra mot file
cua ban, ban hai cham lan ca ba file va bao ban "da xoa" thay doi cua dong doi.

Phan cuoi kiem tra `merge-tree`, va quan trong la **kiem chung ca chieu nguoc lai**: tao mot nhanh
that su xung dot de chung minh lenh do co phat hien conflict, chu khong phai luon tra ve 0.

## 5. Self-check
```bash
bash pr_la_gi.sh
```
Truoc khi mo PR that:
```bash
git log --oneline main..HEAD     # commit cua ban
git diff --stat main...HEAD      # thay doi cua ban (nhu tren web)
```
