#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

if [[ "$ENABLE_EXTERNAL_INGRESS" != "true" ]]; then
  log_skip "External ingress disabled; skipping cert-manager"
  exit 0
fi

if [[ -z "$EXTERNAL_TLS_SECRET_NAME" ]]; then
  log_skip "EXTERNAL_TLS_SECRET_NAME is empty; skipping cert-manager"
  exit 0
fi

if [[ -z "$CERT_MANAGER_CLUSTER_ISSUER" ]]; then
  fail "CERT_MANAGER_CLUSTER_ISSUER must be set when EXTERNAL_TLS_SECRET_NAME is set"
fi

if [[ -z "$TLS_EMAIL" ]]; then
  fail "TLS_EMAIL must be set for Let's Encrypt issuer registration"
fi

ensure_helm

log "Installing cert-manager via Helm"
if ! helm repo list | awk '{print $1}' | grep -qx "$CERT_MANAGER_CHART_REPO_NAME"; then
  helm repo add "$CERT_MANAGER_CHART_REPO_NAME" "$CERT_MANAGER_CHART_REPO_URL" >/dev/null
fi
helm repo update "$CERT_MANAGER_CHART_REPO_NAME" >/dev/null

helm upgrade --install "$CERT_MANAGER_RELEASE_NAME" "$CERT_MANAGER_CHART_NAME" \
  --namespace "$CERT_MANAGER_NAMESPACE" \
  --create-namespace \
  --version "$CERT_MANAGER_CHART_VERSION" \
  --set crds.enabled=true \
  --wait \
  --timeout "${TIMEOUT_SECONDS}s"

kubectl rollout status "deployment/${CERT_MANAGER_RELEASE_NAME}" -n "$CERT_MANAGER_NAMESPACE" --timeout="${TIMEOUT_SECONDS}s"
kubectl rollout status "deployment/${CERT_MANAGER_RELEASE_NAME}-webhook" -n "$CERT_MANAGER_NAMESPACE" --timeout="${TIMEOUT_SECONDS}s"
kubectl rollout status "deployment/${CERT_MANAGER_RELEASE_NAME}-cainjector" -n "$CERT_MANAGER_NAMESPACE" --timeout="${TIMEOUT_SECONDS}s"

log "Applying cert-manager ClusterIssuer: ${CERT_MANAGER_CLUSTER_ISSUER}"
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: ${CERT_MANAGER_CLUSTER_ISSUER}
spec:
  acme:
    email: ${TLS_EMAIL}
    server: https://acme-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: ${CERT_MANAGER_CLUSTER_ISSUER}-account-key
    solvers:
      - http01:
          ingress:
            class: ${INGRESS_CLASS_NAME}
EOF

log_success "cert-manager and ClusterIssuer are ready"
