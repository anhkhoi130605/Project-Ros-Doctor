# .gitattributes va ket dong CRLF/LF

## 1. De bai
Ban sua hai dong trong mot file, mo PR, va git bao "changed 400 lines". Reviewer khong nhin ra
ban thuc su doi gi. Nguyen nhan gan nhu luon la ket dong: editor cua ban ghi CRLF trong khi file
trong repo dang la LF, nen **moi** dong deu bi tinh la thay doi.

Hay chot ket dong cho ca repo bang `.gitattributes` de loi nay khong con xay ra nua.

## 2. Y tuong -- Checklist
Ket dong la ky tu **nam trong noi dung file**, khong phai thuoc tinh ben ngoai. Windows dung
`\r\n` (CRLF), Linux/macOS dung `\n` (LF). Doi ket dong = doi tung dong = diff do toan bo file.

1. Doc git dang giu ket dong gi: `git ls-files --eol` -- in ra `i/lf w/crlf attr/text=auto`,
   trong do `i/` la trong index, `w/` la tren dia.
2. Them file `.gitattributes` o goc repo voi mot dong:
   ```
   * text=auto
   ```
   Nghia la: trong repo **luon luu LF**, con tren dia thi tuy nen tang.
3. `.gitattributes` moi them **khong** tu dong sua cac file da commit. Phai chay
   `git add --renormalize .` roi commit -- day la buoc hay bi quen nhat.
4. Danh dau file nhi phan de git khong "chuan hoa" ben trong chung:
   ```
   *.png binary
   *.pdf binary
   ```
5. Kiem chung: xoa file di roi `git checkout -- file` de lay lai dung ban git dang giu.

## 3. Diem nhan thuc te
- `.gitattributes` di theo repo (duoc commit) nen ap dung cho **moi nguoi** trong team.
  `core.autocrlf` la config tren may tung nguoi -- dat no chi sua duoc may ban, dong doi
  moi vao du an van gap lai van de. Luon uu tien `.gitattributes`.
- Quen `binary` cho file nhi phan la loi nang: git se doi byte ben trong anh, font hay file
  `.docx` va lam hong han file, thuong chi phat hien ra rat lau sau do.
- File `.sh` bi ghi CRLF thi Linux khong chay duoc, bao loi kieu
  `bad interpreter: /usr/bin/env bash^M`. Chot bang `*.sh text eol=lf` la het.
- Sau `--renormalize` se co mot commit to dung cham vao rat nhieu file. Do la binh thuong --
  nen tach rieng thanh mot commit khong lan noi dung nao khac, va ghi ro trong message.

## 4. Loi giai
[`chuan_hoa_dong_ket.sh`](chuan_hoa_dong_ket.sh) commit hai file (mot CRLF, mot LF) de thay repo
dang lan lon, roi them `.gitattributes`, chung minh no khong an gi cho den khi
`git add --renormalize .`, va cuoi cung danh dau `*.png binary` de kiem chung git khong con
cham vao ket dong cua file nhi phan.

## 5. Self-check
```bash
bash chuan_hoa_dong_ket.sh
```
Kiem tra repo cua ban dang lan lon khong:
```bash
git ls-files --eol | awk '{print $1}' | sort | uniq -c   # nhieu hon 1 dong i/ la co van de
```
