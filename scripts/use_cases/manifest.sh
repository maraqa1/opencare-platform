#!/usr/bin/env bash

USE_CASES_MANIFEST_FILE="${USE_CASES_MANIFEST_FILE:-$ROOT_DIR/config/use_cases.yaml}"

manifest_require_file() {
  [[ -f "$USE_CASES_MANIFEST_FILE" ]] || fail "Use-case manifest not found: $USE_CASES_MANIFEST_FILE"
}

manifest_use_case_exists() {
  local target="$1"

  manifest_require_file
  awk -v target="$target" '
    /^use_cases:/ { in_use_cases=1; next }
    in_use_cases && /^[^ ]/ { in_use_cases=0 }
    in_use_cases && /^  [A-Za-z0-9_]+:/ {
      current=$1
      sub(":", "", current)
      if (current == target) {
        found=1
        next
      }
    }
    END { exit(found ? 0 : 1) }
  ' "$USE_CASES_MANIFEST_FILE"
}

manifest_use_case_enabled() {
  local target="$1"

  manifest_require_file
  awk -v target="$target" '
    /^use_cases:/ { in_use_cases=1; next }
    in_use_cases && /^[^ ]/ { in_use_cases=0 }
    in_use_cases && /^  [A-Za-z0-9_]+:/ {
      current=$1
      sub(":", "", current)
    }
    in_use_cases && current == target && /^    enabled:/ {
      value=$2
      gsub(/"/, "", value)
      if (value == "true") {
        found=1
        enabled=1
        next
      }
      found=1
      enabled=0
      next
    }
    END {
      if (!found) {
        exit 1
      }
      exit(enabled ? 0 : 1)
    }
  ' "$USE_CASES_MANIFEST_FILE"
}

manifest_use_case_name() {
  local target="$1"

  manifest_require_file
  awk -v target="$target" '
    /^use_cases:/ { in_use_cases=1; next }
    in_use_cases && /^[^ ]/ { in_use_cases=0 }
    in_use_cases && /^  [A-Za-z0-9_]+:/ {
      current=$1
      sub(":", "", current)
    }
    in_use_cases && current == target && /^    name:/ {
      line=$0
      sub(/^    name: /, "", line)
      gsub(/^"/, "", line)
      gsub(/"$/, "", line)
      print line
      exit
    }
  ' "$USE_CASES_MANIFEST_FILE"
}

manifest_enabled_use_cases() {
  manifest_require_file
  awk '
    /^use_cases:/ { in_use_cases=1; next }
    in_use_cases && /^[^ ]/ { in_use_cases=0 }
    in_use_cases && /^  [A-Za-z0-9_]+:/ {
      current=$1
      sub(":", "", current)
      next
    }
    in_use_cases && /^    enabled:/ {
      value=$2
      gsub(/"/, "", value)
      if (value == "true" && current != "") {
        print current
      }
    }
  ' "$USE_CASES_MANIFEST_FILE"
}

manifest_assert_enabled_use_case() {
  local target="$1"

  manifest_use_case_exists "$target" || fail "Unknown use case in manifest: ${target}"
  manifest_use_case_enabled "$target" || fail "Use case is disabled in manifest: ${target}"
}
