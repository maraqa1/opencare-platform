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
3. run `sudo bash install/install.sh`
