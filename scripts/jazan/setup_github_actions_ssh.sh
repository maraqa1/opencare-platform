#!/usr/bin/env bash
set -euo pipefail

KEY_PATH="${KEY_PATH:-/root/.ssh/jazan_github_actions_deploy}"
AUTHORIZED_KEYS="${AUTHORIZED_KEYS:-/root/.ssh/authorized_keys}"

mkdir -p "$(dirname "$KEY_PATH")"
chmod 700 "$(dirname "$KEY_PATH")"

if [[ ! -f "$KEY_PATH" ]]; then
  ssh-keygen -t ed25519 -f "$KEY_PATH" -N "" -C "github-actions-jazan-demo"
fi

touch "$AUTHORIZED_KEYS"
chmod 600 "$AUTHORIZED_KEYS"

public_key="$(cat "${KEY_PATH}.pub")"
if ! grep -qxF "$public_key" "$AUTHORIZED_KEYS"; then
  cat "${KEY_PATH}.pub" >> "$AUTHORIZED_KEYS"
fi

echo "GitHub Actions deploy SSH key is ready."
echo
echo "Add this repository secret in GitHub:"
echo
echo "  Name: JAZAN_VM_SSH_KEY"
echo "  Value:"
echo "-----BEGIN JAZAN_VM_SSH_KEY-----"
cat "$KEY_PATH"
echo "-----END JAZAN_VM_SSH_KEY-----"
echo
echo "Optional repository secrets:"
echo "  JAZAN_VM_HOST=78.47.100.139"
echo "  JAZAN_VM_USER=root"
echo "  JAZAN_VM_REPO_PATH=/root/opencare-platform"

