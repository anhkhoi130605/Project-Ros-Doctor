# Merge ba chieu -- vi sao git tu gop duoc

## 1. De bai
Hai nguoi cung sua mot file, git gop lai ma khong hoi gi. Lan khac cung hai nguoi sua mot file
thi git bao conflict. Su khac nhau khong nam o "co sua cung file khong" -- hay tim xem no nam o dau.

## 2. Y tuong -- Checklist
Cau hoi that su cua merge khong phai "hai file khac nhau cho nao" ma la **"moi ben da doi gi so
voi diem xuat phat chung"**.

1. `git merge-base <nhanh-a> <nhanh-b>` -- tim commit chung cuoi cung cua hai nhanh. Goi la
   **merge base**, hay **base**.
2. Voi tung dong, git nhin **ba ban**: o base, o ben ta, o ben kia. Quy tac:

   | Base | Ben ta | Ben kia | Ket qua |
   |---|---|---|---|
   | A | A | B | lay B (chi ben kia doi) |
   | A | B | A | lay B (chi ben ta doi) |
   | A | B | B | lay B (hai ben doi giong nhau, khong conflict) |
   | A | B | C | **conflict** -- git khong doan |

3. Do la ly do hai nguoi sua **cung mot file** o **hai cho khac nhau** thi gop duoc: moi dong
   chi co mot ben dong den.
4. Commit merge co **hai cha**, ghi lai ca hai duong lich su.
5. Base **khong** phai "commit dau tien". Merge lan hai giua hai nhanh co base moi -- chinh la
   commit merge lan truoc. Nho vay git khong bat ban giai lai conflict da giai roi.

## 3. Diem nhan thuc te
- Hieu vai tro cua base thi het ngac nhien: khi ban rebase hay cherry-pick, base thay doi, nen
  cung hai nhanh do ma luc conflict luc khong.
- Conflict khong phai loi cua ai. No la git noi: "cho nay hai nguoi sua khac nhau, tao khong
  duoc phep doan". Git chon bua o day thi nguy hiem hon nhieu.
- Merge cang muon thi base cang xa, thay doi hai ben cang chong len nhau, conflict cang nhieu.
  Do la ly do ky thuat cua loi khuyen "merge `main` vao nhanh cua ban thuong xuyen".
- Git so **noi dung theo dong**, khong hieu cu phap. Hai nguoi doi hai dong khac nhau nhung
  cung mot ham thi git gop im lang -- code hop le ve van ban nhung sai ve logic. Do la ly do
  merge sach van phai chay lai test.

## 4. Loi giai
[`merge_ba_chieu.sh`](merge_ba_chieu.sh) dung mot file, cho hai nhanh sua o hai cho khac nhau
(gop duoc), roi dung ba tinh huong cua bang tren: chi mot ben doi, hai ben doi giong nhau, hai
ben doi khac nhau. Phan cuoi kiem chung base **da tien len** sau lan merge dau.

## 5. Self-check
```bash
bash merge_ba_chieu.sh
```
Xem base giua nhanh cua ban va main:
```bash
git merge-base --all main HEAD
git log --oneline $(git merge-base main HEAD)..HEAD   # ban da lam gi tu luc tach nhanh
```
