#!/usr/bin/env bash
set -euo pipefail

BRANCH="${BRANCH:-codex/jazan-demo}"
REMOTE="${REMOTE:-origin}"
NAMESPACE="${NAMESPACE:-opencare}"
DEPLOYMENT="${DEPLOYMENT:-portal}"
CONTAINER="${CONTAINER:-portal}"
IMAGE_PREFIX="${IMAGE_PREFIX:-opencare-portal:jazan}"
KUBECONFIG_PATH="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"
DEPLOY_STEP_TIMEOUT_SECONDS="${DEPLOY_STEP_TIMEOUT_SECONDS:-1200}"
PUBLIC_PORTAL_HOST="${PUBLIC_PORTAL_HOST:-dmo.opendatalake.com}"
PUBLIC_PORTAL_URL="${PUBLIC_PORTAL_URL:-https://${PUBLIC_PORTAL_HOST}}"
KUBECTL=(sudo env KUBECONFIG="$KUBECONFIG_PATH" kubectl -n "$NAMESPACE")

dump_portal_state() {
  echo "Portal deployment diagnostics:"
  sudo env KUBECONFIG="$KUBECONFIG_PATH" kubectl get nodes -o wide || true
  sudo env KUBECONFIG="$KUBECONFIG_PATH" kubectl describe nodes || true
  "${KUBECTL[@]}" get deployment "$DEPLOYMENT" -o wide || true
  "${KUBECTL[@]}" get rs -l "app=$DEPLOYMENT" -o wide || true
  "${KUBECTL[@]}" get pods -l "app=$DEPLOYMENT" -o wide || true
  "${KUBECTL[@]}" describe pods -l "app=$DEPLOYMENT" || true
  "${KUBECTL[@]}" describe "deployment/$DEPLOYMENT" || true
  "${KUBECTL[@]}" logs -l "app=$DEPLOYMENT" --tail=120 --all-containers=true || true
}

if ! command -v git >/dev/null 2>&1; then
  echo "ERROR: git is required." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker is required to build the portal image." >&2
  exit 1
fi

if ! command -v k3s >/dev/null 2>&1; then
  echo "ERROR: k3s is required to import the local image." >&2
  exit 1
fi

if ! command -v kubectl >/dev/null 2>&1; then
  echo "ERROR: kubectl is required to update the deployment." >&2
  exit 1
fi

git fetch "$REMOTE"
git checkout "$BRANCH"
git pull --ff-only "$REMOTE" "$BRANCH"

commit="$(git rev-parse --short HEAD)"
image="${IMAGE_PREFIX}-${commit}"

echo "Pruning unused local build and runtime images before portal build"
docker system prune -af || true
sudo k3s crictl rmi --prune || true

echo "Building portal image: $image"
timeout "$DEPLOY_STEP_TIMEOUT_SECONDS" docker build --no-cache -t "$image" apps/portal

echo "Importing image into K3s: $image"
timeout "$DEPLOY_STEP_TIMEOUT_SECONDS" bash -c 'docker save "$1" | sudo k3s ctr images import -' _ "$image"

if [[ -n "${OPENAI_API_KEY_B64:-}" ]]; then
  echo "Syncing OPENAI_API_KEY into secret/opencare-secrets"
  if ! printf '%s' "$OPENAI_API_KEY_B64" | base64 -d >/dev/null 2>&1; then
    echo "ERROR: OPENAI_API_KEY_B64 is not valid base64." >&2
    exit 1
  fi
  if ! "${KUBECTL[@]}" get secret opencare-secrets >/dev/null 2>&1; then
    "${KUBECTL[@]}" create secret generic opencare-secrets >/dev/null
  fi
  "${KUBECTL[@]}" patch secret opencare-secrets --type merge \
    -p "{\"data\":{\"OPENAI_API_KEY\":\"$OPENAI_API_KEY_B64\"}}" >/dev/null
else
  echo "OPENAI_API_KEY secret was not provided to this deploy; existing cluster secret, if any, is unchanged."
fi

echo "Ensuring public portal host is configured: $PUBLIC_PORTAL_HOST"
if "${KUBECTL[@]}" get configmap opencare-config >/dev/null 2>&1; then
  "${KUBECTL[@]}" patch configmap opencare-config --type merge \
    -p "{\"data\":{\"PORTAL_HOST\":\"${PUBLIC_PORTAL_HOST}\",\"PORTAL_URL\":\"${PUBLIC_PORTAL_URL}\",\"BASE_DOMAIN\":\"${PUBLIC_PORTAL_HOST}\"}}" >/dev/null
else
  echo "WARN: configmap/opencare-config not found; skipping public host config patch." >&2
fi

if "${KUBECTL[@]}" get ingress opencare-app >/dev/null 2>&1; then
  if ! "${KUBECTL[@]}" get ingress opencare-app -o jsonpath='{range .spec.rules[*]}{.host}{"\n"}{end}' | grep -Fx "$PUBLIC_PORTAL_HOST" >/dev/null; then
    portal_rule="{\"host\":\"${PUBLIC_PORTAL_HOST}\",\"http\":{\"paths\":[{\"path\":\"/\",\"pathType\":\"Prefix\",\"backend\":{\"service\":{\"name\":\"portal\",\"port\":{\"number\":3000}}}}]}}"
    "${KUBECTL[@]}" patch ingress opencare-app --type=json \
      -p "[{\"op\":\"add\",\"path\":\"/spec/rules/0\",\"value\":${portal_rule}}]" >/dev/null
  fi
  if "${KUBECTL[@]}" get ingress opencare-app -o jsonpath='{.spec.tls[0].hosts[0]}' >/dev/null 2>&1; then
    if ! "${KUBECTL[@]}" get ingress opencare-app -o jsonpath='{range .spec.tls[*].hosts[*]}{.}{"\n"}{end}' | grep -Fx "$PUBLIC_PORTAL_HOST" >/dev/null; then
      "${KUBECTL[@]}" patch ingress opencare-app --type=json \
        -p "[{\"op\":\"add\",\"path\":\"/spec/tls/0/hosts/-\",\"value\":\"${PUBLIC_PORTAL_HOST}\"}]" >/dev/null
    fi
  fi
else
  echo "WARN: ingress/opencare-app not found; skipping public host ingress patch." >&2
fi

echo "Updating deployment/$DEPLOYMENT in namespace $NAMESPACE"
"${KUBECTL[@]}" set image "deployment/$DEPLOYMENT" "$CONTAINER=$image"
"${KUBECTL[@]}" patch "deployment/$DEPLOYMENT" \
  -p "{\"spec\":{\"template\":{\"spec\":{\"containers\":[{\"name\":\"$CONTAINER\",\"envFrom\":[{\"configMapRef\":{\"name\":\"opencare-config\"}},{\"secretRef\":{\"name\":\"opencare-secrets\",\"optional\":true}}],\"env\":[{\"name\":\"PORT\",\"value\":\"3000\"}]}]}}}}"
"${KUBECTL[@]}" patch "deployment/$DEPLOYMENT" \
  -p "{\"spec\":{\"template\":{\"spec\":{\"containers\":[{\"name\":\"$CONTAINER\",\"imagePullPolicy\":\"Never\"}]}}}}"

echo "Clearing existing $DEPLOYMENT pods to avoid single-node rollout stalls"
"${KUBECTL[@]}" scale "deployment/$DEPLOYMENT" --replicas=0
"${KUBECTL[@]}" delete pod -l "app=$DEPLOYMENT" --grace-period=0 --force --wait=false >/dev/null 2>&1 || true
sleep 10
"${KUBECTL[@]}" scale "deployment/$DEPLOYMENT" --replicas=1

echo "Waiting for deployment/$DEPLOYMENT to become available"
deadline=$((SECONDS + 600))
available=false
while (( SECONDS < deadline )); do
  if "${KUBECTL[@]}" wait --for=condition=available "deployment/$DEPLOYMENT" --timeout=20s; then
    available=true
    break
  fi
  echo "Still waiting for deployment/$DEPLOYMENT; current pods:"
  "${KUBECTL[@]}" get pods -l "app=$DEPLOYMENT" -o wide || true
done

if [[ "$available" != true ]]; then
  echo "ERROR: deployment/$DEPLOYMENT did not become available." >&2
  dump_portal_state >&2
  exit 1
fi

echo "Portal deployed from $BRANCH @ $commit"
echo "Image: $image"
