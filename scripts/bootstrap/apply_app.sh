#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

render_app_ingress() {
  local output_file="$1"

  cat >"$output_file" <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: opencare-app
  namespace: ${NAMESPACE}
  annotations:
    kubernetes.io/ingress.class: ${INGRESS_CLASS_NAME}
    traefik.ingress.kubernetes.io/router.entrypoints: ${TRAEFIK_ENTRYPOINTS}
EOF

  if [[ -n "$CERT_MANAGER_CLUSTER_ISSUER" && -n "$EXTERNAL_TLS_SECRET_NAME" ]]; then
    cat >>"$output_file" <<EOF
    cert-manager.io/cluster-issuer: ${CERT_MANAGER_CLUSTER_ISSUER}
EOF
  fi

  cat >>"$output_file" <<EOF
spec:
  ingressClassName: ${INGRESS_CLASS_NAME}
EOF

  if [[ -n "$EXTERNAL_TLS_SECRET_NAME" ]]; then
    cat >>"$output_file" <<EOF
  tls:
    - secretName: ${EXTERNAL_TLS_SECRET_NAME}
      hosts:
EOF
    if [[ -n "$PORTAL_HOST" ]]; then
      cat >>"$output_file" <<EOF
        - ${PORTAL_HOST}
EOF
    fi
    if [[ -n "$API_HOST" && "$API_HOST" != "$PORTAL_HOST" ]]; then
      cat >>"$output_file" <<EOF
        - ${API_HOST}
EOF
    fi
    if [[ -n "$ANALYTICS_HOST" && "$ANALYTICS_HOST" != "$PORTAL_HOST" && "$ANALYTICS_HOST" != "$API_HOST" ]]; then
      cat >>"$output_file" <<EOF
        - ${ANALYTICS_HOST}
EOF
    fi
    if [[ -n "$AUTH_HOST" && "$AUTH_HOST" != "$PORTAL_HOST" && "$AUTH_HOST" != "$API_HOST" && "$AUTH_HOST" != "$ANALYTICS_HOST" ]]; then
      cat >>"$output_file" <<EOF
        - ${AUTH_HOST}
EOF
    fi
    if [[ -z "$PORTAL_HOST" && -z "$API_HOST" && -n "$EXTERNAL_HOST" ]]; then
      cat >>"$output_file" <<EOF
        - ${EXTERNAL_HOST}
EOF
    fi
  fi

  cat >>"$output_file" <<EOF
  rules:
EOF

  if [[ -n "$PORTAL_HOST" ]]; then
    cat >>"$output_file" <<EOF
    - host: ${PORTAL_HOST}
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: portal
                port:
                  number: 3000
EOF
  fi

  if [[ -n "$API_HOST" ]]; then
    cat >>"$output_file" <<EOF
    - host: ${API_HOST}
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: backend
                port:
                  number: 8000
EOF
  elif [[ -n "$EXTERNAL_HOST" ]]; then
    cat >>"$output_file" <<EOF
    - host: ${EXTERNAL_HOST}
      http:
        paths:
          - path: /docs
            pathType: Prefix
            backend:
              service:
                name: backend
                port:
                  number: 8000
          - path: /openapi.json
            pathType: Exact
            backend:
              service:
                name: backend
                port:
                  number: 8000
          - path: /healthz
            pathType: Exact
            backend:
              service:
                name: backend
                port:
                  number: 8000
          - path: /readyz
            pathType: Exact
            backend:
              service:
                name: backend
                port:
                  number: 8000
          - path: /
            pathType: Prefix
            backend:
              service:
                name: portal
                port:
                  number: 3000
EOF
  else
    cat >>"$output_file" <<EOF
    - http:
        paths:
          - path: /docs
            pathType: Prefix
            backend:
              service:
                name: backend
                port:
                  number: 8000
          - path: /openapi.json
            pathType: Exact
            backend:
              service:
                name: backend
                port:
                  number: 8000
          - path: /healthz
            pathType: Exact
            backend:
              service:
                name: backend
                port:
                  number: 8000
          - path: /readyz
            pathType: Exact
            backend:
              service:
                name: backend
                port:
                  number: 8000
          - path: /
            pathType: Prefix
            backend:
              service:
                name: portal
                port:
                  number: 3000
EOF
  fi

  if [[ -n "$ANALYTICS_HOST" ]]; then
    cat >>"$output_file" <<EOF
    - host: ${ANALYTICS_HOST}
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: superset
                port:
                  number: 8088
EOF
  fi

  if [[ -n "$AUTH_HOST" ]]; then
    cat >>"$output_file" <<EOF
    - host: ${AUTH_HOST}
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: keycloak
                port:
                  number: 8080
EOF
  fi
}

apply_file "$ROOT_DIR/manifests/backend/deployment.yaml"
apply_file "$ROOT_DIR/manifests/portal/deployment.yaml"

log "Restarting application deployments to pull current images"
kubectl -n "$NAMESPACE" rollout restart deployment/backend deployment/portal >/dev/null

if [[ "$ENABLE_EXTERNAL_INGRESS" == "true" ]]; then
  rendered_ingress="$(mktemp)"
  render_app_ingress "$rendered_ingress"
  kubectl apply -f "$rendered_ingress"
  rm -f "$rendered_ingress"

  if [[ -n "$EXTERNAL_TLS_SECRET_NAME" ]]; then
    log "Waiting for TLS secret/${EXTERNAL_TLS_SECRET_NAME}"
    deadline=$((SECONDS + TIMEOUT_SECONDS))
    while ! kubectl -n "$NAMESPACE" get secret "$EXTERNAL_TLS_SECRET_NAME" >/dev/null 2>&1; do
      if (( SECONDS >= deadline )); then
        kubectl -n "$NAMESPACE" get certificate,certificaterequest,order,challenge 2>/dev/null || true
        kubectl -n "$NAMESPACE" describe ingress opencare-app || true
        fail "Timed out waiting for TLS secret: ${EXTERNAL_TLS_SECRET_NAME}"
      fi
      sleep 5
    done
  fi
else
  log_skip "External ingress disabled via ENABLE_EXTERNAL_INGRESS=${ENABLE_EXTERNAL_INGRESS}"
fi

wait_for_deployment backend
wait_for_deployment portal
log_skip "No additional app bootstrap action implemented"
log_success "Application services ready"
