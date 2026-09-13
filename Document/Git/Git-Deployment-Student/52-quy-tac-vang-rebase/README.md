# Quy tac vang cua rebase

## 1. De bai
**Dung rebase lich su ma nguoi khac dang dung lam nen.** Ai cung thuoc cau nay nhung it ai thay
hau qua cu the, nen no de bi bo qua "cho lan nay thoi". Hay dung lai tai nan do va do thiet hai
bang so.

## 2. Y tuong -- Checklist
1. Rebase tao commit **moi** (bai 50). Neu ban day chung de len commit cu ma nguoi khac da tach
   nhanh tu do, may ho khong con to tien chung voi server nua.
2. Hau qua khi ho **pull (merge)**: lich su **nhan doi** -- moi commit cua ban xuat hien hai lan,
   ban cu va ban da rebase. Doc log khong biet cai nao that.
3. Hau qua khi ho **`reset --hard`** theo loi khuyen tren mang: **cong viec cua ho bien mat** khoi
   nhanh (van cuu duoc bang reflog, bai 24 -- neu ho biet den no).
4. Kiem tra truoc khi rebase: commit nay da len server chua?
   ```bash
   git fetch && git merge-base --is-ancestor <hash> origin/<nhanh>
   ```
   Thanh cong = no dang o tren server -> viet lai no la dong den nguoi khac.

**Ranh gioi:**
| An toan | Khong an toan |
|---|---|
| commit **chua** push | nhanh chung nguoi khac da tach ra tu do |
| nhanh PR chi minh ban dung (bai 38, 39) | `main`, `develop`, nhanh release |

## 3. Diem nhan thuc te
- `--force-with-lease` (bai 38) **khong** cuu duoc o day. No chi kiem tra "server co bi ai day
  them gi khong" -- no khong biet ai da **tach nhanh** tu lich su ban sap ghi de.
- Neu li viet lai lich su chung roi: **bao ca doi ngu**, va nguoi khac chay
  ```bash
  git rebase --onto origin/<nhanh> <hash-cu-cua-nhanh> <nhanh-cua-ho>
  ```
  de dat lai phan viec **cua rieng ho** len nen moi (bai 53) -- thay vi merge (nhan doi) hay
  `reset --hard` (mat viec).
- Cach chac chan nhat la khong phu thuoc vao tri nho: bat **branch protection** cho `main` va
  cac nhanh chung tren server (bai 65), de server tu choi force push.
- Nhanh PR cua ban an toan **vi khong ai lay no lam nen**. Neu co nguoi bat dau tach nhanh tu PR
  cua ban, no thanh nhanh chung, va quy tac nay ap dung ngay.

## 4. Loi giai
[`quy_tac_vang_rebase.sh`](quy_tac_vang_rebase.sh) dung hai ban sao that: ban rebase mot nhanh da
push (chi de don message cho dep), dong doi thi da tach ra lam viec tren do. Script do bang so
ca hai cach ho co the phan ung -- `pull` merge cho ra **moi commit xuat hien dung 2 lan**, con
`reset --hard` lam file cua ho **bien mat** khoi thu muc lam viec.

## 5. Self-check
```bash
bash quy_tac_vang_rebase.sh
```
Truoc khi rebase, tu hoi:
```bash
git fetch
git merge-base --is-ancestor HEAD origin/<nhanh> && echo "DA len server -- can than"
git log --oneline origin/<nhanh>       # co ai tach nhanh tu day khong?
```
