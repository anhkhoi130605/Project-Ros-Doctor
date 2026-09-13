#!/usr/bin/env bash
# Kiem tra 1 tag co dung dinh dang SemVer "vX.Y.Z" hoac "vX.Y.Z-suffix" khong.
set -euo pipefail

is_valid_semver_tag() {
  local tag="$1"
  [[ "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.]+)?$ ]]
}

selfcheck() {
  is_valid_semver_tag "v1.0.0" \
    || { echo "FAIL: v1.0.0 hop le bi tu choi"; exit 1; }
  is_valid_semver_tag "v2.0.0-beta.1" \
    || { echo "FAIL: v2.0.0-beta.1 hop le bi tu choi"; exit 1; }
  is_valid_semver_tag "v10.20.30" \
    || { echo "FAIL: so nhieu chu so bi tu choi"; exit 1; }
  is_valid_semver_tag "1.0.0" \
    && { echo "FAIL: thieu prefix v van duoc chap nhan"; exit 1; }
  is_valid_semver_tag "v1.0" \
    && { echo "FAIL: thieu PATCH van duoc chap nhan"; exit 1; }
  is_valid_semver_tag "v1.0.0-" \
    && { echo "FAIL: hau to rong van duoc chap nhan"; exit 1; }
  echo "OK"
}

if [ "$#" -eq 0 ]; then
  selfcheck
else
  if is_valid_semver_tag "$1"; then
    echo "Hop le: \"$1\""
  else
    echo "Khong hop le: \"$1\" -- can dang vMAJOR.MINOR.PATCH[-suffix]"
    exit 1
  fi
fi
