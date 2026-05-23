# Install Scaffold

This directory owns idempotent install, validation, and uninstall scripts for the platform.

Scripts here should print useful endpoints and verify service health with clear output.

## Fresh VM bootstrap

For a brand-new Ubuntu VM, run the host bootstrap first:

```bash
sudo bash install/setup_vm.sh
```

What it does:
- installs the base Ubuntu packages OpenCare expects
- installs a single-node K3s control plane
- installs Helm
- optionally installs `postgresql-client`, Node/NPM, and UFW based on environment flags

Useful environment flags:
- `INSTALL_NODE_TOOLCHAIN=true`
- `CONFIGURE_UFW=true`
- `K3S_CHANNEL=stable`
- `K3S_INSTALL_VERSION=<specific version>`
- `K3S_INSTALL_EXEC='server --write-kubeconfig-mode 644'`

After bootstrap:
1. clone the repo onto the VM
2. copy `.env.template` to `.env` and fill secrets/hosts
3. run one installer command, depending on your goal:

Platform only:
```bash
sudo bash install/install.sh --profile platform-only
```

Full platform + demo use cases + decision layer:
```bash
sudo bash install/install.sh --profile full-demo
```

Important:
- the admin `Include` / `Exclude` use-case toggles depend on the backend deployment running as `serviceAccountName=backend-config-writer`
- after pulling manifest changes that touch backend RBAC or toggle persistence, re-run `bash scripts/bootstrap/apply_base.sh` and refresh the backend deployment, not just the GHCR images

## Recommended install pattern

If you prefer explicit control, the repeatable phased pattern is still available:

```bash
bash install/install.sh --platform-only
bash scripts/demo/apply_demo_proof.sh
bash scripts/decisions/apply_decisions.sh
bash install/validation.sh
```

Useful install options:
- `--profile platform-only`
- `--profile full-demo`
- `--platform-only`
- `--with-demo`
- `--with-decision`
- `--from <phase>`
- `--to <phase>`
- `--skip-validation`

Validation now also checks that the backend deployment is using `backend-config-writer`, because use-case toggle persistence will silently fail if the backend pod falls back to the default service account.
