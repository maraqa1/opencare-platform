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

