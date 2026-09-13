# Tang 02 -- Student - Git khi lam viec nhom (bai 26-55)

Muc tieu cua tang nay: tu "dung git mot minh" sang "dung git khi co nguoi khac cung sua". Het 30
bai la ban giai duoc conflict ma khong so, hieu remote thuc su la gi, mo va review PR co nghe,
va viet lai lich su ma khong lam hong viec cua ai. **Du 30/30 bai.**

Moi bai la mot thu muc gom `README.md` (de bai + checklist + diem nhan thuc te + loi giai +
self-check) va mot script chay duoc, ket thuc bang `OK` neu moi thu dung.

Toan bo tang nay chay **offline** -- cac bai ve remote va PR dung repo bare cuc bo dong vai
server, nen khong can mang, khong can tai khoan GitHub.

## Merge va conflict (26-33)

| # | Bai | Hoc duoc gi | Code |
|---|---|---|---|
| 26 | [Merge ba chieu](26-merge-3-way/) | Git so voi diem tach nhanh, khong phai so hai dinh | [sh](26-merge-3-way/merge_ba_chieu.sh) |
| 27 | [Doc dau conflict](27-doc-conflict-marker/) | Index giu dong thoi ba ban file: `:1:` `:2:` `:3:` | [sh](27-doc-conflict-marker/doc_conflict_marker.sh) |
| 28 | [ours va theirs](28-chon-ours-theirs/) | `--ours`, `-X ours`, `-s ours` cho ba ket qua khac han | [sh](28-chon-ours-theirs/chon_ours_theirs.sh) |
| 29 | [Duong lui khi merge do dang](29-merge-abort/) | `--abort` vs `--quit` vs `reset --hard` | [sh](29-merge-abort/merge_abort.sh) |
| 30 | [Conflict trong lockfile](30-conflict-lockfile/) | Dung giai tay -- sinh lai tu `package.json` | [sh](30-conflict-lockfile/conflict_lockfile.sh) |
| 31 | [conflictStyle zdiff3](31-conflict-style-zdiff3/) | Hien ban goc thi moi biet ai them ai xoa | [sh](31-conflict-style-zdiff3/conflict_style.sh) |
| 32 | [git rerere](32-git-rerere/) | Giai mot lan, git tu dien nhung lan sau | [sh](32-git-rerere/git_rerere.sh) |
| 33 | [git mergetool](33-mergetool/) | Ba khung cua cong cu chinh la ba stage trong index | [sh](33-mergetool/mergetool.sh) |

## Remote (34-42)

| # | Bai | Hoc duoc gi | Code |
|---|---|---|---|
| 34 | [fetch vs pull](34-fetch-vs-pull/) | `origin/main` la ghi nho cuc bo, khong phai nhanh tren server | [sh](34-fetch-vs-pull/fetch_vs_pull.sh) |
| 35 | [pull --rebase](35-pull-rebase/) | Ba kieu pull cho ba lich su khac nhau | [sh](35-pull-rebase/pull_rebase.sh) |
| 36 | [Nhanh upstream](36-tracking-branch/) | "ahead 2, behind 1" duoc dem so voi cai gi | [sh](36-tracking-branch/tracking_branch.sh) |
| 37 | [Push bi tu choi](37-push-bi-tu-choi/) | Git dang bao ve viec cua nguoi khac | [sh](37-push-bi-tu-choi/push_bi_tu_choi.sh) |
| 38 | [--force-with-lease](38-force-with-lease/) | Va vi sao `git fetch` lam no mat tac dung | [sh](38-force-with-lease/force_with_lease.sh) |
| 39 | [Fork: origin va upstream](39-fork-origin-upstream/) | Keo tu upstream, day len origin | [sh](39-fork-origin-upstream/fork_origin_upstream.sh) |
| 40 | [Quan ly remote](40-quan-ly-remote/) | Chi la mot cai ten gan voi URL trong `.git/config` | [sh](40-quan-ly-remote/quan_ly_remote.sh) |
| 41 | [Chien luoc nhanh](41-chien-luoc-nhanh/) | Trunk-based vs git-flow, do bang so buoc merge | [sh](41-chien-luoc-nhanh/chien_luoc_nhanh.sh) |
| 42 | [Don nhanh chet](42-don-nhanh-chet/) | Ba loai nhanh chet, ba lenh khac nhau | [sh](42-don-nhanh-chet/don_nhanh_chet.sh) |

## PR workflow (43-49)

| # | Bai | Hoc duoc gi | Code |
|---|---|---|---|
| 43 | [PR thuc ra la gi](43-pr-la-gi/) | `log` dung hai cham, `diff` dung ba cham | [sh](43-pr-la-gi/pr_la_gi.sh) |
| 44 | [PR nho](44-pr-nho/) | Do kich thuoc bang so, va cach tach PR xep chong | [sh](44-pr-nho/pr_nho.sh) |
| 45 | [Doc diff hieu qua](45-doc-diff-hieu-qua/) | `-w` tach thay doi that ra khoi nhieu | [sh](45-doc-diff-hieu-qua/doc_diff_hieu_qua.sh) |
| 46 | [fixup va autosquash](46-fixup-commit/) | Sua theo review ma lich su van sach | [sh](46-fixup-commit/fixup_commit.sh) |
| 47 | [Ba kieu merge PR](47-ba-kieu-merge-pr/) | Squash lam git khong coi nhanh do la da merge | [sh](47-ba-kieu-merge-pr/ba_kieu_merge_pr.sh) |
| 48 | [Truoc khi mo PR](48-truoc-khi-mo-pr/) | Cong tu kiem tra, bao het loi mot luot | [sh](48-truoc-khi-mo-pr/truoc_khi_mo_pr.sh) |
| 49 | [PR template & CODEOWNERS](49-pr-template-codeowners/) | Luat cuoi cung khop se thang | [sh](49-pr-template-codeowners/pr_template_codeowners.sh) |

## Rebase (50-55)

| # | Bai | Hoc duoc gi | Code |
|---|---|---|---|
| 50 | [Rebase co ban](50-rebase-co-ban/) | Phat lai chu khong phai di chuyen -- nen hash doi | [sh](50-rebase-co-ban/rebase_co_ban.sh) |
| 51 | [rebase -i](51-rebase-tuong-tac/) | Sua lich su bang mot file van ban | [sh](51-rebase-tuong-tac/rebase_tuong_tac.sh) |
| 52 | [Quy tac vang](52-quy-tac-vang-rebase/) | Do thiet hai that khi rebase lich su chung | [sh](52-quy-tac-vang-rebase/quy_tac_vang_rebase.sh) |
| 53 | [rebase --onto](53-rebase-onto/) | Noi ro ba thu thay vi de git doan | [sh](53-rebase-onto/rebase_onto.sh) |
| 54 | [cherry-pick](54-cherry-pick/) | Ap lai thay doi, khong phai sao chep commit | [sh](54-cherry-pick/cherry_pick.sh) |
| 55 | [Conflict khi rebase](55-conflict-khi-rebase/) | Dung lai nhieu lan, va ours/theirs dao nguoc | [sh](55-conflict-khi-rebase/conflict_khi_rebase.sh) |

## Chay het tang nay
```bash
cd ..
bash run_all.sh 02-student
```

## Bon config nen bat truoc khi hoc tang nay
```bash
git config --global merge.conflictStyle zdiff3   # bai 31: hien ban goc khi conflict
git config --global rerere.enabled true          # bai 32: giai mot lan, dung lai mai
git config --global fetch.prune true             # bai 34: tu don nhanh remote da chet
git config --global pull.rebase true             # bai 35: lich su thang khi pull
```
