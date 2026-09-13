# PR template va CODEOWNERS

## 1. De bai
Hai file nho trong `.github/` quyet dinh chat luong review nhieu hon moi loi nhac trong hop chat:
**PR template** (moi PR tu co san khung mo ta) va **CODEOWNERS** (dung nguoi duoc goi vao review).

## 2. Y tuong -- Checklist
### `.github/pull_request_template.md`
GitHub tu do noi dung file nay vao o mo ta moi khi ai do mo PR. Thu tu cac muc chinh la
**thu tu ban muon nguoi ta suy nghi**:
```markdown
## Thay doi gi
## Vi sao
## Kiem thu the nao
## Anh huong
- [ ] Co doi lieu do (migration)
- [ ] Co doi bien moi truong / secret
```

### `.github/CODEOWNERS`
```
*                       @cong-ty/nen-tang
/api/                   @cong-ty/backend
/api/thanh-toan/        @cong-ty/thanh-toan @an
*.sql                   @cong-ty/du-lieu
```

1. Luat khop giong `.gitignore` (bai 19), voi mot khac biet quan trong: **luat cuoi cung khop
   se thang, va chi luat do co hieu luc** -- khong cong don.
2. Nen luat **cu the hon phai dat SAU**: `/api/thanh-toan/` sau `/api/`.
3. Duoi file (`*.sql`) khop o **moi cap** thu muc.
4. GitHub tu them nhung nguoi/nhom nay lam reviewer, va co the bat buoc ho duyet
   (branch protection, bai 65).

## 3. Diem nhan thuc te
- **Loi im lang nguy hiem nhat**: dat `/api/` sau `/api/thanh-toan/`. Moi file thanh toan se roi
  vao `@backend`, va nhom thanh toan **khong bao gio duoc goi vao review** -- khong ai phat hien
  cho den khi co su co.
- Vi `*.sql` nam sau `/api/`, mot file `.sql` trong `/api/` se thuoc nhom du lieu chu khong phai
  backend. Sap xep CODEOWNERS la viec can nghi, khong phai them dan vao cuoi.
- PR to dung nhieu mang se cho **chu ky cua nhieu nhom** -- do la mot ly do nua de PR nho (bai 44).
- Checkbox "co doi lieu do / co doi secret" trong template dang gia hon ca doan van: no bat tac
  gia dung lai mot giay, va cho reviewer biet phai chu y gi.
- Template co the dat theo tung loai PR (`.github/PULL_REQUEST_TEMPLATE/` nhieu file) nhung mot
  file duy nhat ma moi nguoi that su dien con hon nam file bi bo trong.

## 4. Loi giai
[`pr_template_codeowners.sh`](pr_template_codeowners.sh) tao ca hai file, viet ham `cham_template`
(dat duoc vao CI cua chinh repo), va viet ham `chu_so_huu` **phan giai CODEOWNERS** de kiem chung
luat "luat cuoi cung thang" -- gom ca truong hop `/api/thanh-toan/` thang `/api/` va `*.sql`
thang ca hai. Cuoi bai dung `git diff --name-only main...HEAD` de tinh **nhung nhom nao phai
duyet PR nay**.

Chi tiet ky thuat: ham phan giai dung `read -r mau nguoi <<< "$dong"` chu khong cat bang
`${dong%% *}` -- cach sau de lai nguyen chuoi thut le o phan con lai.

## 5. Self-check
```bash
bash pr_template_codeowners.sh
```
Kiem tra repo cua ban:
```bash
ls .github/pull_request_template.md .github/CODEOWNERS 2>/dev/null || echo "chua co"
```
