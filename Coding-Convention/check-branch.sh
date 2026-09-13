#!/usr/bin/env bash
set -u

# Kiểm tra branch mới theo định dạng: <so>-<Type>/<ten-branch>
# Ví dụ: 3-Feat/login-api
#
# Quy tắc:
#   1. Số đầu tiên phải không trùng với branch remote hiện có.
#   2. Số đầu tiên phải là số kế tiếp lớn hơn nhất trong remote khi pull xuống.
#   3. Type phải thuộc danh sách cho phép và chữ cái đầu tiên viết hoa:
#      Feat | Fix | Hotfix | Docs | Style | Refactor | Perf | Test |
#      Build | Ci | Chore | Revert
#
# Hỗ trợ cả chế độ tạo branch và chế độ đổi tên branch qua git branch -m:
#   bash check-branch.sh <new-branch>
#   bash check-branch.sh <old-branch> <new-branch>

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "ERROR: check-branch.sh must be run inside a Git repository."
    exit 1
fi

REMOTE="origin"

# Fetch remote để cập nhật refs/remotes/origin
if ! git fetch "$REMOTE" --prune >/dev/null 2>&1; then
    echo "ERROR: Không thể fetch remote $REMOTE. Hãy kiểm tra kết nối Git hoặc remote."
    exit 1
fi

# Khởi tạo high number bằng 0; number lớn nhất trên remote branch
MAX_REMOTE_NUM=0
MATCHED_BRANCHES=()

# Lấy các nhánh remote theo kiểu <number>-<Type>/<description>
while IFS= read -r ref; do
    branch="${ref#refs/remotes/$REMOTE/}"
    if [[ "$branch" =~ ^([0-9]+)-(Feat|Fix|Hotfix|Docs|Style|Refactor|Perf|Test|Build|Ci|Chore|Revert)(/[-A-Za-z0-9._/]+)?$ ]]; then
        num="${BASH_REMATCH[1]}"
        if (( num > MAX_REMOTE_NUM )); then
            MAX_REMOTE_NUM="$num"
        fi
        MATCHED_BRANCHES+=("$branch")
    fi
done < <(git for-each-ref --format='%(refname)' "refs/remotes/$REMOTE" 2>/dev/null || true)

NEXT_NUM=$((MAX_REMOTE_NUM + 1))

# Chỉ chấp nhận dạng chính xác: <số>-<Type>/<slug>
validate_name() {
    local branch_name="$1"
    if [[ ! "$branch_name" =~ ^([0-9]+)-(Feat|Fix|Hotfix|Docs|Style|Refactor|Perf|Test|Build|Ci|Chore|Revert)(/[-A-Za-z0-9._/]+)?$ ]]; then
        echo "ERROR: invalid branch name format. Expected: <number>-<Type>/<description>."
        echo "Example: 3-Feat/login-api"
        echo "Allowed types: Feat | Fix | Hotfix | Docs | Style | Refactor | Perf | Test | Build | Ci | Chore | Revert"
        return 1
    fi

    local num="${BASH_REMATCH[1]}"
    local type="${BASH_REMATCH[2]}"

    # Kiểm tra số đầu tiên không được trùng và phải = +1 max remote
    if (( num != NEXT_NUM )); then
        echo "ERROR: invalid branch number. Expected next number is $NEXT_NUM, but received $num."
        echo "The branch number must be +1 of the highest remote branch number after fetch."
        return 1
    fi

    # Kiểm tra branch local đã có chưa nếu đang kiểm tra branch mới
    if git show-ref --verify --quiet "refs/heads/$branch_name"; then
        echo "ERROR: local branch '$branch_name' already exists."
        return 1
    fi

    # Nếu branch remote đã có số trùng, báo lỗi chặn
    for branch in "${MATCHED_BRANCHES[@]}"; do
        remote_num="${branch%%-*}"
        if [[ "$remote_num" == "$num" ]]; then
            echo "ERROR: duplicate branch number $num already exists on remote: $REMOTE/$branch"
            return 1
        fi
    done

    return 0
}

if [ "$#" -eq 1 ]; then
    BRANCH_NAME="$1"
    if ! validate_name "$BRANCH_NAME"; then
        exit 1
    fi
    echo "SUCCESS: branch '$BRANCH_NAME' passes check-branch policy."
    exit 0
fi

if [ "$#" -eq 2 ]; then
    OLD_BRANCH="$1"
    NEW_BRANCH="$2"
    if ! validate_name "$NEW_BRANCH"; then
        exit 1
    fi

    # Đổi tên nhánh theo git branch -m nếu định dạng mới hợp lệ
    git branch -m "$OLD_BRANCH" "$NEW_BRANCH" >/dev/null 2>&1 || {
        echo "ERROR: failed to rename branch '$OLD_BRANCH' to '$NEW_BRANCH' with git branch -m."
        exit 1
    }

    echo "SUCCESS: branch '$OLD_BRANCH' was renamed to '$NEW_BRANCH' and passed check-branch policy."
    exit 0
fi

echo "ERROR: usage: bash check-branch.sh <new-branch> OR bash check-branch.sh <old-branch> <new-branch>"
exit 1
