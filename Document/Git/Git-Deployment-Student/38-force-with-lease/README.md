# --force-with-lease thay vi --force

## 1. De bai
Doi khi phai ghi de lich su tren remote that: sau khi rebase nhanh cua minh cho gon, hoac sau khi
amend mot commit da push. `--force` lam duoc, nhung no ghi de **mu** -- khong kiem tra xem trong
luc do co ai day them gi len khong. `--force-with-lease` kiem tra dieu do.

## 2. Y tuong -- Checklist
1. "Lease" = **hop dong thue**: ban noi voi git "toi tin remote dang o cho X". Git chi ghi de
   neu remote **that su** dang o X. Neu co nguoi day len trong luc do -> tu choi.
2. Git so vi tri that tren server voi **nhanh remote-tracking tren may ban** (`origin/<nhanh>`),
   tuc la voi cai ban dang **nho**.
3. Truong hop dung nhat: nhanh PR cua **rieng ban** tren fork cua rieng ban -- khong ai khac
   dang dung no lam nen.

## 3. Diem nhan thuc te
- **Cai bay lon nhat: `git fetch` lam mat tac dung bao ve.** Lease so voi ghi nho cuc bo; neu ban
  (hoac IDE, hoac mot cong cu chay nen) vua fetch xong, ghi nho da duoc cap nhat thanh vi tri
  moi -> lease khop -> push di qua, va ban ghi de dung cai vua fetch ve ma chua he doc.
  Nhieu IDE tu fetch ngam vai phut mot lan, nen truong hop nay khong hiem.
- Chan chac hon bang cach noi ro ban ky vong remote dang o dau:
  ```bash
  git push --force-with-lease=nhanh:<hash-ban-da-xem> origin nhanh
  ```
  Cach nay dung du da fetch, vi hash la thu ban tu chi dinh chu khong phai git suy ra.
- `--force-with-lease` **khong** bao ve khi nhanh chua co remote-tracking ref (vd ban vua them
  remote). Luc do khong co gi de so, va git cho qua.
- Dat alias cho de nho, va de khong bao gio go nham `--force`:
  ```bash
  git config --global alias.pushf 'push --force-with-lease'
  ```

## 4. Loi giai
[`force_with_lease.sh`](force_with_lease.sh) dung bon canh lien tiep tren cung mot nhanh PR:
push thuong bi tu choi sau khi amend; `--force-with-lease` duoc chap nhan khi khong ai dong vao;
bi tu choi khi dong doi vua day len; va `--force` thi ghi de mu, day commit cua ho di.

Canh thu tu la phan dang chu y nhat: chay **dung mot lenh `git fetch`** truoc khi push, va
`--force-with-lease` mat tac dung -- script kiem chung commit cua dong doi da bi ghi de that.
Cuoi bai la cach chan bang `--force-with-lease=<nhanh>:<hash>`.

Ham `dung_canh` don nhanh cu theo kieu "co thi moi xoa" (`git show-ref ... && git branch -D`)
thay vi `git branch -D ... || true`: cach sau nuot moi loi, ke ca loi that.

## 5. Self-check
```bash
bash force_with_lease.sh
```
Khi can ghi de nhanh PR cua ban:
```bash
git fetch origin && git log --oneline origin/nhanh-cua-toi   # DOC truoc da
git push --force-with-lease origin nhanh-cua-toi
```
