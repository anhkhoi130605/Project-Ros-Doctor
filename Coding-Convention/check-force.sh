#!/usr/bin/env bash
# Guard against dangerous force-like Git commands.
# Example: bash Coding-Convention/check-force.sh git push --force origin main
# Rejected patterns include: -f, --force, --force-with-lease, --force-if-includes.

set -u

if [ "$#" -lt 1 ]; then
    echo "ERROR: Please pass the git command line to inspect, for example:"
    echo "  bash Coding-Convention/check-force.sh git push --force origin main"
    exit 1
fi

# Normalize into one string.
CMD="$*"

# Reject dangerous force-like flags anywhere in the command.
if [[ "$CMD" =~ (^|[[:space:]])-f([[:space:]]|$) ]] || \
   [[ "$CMD" =~ (^|[[:space:]])--force([[:space:]]|$) ]] || \
   [[ "$CMD" =~ (^|[[:space:]])--force-with-lease([[:space:]]|$) ]] || \
   [[ "$CMD" =~ (^|[[:space:]])--force-if-includes([[:space:]]|$) ]]; then
    echo "ERROR: Dangerous force-like command detected."
    echo "Do not use -f, --force, --force-with-lease, or --force-if-includes."
    echo "These commands can overwrite remote history or branch state."
    exit 1
fi

exit 0
