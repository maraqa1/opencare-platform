#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PASS=0
FAIL=0

run_check() {
  local name="$1"
  shift
  printf '%-40s' "$name ... "
  if "$@" >/dev/null 2>&1; then
    echo "PASS"
    PASS=$((PASS + 1))
  else
    echo "FAIL"
    "$@" 2>&1 || true
    FAIL=$((FAIL + 1))
  fi
}

# --- shellcheck ---
if command -v shellcheck >/dev/null 2>&1; then
  mapfile -t sh_files < <(find install scripts -type f -name '*.sh' | sort)
  run_check "shellcheck (${#sh_files[@]} files)" shellcheck "${sh_files[@]}"
else
  echo "shellcheck not found — skipping (install: https://www.shellcheck.net)"
fi

# --- yamllint ---
if command -v yamllint >/dev/null 2>&1; then
  mapfile -t yaml_files < <(find manifests .github/workflows -type f \( -name '*.yml' -o -name '*.yaml' \) | sort)
  run_check "yamllint (${#yaml_files[@]} files)" \
    yamllint -d "{extends: default, rules: {line-length: {max: 160}, truthy: disable, comments: disable}}" "${yaml_files[@]}"
else
  echo "yamllint not found — skipping (pip install yamllint)"
fi

# --- CRLF check ---
printf '%-40s' "CRLF check (shell scripts) ... "
bad=$(find install scripts -name '*.sh' -print0 | xargs -0 grep -rlP '\r' 2>/dev/null || true)
if [[ -z "$bad" ]]; then
  echo "PASS"
  PASS=$((PASS + 1))
else
  echo "FAIL — files with CRLF:"
  echo "$bad"
  FAIL=$((FAIL + 1))
fi

echo ""
echo "Results: $PASS passed, $FAIL failed"
[[ $FAIL -eq 0 ]]
