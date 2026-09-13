# Commit message chuan: cau truc va viet "vi sao"

## 1. De bai
Bai 03 cham **phan dau** cua message (dung dinh dang Conventional Commits chua). Bai nay cham
**cau truc ca message nhieu dong**: tieu de ngan, mot dong trong, roi than bai xuong dong hop ly.
Trong thuc te hai bai thuong duoc dung chung mot luc trong hook `commit-msg` (bai 58).

## 2. Y tuong -- Checklist
Cau truc chuan:
```
fix: chan don hang trung khi bam nut hai lan
                                                  <- dong trong BAT BUOC
Nut dat hang khong bi vo hieu sau lan bam dau, nen mang cham la
nguoi dung bam lai va tao hai don. Them khoa theo ma don o phia
server thay vi chi disable nut o phia client.

Refs: #482
```

1. **Tieu de <= 50 ky tu.** `git log --oneline` va giao dien GitHub cat tieu de quanh moc nay,
   ma phan bi cat thuong lai la phan mang thong tin.
2. **Khong dau cham cuoi tieu de** -- day la tieu de, khong phai mot cau.
3. **Dong thu hai phai rong.** Git dung dong trong nay de biet dau la tieu de, dau la than bai.
   Thieu no thi `git log --oneline` in ca doan van thanh mot dong.
4. **Than bai xuong dong o 72 ky tu.** `git log` thut vao 4 khoang trang khi in than bai,
   72 + 4 = 76, vua trong khung 80 cot.
5. **Message mot dong la hop le** -- khong phai thay doi nao cung can giai thich dai.

## 3. Diem nhan thuc te
- Than bai tra loi **vi sao**, khong phai **lam gi**. Phan "lam gi" da nam trong diff roi, doc
  diff la thay. Cai diff khong bao gio noi duoc la: tai sao chon cach nay, da thu cach nao that
  bai, rang buoc nao buoc phai lam vay. Sau sau thang, do la thu duy nhat ban con can.
- Nguoi doc message cua ban nhieu nhat khong phai reviewer, ma la chinh ban trong luc chay
  `git blame` de tim vi sao dong code quai la nay ton tai.
- Viet tieu de o **the menh lenh** ("them", "sua", "bo") de doc lien mach voi cach git tu sinh
  message: "Merge branch...", "Revert...".
- Ghi so issue o cuoi (`Refs: #482`) chu khong nhet vao tieu de -- tieu de da chat cho roi.
- Dung viet "sua theo review" hay "fix CI". Sau nay khong ai biet review noi gi, CI hong cai gi.

## 4. Loi giai
[`cham_cau_truc_message.sh`](cham_cau_truc_message.sh) tra ve **ma loi rieng cho tung lo**
(rong / tieu de dai / co dau cham / thieu dong trong / than bai dai) de moi truong hop hien mot
loi nhac khac nhau -- bao chung mot cau thi nguoi doc khong biet phai sua gi. Test bien khong
dem ky tu bang tay ma **sinh chuoi theo do dai** roi kiem tra lai chinh do dai truoc khi cham,
vi dem nham mot ky tu la test mat y nghia.

## 5. Self-check
```bash
bash cham_cau_truc_message.sh
```
Cham mot message cu the, hoac cham chinh file message git dang soan:
```bash
bash cham_cau_truc_message.sh "feat: them gio hang."
bash cham_cau_truc_message.sh .git/COMMIT_EDITMSG
```
