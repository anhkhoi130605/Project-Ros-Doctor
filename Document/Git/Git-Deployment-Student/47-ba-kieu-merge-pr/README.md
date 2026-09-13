# Ba kieu merge PR -- ba lich su khac nhau

## 1. De bai
Nut merge tren GitHub co ba lua chon, va chung cho **ba lich su khac han nhau**. Ben duoi khong
co gi bi an: ca ba deu la lenh git thuan. Hay chay ca ba tren cung mot PR de so ket qua.

## 2. Y tuong -- Checklist
| Kieu tren web | Lenh git tuong duong | Commit vao main | Commit merge | Giu hash goc |
|---|---|---|---|---|
| Create a merge commit | `git merge --no-ff` | ca 3 + 1 merge | co | **co** |
| Squash and merge | `git merge --squash` + `git commit` | **1** | khong | khong |
| Rebase and merge | phat lai tung commit roi FF | 3 | khong | khong |

1. **Merge commit** -- giu nguyen moi thu, ke ca commit "sua theo review". Lich su day du nhung
   nhieu nut.
2. **Squash** -- ba commit gop thanh mot. Lich su main sach nhat, moi PR mot dong.
3. **Rebase merge** -- giu ca ba commit nhung khong co commit merge; lich su thang tap.

**Ca ba cho ra cung mot noi dung file cuoi cung** -- chi lich su khac.

## 3. Diem nhan thuc te
- **Hau qua kin dao cua squash va rebase merge**: commit goc cua PR khong con nam trong lich su
  main (hash da doi). Nen git **khong coi nhanh do la da merge**: `git branch --merged` khong
  liet ke no va `git branch -d` se tu choi (bai 42). Doi ngu dung squash phai quen xoa nhanh
  bang `-D`, hoac de GitHub tu xoa sau khi merge.
- Squash lam `git bisect` (bai 81) hieu qua hon: moi commit tren main la mot don vi hoan chinh
  va chay duoc. Doi lai la mat lich su chi tiet ben trong PR.
- Merge commit lam `git revert -m 1 <hash>` bo duoc **ca PR** bang mot lenh -- rat dang gia khi
  can rollback gap.
- Chon mot kieu roi **thong nhat toan repo**. Tron ca ba la thu lich su kho doc nhat: co cho la
  duong thang, co cho la mang nhen, khong quy tac nao.
- Neu chon squash, PR **phai** duoc mo ta tu te: message cua commit gop la thu duy nhat con lai
  trong lich su.

## 4. Loi giai
[`ba_kieu_merge_pr.sh`](ba_kieu_merge_pr.sh) dung mot PR ba commit (trong do co mot commit "sua
theo review" khong dang luu), cho **main di tiep** trong luc cho review, roi chay ca ba kieu tren
ba nhanh rieng. Script kiem chung tung o cua bang tren bang so, va chot lai bang mot phep so
`tree` -- ca ba nhanh cho ra **cung mot hash noi dung**, chung minh khac biet chi nam o lich su.

Kieu 3 duoc dung bang `git cherry-pick <goc>..<dinh>` vi do dung la thu GitHub lam.
Luu y `git cherry-pick` **khong co** co `-q`, phai tu dap output.

## 5. Self-check
```bash
bash ba_kieu_merge_pr.sh
```
Xem repo cua ban dang theo kieu nao:
```bash
git log --oneline --graph -20
git log --merges --oneline -5      # co commit merge khong?
```
