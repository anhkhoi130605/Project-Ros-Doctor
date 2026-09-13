#!/usr/bin/env bash
# Tach owner/repo va kieu giao thuc tu 1 remote URL (dang HTTPS hoac SSH kieu GitHub/GitLab).
set -euo pipefail

parse_remote_url() {
  # Cat hai cai duoi ra truoc thay vi nhoi vao regex: dau / cuoi (hay bi dinh khi
  # copy tu thanh dia chi trinh duyet) va duoi .git.
  local url="${1%/}"
  url="${url%.git}"

  # owner phai la (.+) chu khong phai [^/]+ moi om duoc subgroup nhieu tang cua
  # GitLab: group/subgroup/project.
  # repo phai la [^/]+ chu khong phai [^/.]+ vi ten repo duoc phep co dau cham --
  # dung nhat la repo GitHub Pages: octocat.github.io.
  if [[ "$url" =~ ^https://[^/]+/(.+)/([^/]+)$ ]]; then
    echo "https ${BASH_REMATCH[1]}/${BASH_REMATCH[2]}"
  elif [[ "$url" =~ ^git@[^:]+:(.+)/([^/]+)$ ]]; then
    echo "ssh ${BASH_REMATCH[1]}/${BASH_REMATCH[2]}"
  else
    return 1
  fi
}

selfcheck() {
  local result

  result="$(parse_remote_url 'https://github.com/octocat/hello-world.git')"
  [ "$result" = "https octocat/hello-world" ] || { echo "FAIL: https sai ($result)"; exit 1; }

  result="$(parse_remote_url 'git@github.com:octocat/hello-world.git')"
  [ "$result" = "ssh octocat/hello-world" ] || { echo "FAIL: ssh sai ($result)"; exit 1; }

  result="$(parse_remote_url 'https://gitlab.com/team/project')"
  [ "$result" = "https team/project" ] || { echo "FAIL: https khong duoi .git sai ($result)"; exit 1; }

  # Ba case duoi day truoc kia deu bi tra ve "khong nhan dang duoc".
  result="$(parse_remote_url 'https://github.com/octocat/octocat.github.io')"
  [ "$result" = "https octocat/octocat.github.io" ] \
    || { echo "FAIL: ten repo co dau cham ($result)"; exit 1; }

  result="$(parse_remote_url 'git@gitlab.com:group/subgroup/project.git')"
  [ "$result" = "ssh group/subgroup/project" ] \
    || { echo "FAIL: subgroup nhieu tang cua GitLab ($result)"; exit 1; }

  result="$(parse_remote_url 'https://github.com/octocat/hello-world/')"
  [ "$result" = "https octocat/hello-world" ] \
    || { echo "FAIL: URL con dau / o cuoi ($result)"; exit 1; }

  parse_remote_url 'khong-phai-url' >/dev/null 2>&1 \
    && { echo "FAIL: chuoi rac van duoc chap nhan"; exit 1; }

  echo "OK"
}

if [ "$#" -eq 0 ]; then
  selfcheck
else
  if result="$(parse_remote_url "$1")"; then
    echo "$result"
  else
    echo "Khong nhan dang duoc URL: \"$1\""
    exit 1
  fi
fi
