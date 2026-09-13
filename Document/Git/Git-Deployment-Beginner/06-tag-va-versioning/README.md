# Tag & Versioning (SemVer)

## 1. De bai
Team ban danh dau moi ban release bang `git tag` theo chuan **Semantic Versioning**
(`vMAJOR.MINOR.PATCH`, co the kem hau to pre-release). Viet ham kiem tra mot tag co
dung dinh dang nay khong, truoc khi cho phep `git push --tags`.

- **Input:** mot chuoi tag, vi du `v1.4.2` hoac `v2.0.0-beta.1`.
- **Output:** hop le hay khong, in ro ly do khi sai.

## 2. Y tuong -- Checklist
1. `git tag v1.0.0` -- tao lightweight tag tai commit hien tai.
2. `git tag -a v1.0.0 -m "Release 1.0.0"` -- tao **annotated tag** (co tac gia, ngay,
   message) -- nen dung cho release that thay vi lightweight tag.
3. `git push origin v1.0.0` hoac `git push --tags` -- tag khong tu dong push theo
   commit, phai day rieng.
4. Dinh dang SemVer: `v<MAJOR>.<MINOR>.<PATCH>` bat buoc du 3 so, co the them
   `-<pre-release>` (vd `-beta.1`, `-rc.2`).
5. `git tag -l "v1.*"` -- liet ke tag theo pattern khi can tim nhanh.

## 3. Diem nhan thuc te
- MAJOR tang khi co breaking change, MINOR khi them tinh nang tuong thich nguoc,
  PATCH khi chi sua loi -- quy uoc nay giup nguoi dung thu vien biet update co an
  toan khong ma khong can doc changelog.
- Thieu tag ro rang khien viec rollback ve "ban chay on gan nhat" phai mo lai qua
  `git log`, rat mat thoi gian khi production dang loi.
- Annotated tag luu duoc ai tao va khi nao -- huu ich khi can truy vet release, con
  lightweight tag chi la mot con tro tran toi commit.

## 4. Loi giai
[`check_semver_tag.sh`](check_semver_tag.sh): ham `is_valid_semver_tag` dung regex
kiem tra tag co dung dang `vX.Y.Z` hoac `vX.Y.Z-suffix` hay khong.

## 5. Self-check
```bash
bash check_semver_tag.sh
```
Thu voi tag that cua ban:
```bash
bash check_semver_tag.sh "v1.4.2"
bash check_semver_tag.sh "v2.0.0-beta.1"
bash check_semver_tag.sh "1.0"
```
