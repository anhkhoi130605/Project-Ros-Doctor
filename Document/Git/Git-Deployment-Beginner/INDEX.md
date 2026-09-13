# Tang 01 -- Beginner - Git mot minh, mot nhanh (bai 01-25)

Muc tieu cua tang nay: dung git mot minh cho thanh thao truoc khi buoc vao lam viec nhom.
Het 25 bai la ban doc duoc trang thai repo bat ky luc nao, sua duoc moi thao tac nham, va
khong con so cac dong canh bao cua git. **Du 25/25 bai.**

Moi bai la mot thu muc gom `README.md` (de bai + checklist + diem nhan thuc te + loi giai +
self-check) va mot script chay duoc, ket thuc bang `OK` neu moi thu dung.

Bai 01-10 va 25 la **logic thuan** -- cham mot chuoi, khong dung den repo. Cac bai con lai tao
mot **repo git that** trong thu muc tam (qua [`../lib/sandbox.sh`](../lib/sandbox.sh)), chay
lenh git that roi kiem chung ket qua, va tu don khi xong.

## Ghi va doc (01-08)

| # | Bai | Hoc duoc gi | Code |
|---|---|---|---|
| 01 | [Init & commit dau tien](01-init-first-commit/) | Message rac va message qua ngan can hai loi nhac khac nhau | [sh](01-init-first-commit/check_commit_msg.sh) |
| 02 | [.gitignore dung cach](02-gitignore-dung-cach/) | Tu viet ham so khop pattern de hieu git dang lam gi | [sh](02-gitignore-dung-cach/check_gitignore.sh) |
| 03 | [Doc lich su commit](03-doc-lich-su-commit/) | Conventional Commits: `<type>(scope): <mo ta>` | [sh](03-doc-lich-su-commit/check_commit_convention.sh) |
| 04 | [status, diff, restore](04-sua-sai-status-diff-restore/) | Hai ky tu dau cua `--porcelain` la hai vung khac nhau | [sh](04-sua-sai-status-diff-restore/check_status_porcelain.sh) |
| 05 | [Clone & remote](05-clone-remote-co-ban/) | Ten repo duoc phep co dau cham -- `user.github.io` la hop le | [sh](05-clone-remote-co-ban/check_remote_url.sh) |
| 06 | [Tag & versioning](06-tag-va-versioning/) | SemVer `vX.Y.Z[-suffix]`, va vi sao phai co ca ba so | [sh](06-tag-va-versioning/check_semver_tag.sh) |
| 07 | [git stash](07-git-stash/) | Doc dong `stash list`: ca dang `On` lan `WIP on` | [sh](07-git-stash/parse_stash_line.sh) |
| 08 | [diff & blame](08-diff-va-blame/) | Cot `+`/`-` la do dai thanh da nen, khong phai so dong | [sh](08-diff-va-blame/parse_diff_stat.sh) |

## Sua sai va cau hinh (09-10)

| # | Bai | Hoc duoc gi | Code |
|---|---|---|---|
| 09 | [reset vs revert](09-undo-reset-vs-revert/) | Da push thi luon revert; chua push moi chon giua ba kieu reset | [sh](09-undo-reset-vs-revert/choose_undo_strategy.sh) |
| 10 | [config & alias](10-git-config-va-alias/) | Alias chi la phep the chuoi, khong phai lenh moi | [sh](10-git-config-va-alias/expand_alias.sh) |

## Ba vung va lich su (11-18)

| # | Bai | Hoc duoc gi | Code |
|---|---|---|---|
| 11 | [Staging area -- ba vung](11-staging-area-ba-vung/) | `git diff` **khong** bao gom phan da add -- nguon goc cua commit thieu file | [sh](11-staging-area-ba-vung/show_three_areas.sh) |
| 12 | [Amend commit cuoi](12-amend-commit-cuoi/) | Amend khong sua commit cu, no **thay the** -- nen hash doi | [sh](12-amend-commit-cuoi/amend_va_hash.sh) |
| 13 | [.gitattributes & CRLF](13-gitattributes-crlf/) | Vi sao PR bao doi 400 dong khi ban chi sua 2 dong | [sh](13-gitattributes-crlf/chuan_hoa_dong_ket.sh) |
| 14 | [Cu phap tham chieu](14-cu-phap-tham-chieu/) | `HEAD~2` dem buoc, `HEAD^2` chon nhanh -- hai commit khac han | [sh](14-cu-phap-tham-chieu/tham_chieu_commit.sh) |
| 15 | [git clean an toan](15-git-clean-an-toan/) | `-xfd` la lenh xoa mat `.env` pho bien nhat | [sh](15-git-clean-an-toan/don_file_rac.sh) |
| 16 | [git rm & git mv](16-git-rm-va-mv/) | `rm --cached` cho commit nham `.env`; git **tu suy ra** doi ten | [sh](16-git-rm-va-mv/xoa_va_doi_ten.sh) |
| 17 | [Tim trong lich su](17-tim-trong-lich-su/) | `-S` tim trong **noi dung thay doi**, van chay khi message la rac | [sh](17-tim-trong-lich-su/tim_trong_lich_su.sh) |
| 18 | [Commit atomic](18-commit-atomic/) | Tach commit da lo gop bang `reset --soft` va `add -p` | [sh](18-commit-atomic/tach_commit.sh) |

## Nhanh va cach thoat hiem (19-25)

| # | Bai | Hoc duoc gi | Code |
|---|---|---|---|
| 19 | [.gitignore nang cao](19-gitignore-nang-cao/) | File **da theo doi** thi `.gitignore` khong con y nghia gi | [sh](19-gitignore-nang-cao/uu_tien_gitignore.sh) |
| 20 | [Branch la con tro](20-branch-la-con-tro/) | Mot nhanh la mot file 41 byte -- tao va xoa deu re | [sh](20-branch-la-con-tro/branch_la_con_tro.sh) |
| 21 | [switch vs checkout](21-switch-vs-checkout/) | `checkout -- file` xoa thay doi ma khong hoi, khong cuu duoc | [sh](21-switch-vs-checkout/switch_va_restore.sh) |
| 22 | [Merge fast-forward](22-merge-fast-forward/) | FF khong tao commit nao -- va lam mat ranh gioi cua nhanh | [sh](22-merge-fast-forward/merge_fast_forward.sh) |
| 23 | [Detached HEAD](23-detached-head/) | Khong phai loi; commit o day mo coi den khi ban dat ten | [sh](23-detached-head/detached_head.sh) |
| 24 | [reflog -- phao cuu sinh](24-reflog-phao-cuu-sinh/) | Cuc bo, khong push duoc, het han sau 90 ngay | [sh](24-reflog-phao-cuu-sinh/reflog_cuu_ho.sh) |
| 25 | [Commit message chuan](25-commit-message-chuan/) | Than bai tra loi **vi sao**; phan **lam gi** da nam trong diff | [sh](25-commit-message-chuan/cham_cau_truc_message.sh) |

## Chay tat ca
```bash
cd ..
bash run_all.sh          # bang PASS/FAIL toan bo cac bai
```
Hoac chay rieng mot bai:
```bash
bash 11-staging-area-ba-vung/show_three_areas.sh    # in "OK"
```
