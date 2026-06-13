# Install Scaffold

This directory owns idempotent install, validation, and uninstall scripts for the platform.

Scripts here should print useful endpoints and verify service health with clear output.

## Fresh VM bootstrap

For the Jazan deployment target, point these DNS `A` records to `78.47.100.139` before running the installer:

```text
dmo.opendatalake.com
api.dmo.opendatalake.com
auth.dmo.opendatalake.com
analytics.dmo.opendatalake.com
```

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
3. confirm `TLS_EMAIL` is populated for Let's Encrypt certificate registration
4. run one installer command, depending on your goal:

Foundation install (default, no bundled demo use cases):
```bash
sudo bash install/install.sh
```

Full platform + demo use cases + decision layer:
```bash
sudo bash install/install.sh --profile full-demo
```

Important:
- the admin `Include` / `Exclude` use-case toggles depend on the backend deployment running as `serviceAccountName=backend-config-writer`
- after pulling manifest changes that touch backend RBAC or toggle persistence, re-run `bash scripts/bootstrap/apply_base.sh` and refresh the backend deployment, not just the GHCR images
- the `Administration -> Use Case Templates` feature depends on the backend PVC `backend-use-case-packages` plus the backend admin API route `/api/v1/admin/use-case-templates`
- fresh installs now validate both the package-storage PVC and the admin template API so a green install means the importer surface is present, not just the base portal shell

## Multi-node posture

OpenCare can use an additional K3s node today, but the current manifests should be treated as **capacity-ready, not HA-ready**.

Safe current model:
- keep the original K3s server node as the anchor for stateful workloads
- add extra K3s worker nodes for stateless scheduling capacity
- let Kubernetes spread stateless pods such as `backend`, `portal`, `keycloak`, `superset`, and runtime deployments across nodes when available

Current limitations:
- `postgres`, `minio`, and `mysql-demo` use `ReadWriteOnce` PVCs and should still be treated as node-local in the default K3s storage setup
- the repo does not yet automate HA control-plane setup
- most workloads still run with `replicas: 1`, so an extra node improves headroom more than availability

To join an extra worker node manually:

On the existing server node:
```bash
sudo cat /var/lib/rancher/k3s/server/node-token
```

On the new worker node:
```bash
curl -sfL https://get.k3s.io | K3S_URL=https://<server-ip>:6443 K3S_TOKEN=<node-token> sh -
```

Then verify from the server:
```bash
kubectl get nodes -o wide
```

The manifests now include soft anti-affinity and topology spread hints for the main stateless services, so once a second node joins, Kubernetes has a better baseline for distributing those pods without breaking single-node installs.

## Recommended install pattern

If you prefer explicit control, the repeatable phased pattern is still available:

```bash
bash install/install.sh --platform-only
bash scripts/demo/apply_demo_proof.sh      # optional demo data/use cases
bash scripts/decisions/apply_decisions.sh  # optional decision layer
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

Resume examples:
```bash
sudo bash install/install.sh --from tls
sudo bash install/install.sh --from app
```

Validation now also checks that the backend deployment is using `backend-config-writer`, because use-case toggle persistence will silently fail if the backend pod falls back to the default service account.
Validation also checks the `backend-use-case-packages` PVC, the backend `Use Case Templates` admin API, and the portal `/admin/use-case-templates` route so new VM installs explicitly prove the package importer surface is live.
