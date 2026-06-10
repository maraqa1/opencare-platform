#!/usr/bin/env bash
set -euo pipefail

BRANCH="${BRANCH:-codex/jazan-demo}"
REMOTE="${REMOTE:-origin}"
MESSAGE="${1:-}"

current_branch="$(git branch --show-current)"
if [[ "$current_branch" != "$BRANCH" ]]; then
  echo "ERROR: refusing to push from branch '$current_branch'. Expected '$BRANCH'." >&2
  echo "Set BRANCH=<branch> only if you intentionally want a different branch." >&2
  exit 1
fi

if [[ -n "$MESSAGE" ]]; then
  if git diff --cached --quiet; then
    echo "ERROR: commit message was provided but no files are staged." >&2
    echo "Stage the exact files you want first, then rerun:" >&2
    echo "  bash scripts/jazan/push_branch.sh \"$MESSAGE\"" >&2
    exit 1
  fi
  git commit -m "$MESSAGE"
fi

git push "$REMOTE" "$BRANCH"
git log -1 --oneline

