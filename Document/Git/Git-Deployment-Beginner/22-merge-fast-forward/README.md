# Merge fast-forward va merge that

## 1. De bai
Co hai kieu merge hoan toan khac nhau, va git tu chon giup ban ma khong noi gi. Ket qua: doi khi
merge xong lich su thang tap khong con dau vet cua nhanh, doi khi lai sinh ra mot commit merge.
Hay biet khi nao ra kieu nao, va chu dong chon.

## 2. Y tuong -- Checklist
1. **Fast-forward** xay ra khi nhanh dich **chua di dau** tu luc tach nhanh. Luc do lich su cua
   nhanh feature da chua toan bo lich su cua main, nen git chi can **dich con tro main len**
   -- khong tao commit nao. Lich su thanh mot duong thang, khong con dau vet ten nhanh.
2. `git merge --no-ff <nhanh>` **bat** git tao commit merge du co the FF. Commit merge co hai cha,
   nen `git log --first-parent` doc duoc mot dong cho ca nhanh, giu lai ranh gioi cua PR.
3. `git merge --ff-only <nhanh>` bao git: **neu khong FF duoc thi dung lai**, dung tu y tao
   commit merge. Khi that bai no khong de lai merge do dang.
4. Khi hai ben deu co commit rieng thi khong the FF -- git tao commit merge (merge 3-way, bai 26).
5. Kiem tra truoc khi merge: `git merge-base --is-ancestor main <nhanh>` -- neu dinh main la
   to tien cua nhanh thi FF duoc.

## 3. Diem nhan thuc te
- Doi khi merge xong `git log` thang tap va ban khong con biet nhung commit nao thuoc ve PR nao
  -- do la FF. Voi nhanh nho mot commit thi gon; voi PR gom 8 commit thi mat het ranh gioi.
- Tren GitHub, ba nut merge tuong ung: "Create a merge commit" = `--no-ff`, "Squash and merge" =
  gop het thanh mot commit, "Rebase and merge" = phat lai tung commit roi FF.
- `git config --global pull.ff only` la mot cau hinh dang bat: no chan `git pull` tu y tao
  commit merge khi ban va remote da re nhau, buoc ban chon rebase hay merge mot cach co y thuc.
- Nhieu team dat quy uoc `--no-ff` cho merge vao `main` de moi PR luon la mot commit merge --
  revert ca PR chi con la revert mot commit (`git revert -m 1 <hash>`).

## 4. Loi giai
[`merge_fast_forward.sh`](merge_fast_forward.sh) dung ba tinh huong: FF duoc (kiem chung khong
co commit merge nao sinh ra), `--no-ff` (kiem chung commit merge co dung hai cha khac nhau), va
da re nhanh (kiem chung `--ff-only` that bai va khong de lai `MERGE_HEAD`). Phan cuoi dung
`merge-base --is-ancestor` de doan truoc ket qua truoc khi merge.

## 5. Self-check
```bash
bash merge_fast_forward.sh
```
Kiem tra nhanh cua ban co FF duoc khong:
```bash
git merge-base --is-ancestor main tinh-nang && echo "FF duoc" || echo "da re nhanh"
```
