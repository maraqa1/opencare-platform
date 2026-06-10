# Jazan Demo Helpers

Utilities for the `codex/jazan-demo` branch.

## Push the branch

Stage the exact files you want, then commit and push:

```bash
bash scripts/jazan/push_branch.sh "Commit message"
```

Push without creating a commit:

```bash
bash scripts/jazan/push_branch.sh
```

The script refuses to run unless the current branch is `codex/jazan-demo`.

## Build and deploy the portal on the VM

Run from the repo root on the VM:

```bash
bash scripts/jazan/deploy_portal_vm.sh
```

The script:

1. Pulls `origin/codex/jazan-demo`.
2. Builds `apps/portal` with Docker.
3. Imports the image into K3s.
4. Updates and restarts the `portal` deployment in namespace `opencare`.
5. Waits for rollout completion.

Optional overrides:

```bash
BRANCH=codex/jazan-demo NAMESPACE=opencare DEPLOYMENT=portal CONTAINER=portal bash scripts/jazan/deploy_portal_vm.sh
```

## Automatic deploy after push

The GitHub Actions workflow `.github/workflows/jazan-demo-deploy.yml` deploys the portal after pushes to `codex/jazan-demo` when portal/config/Jazan helper files change.

Required repository secret:

- `JAZAN_VM_SSH_KEY`: private SSH key that can log in to the VM.

Create a dedicated VM key and print the secret value:

```bash
cd /root/opencare-platform
bash scripts/jazan/setup_github_actions_ssh.sh
```

Copy the block between `-----BEGIN JAZAN_VM_SSH_KEY-----` and `-----END JAZAN_VM_SSH_KEY-----` into the GitHub repository secret value. Do not include those marker lines.

Optional repository secrets:

- `JAZAN_VM_HOST`: defaults to `78.47.100.139`.
- `JAZAN_VM_USER`: defaults to `root`.
- `JAZAN_VM_REPO_PATH`: defaults to `/root/opencare-platform`.

Manual deployment is also available from GitHub Actions:

1. Open **Actions**.
2. Select **Deploy Jazan Demo Portal**.
3. Click **Run workflow** on branch `codex/jazan-demo`.
