#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# shellcheck source=install/helpers.sh
source "$SCRIPT_DIR/helpers.sh"

K3S_CHANNEL="${K3S_CHANNEL:-stable}"
K3S_INSTALL_VERSION="${K3S_INSTALL_VERSION:-}"
K3S_WRITE_KUBECONFIG_MODE="${K3S_WRITE_KUBECONFIG_MODE:-644}"
K3S_INSTALL_EXEC="${K3S_INSTALL_EXEC:-server --write-kubeconfig-mode ${K3S_WRITE_KUBECONFIG_MODE}}"
INSTALL_K3S="${INSTALL_K3S:-true}"
INSTALL_HELM_BIN="${INSTALL_HELM_BIN:-true}"
INSTALL_POSTGRES_CLIENT="${INSTALL_POSTGRES_CLIENT:-true}"
INSTALL_NODE_TOOLCHAIN="${INSTALL_NODE_TOOLCHAIN:-false}"
CONFIGURE_UFW="${CONFIGURE_UFW:-false}"

APT_PACKAGES=(
  bash
  ca-certificates
  curl
  git
  gnupg
  jq
  lsb-release
  tar
  unzip
)

if [[ "$INSTALL_POSTGRES_CLIENT" == "true" ]]; then
  APT_PACKAGES+=(postgresql-client)
fi

if [[ "$INSTALL_NODE_TOOLCHAIN" == "true" ]]; then
  APT_PACKAGES+=(nodejs npm)
fi

require_root() {
  if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
    fail "Run this script as root (for example: sudo bash install/setup_vm.sh)"
  fi
}

install_apt_packages() {
  export DEBIAN_FRONTEND=noninteractive
  log "Installing base Ubuntu packages"
  apt-get update
  apt-get install -y "${APT_PACKAGES[@]}"
}

install_k3s_cluster() {
  if [[ "$INSTALL_K3S" != "true" ]]; then
    log_skip "INSTALL_K3S=false; skipping K3s installation"
    return 0
  fi

  if command -v k3s >/dev/null 2>&1; then
    log_skip "K3s already installed"
  else
    log "Installing K3s (${K3S_CHANNEL})"
    if [[ -n "$K3S_INSTALL_VERSION" ]]; then
      curl -sfL https://get.k3s.io | INSTALL_K3S_CHANNEL="$K3S_CHANNEL" INSTALL_K3S_VERSION="$K3S_INSTALL_VERSION" INSTALL_K3S_EXEC="$K3S_INSTALL_EXEC" sh -
    else
      curl -sfL https://get.k3s.io | INSTALL_K3S_CHANNEL="$K3S_CHANNEL" INSTALL_K3S_EXEC="$K3S_INSTALL_EXEC" sh -
    fi
  fi

  export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

  require_cmd kubectl
  log "Waiting for the K3s control plane"
  for _ in {1..90}; do
    if kubectl get nodes >/dev/null 2>&1; then
      break
    fi
    sleep 2
  done

  kubectl wait --for=condition=Ready node --all --timeout=180s
  log_success "K3s is ready"
}

install_helm_bin() {
  if [[ "$INSTALL_HELM_BIN" != "true" ]]; then
    log_skip "INSTALL_HELM_BIN=false; skipping Helm installation"
    return 0
  fi

  ensure_helm
}

configure_firewall() {
  if [[ "$CONFIGURE_UFW" != "true" ]]; then
    log_skip "CONFIGURE_UFW=false; leaving firewall unchanged"
    return 0
  fi

  if ! command -v ufw >/dev/null 2>&1; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get install -y ufw
  fi

  log "Configuring UFW for SSH and public ingress"
  ufw allow 22/tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable
}

print_next_steps() {
  cat <<EOF

OpenCare VM bootstrap complete.

Next steps:
  1. Clone the repo onto the VM, for example:
       git clone <repo-url> /home/opencare-platform
  2. Copy .env.template to .env and set real secrets and hostnames.
  3. Export KUBECONFIG for the current shell if needed:
       export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
  4. Run the platform install:
       sudo bash /home/opencare-platform/install/install.sh

Multi-node note:
  - This bootstrap installs a single-node K3s server.
  - You can add extra K3s worker nodes later for stateless workload capacity.
  - This script does not automate worker joins or HA control-plane setup.

Useful checks:
  kubectl get nodes -o wide
  kubectl get pods -A
  helm version
EOF
}

main() {
  require_root
  install_apt_packages
  install_k3s_cluster
  install_helm_bin
  configure_firewall
  print_next_steps
}

main "$@"
