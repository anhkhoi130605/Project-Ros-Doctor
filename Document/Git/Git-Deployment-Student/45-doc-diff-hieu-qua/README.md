# Doc diff hieu qua khi review

## 1. De bai
Review mot PR 500 dong bang cach doc tuan tu tu tren xuong la cach cham nhat va bo sot nhieu
nhat. Git co san may co de tach **thay doi that** ra khoi **nhieu**: doi indent, doi ten file,
va thu tu doc.

## 2. Y tuong -- Checklist
| Co | Lam gi | Khi nao dung |
|---|---|---|
| `--stat` | toan canh: bao nhieu file, file nao to bat thuong | luon, dau tien |
| `-w` | bo qua thay doi **chi ve khoang trang** | PR co doi indent/format |
| `--stat` (tu dong) | hien `cu.js => moi.js` thay vi xoa + them | PR co doi ten file |
| `-- <duong-dan>` | chi doc mot file | PR nhieu file |
| `git diff HEAD~1 HEAD` | doc **tung commit** | lich su sach (bai 18) |
| `--word-diff` | danh dau **tung tu**: `[-gio-]{+don+}` | tai lieu, chuoi dai |

**Thu tu doc mot PR** (phan quan trong nhat, khong script nao thay duoc):
1. Doc **mo ta PR** truoc: tac gia dinh lam gi. Khong khop voi diff la da co van de.
2. `--stat` de nhin toan canh.
3. `-w` de biet phan logic that su bao nhieu dong.
4. Doc tung commit neu lich su sach; doc theo file neu khong.
5. **Test truoc, code sau**: test noi ro hanh vi mong doi la gi.

## 3. Diem nhan thuc te
- `-w` la co dang dung dau tien khi mo mot PR co ve to. Neu tu 500 dong xuong con 20 thi ban
  biet chinh xac phai doc 20 dong nao. Trong bai nay: 10 dong tho -> **2 dong** that su.
- Diff theo dong bao **ca cau** doi du chi doi mot tu -- do la ly do review tai lieu bang diff
  thuong bang mat, va `--word-diff` giai quyet dung cho do.
- Git khong luu "phep doi ten", no **tu suy ra** tu noi dung (bai 16). Nen neu tac gia doi ten
  **va** sua nhieu trong cung commit, git se bao "xoa file cu, them file moi" -- reviewer mat
  hoan toan kha nang doi chieu. Do la ly do ky thuat cua quy uoc "doi ten rieng mot commit".
- Reviewer nen chay `git diff -w` truoc khi comment "PR nay to qua": doi khi no chi to tren giay.

## 4. Loi giai
[`doc_diff_hieu_qua.sh`](doc_diff_hieu_qua.sh) dung mot PR co du **ba loai nhieu** cung luc: doi
ten file, thut le lai toan bo ham, va mot thay doi logic that (them thue) tron vao giua. Sau do
loc tung loai ra bang tung co, voi assertion chinh xac (10 dong tho -> 2 dong voi `-w`).

Hai chi tiet ky thuat trong script dang chu y: `--numstat` ngan cot bang **tab** va cot thu ba
cua dong doi ten la ca cum `cu.js => moi.js` co khoang trang ben trong, nen phai bao awk
`-F'\t'`; va `[-gio-]` phai so bang `grep -F` vi `[ ]` la lop ky tu trong bieu thuc.

## 5. Self-check
```bash
bash doc_diff_hieu_qua.sh
```
Review PR that:
```bash
git diff --stat main...HEAD
git diff -w --stat main...HEAD    # con lai bao nhieu la that
```
