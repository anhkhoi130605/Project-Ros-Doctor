#!/usr/bin/env bash
# Block direct push to main using Git pre-push hook.
# Usage: bash Coding-Convention/check-push.sh <remote> <url>
# The hook reads the stdin lines sent by Git in the format:
#   <local-ref> <local-sha1> <remote-ref> <remote-sha1>

set -u

# Read each line from stdin.
while read -r local_ref local_sha remote_ref remote_sha; do
    # If the push is heading to refs/heads/main, reject it.
    if [[ "$remote_ref" == "refs/heads/main" ]]; then
        echo "ERROR: Direct push to main is forbidden."
        echo "Please push from a feature branch such as: 2-Feat-Update."
        echo "Use: git push origin <your-branch>"
        exit 1
    fi
done

# If no main ref is detected, allow the push to continue.
exit 0
