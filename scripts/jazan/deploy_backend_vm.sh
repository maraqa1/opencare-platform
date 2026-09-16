#!/usr/bin/env bash
set -euo pipefail

BRANCH="${BRANCH:-codex/jazan-demo}"
REMOTE="${REMOTE:-origin}"
NAMESPACE="${NAMESPACE:-opencare}"
DEPLOYMENT="${DEPLOYMENT:-backend}"
CONTAINER="${CONTAINER:-backend}"
IMAGE_PREFIX="${IMAGE_PREFIX:-opencare-backend:jazan}"
KUBECONFIG_PATH="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"
DEPLOY_STEP_TIMEOUT_SECONDS="${DEPLOY_STEP_TIMEOUT_SECONDS:-1200}"
KUBECTL=(sudo env KUBECONFIG="$KUBECONFIG_PATH" kubectl -n "$NAMESPACE")

if [[ -z "${MODULE01_ASSESSMENT_ADMIN_TOKEN:-}" || -z "${MODULE01_ASSESSMENT_TOKEN_SECRET:-}" ]]; then
  echo "ERROR: Module 01 assessment secrets were not supplied by the deployment environment." >&2
  exit 1
fi

git fetch "$REMOTE"
git checkout "$BRANCH"
git pull --ff-only "$REMOTE" "$BRANCH"

commit="$(git rev-parse --short HEAD)"
image="${IMAGE_PREFIX}-${commit}"

echo "Building backend image: $image"
timeout "$DEPLOY_STEP_TIMEOUT_SECONDS" docker build --no-cache -f apps/backend/Dockerfile -t "$image" .

echo "Importing image into K3s: $image"
timeout "$DEPLOY_STEP_TIMEOUT_SECONDS" bash -c 'docker save "$1" | sudo k3s ctr images import -' _ "$image"

echo "Updating Module 01 assessment secrets"
"${KUBECTL[@]}" patch secret opencare-secrets --type merge \
  -p "{\"stringData\":{\"MODULE01_ASSESSMENT_ADMIN_TOKEN\":\"${MODULE01_ASSESSMENT_ADMIN_TOKEN}\",\"MODULE01_ASSESSMENT_TOKEN_SECRET\":\"${MODULE01_ASSESSMENT_TOKEN_SECRET}\"}}" >/dev/null

echo "Updating deployment/$DEPLOYMENT in namespace $NAMESPACE"
"${KUBECTL[@]}" set image "deployment/$DEPLOYMENT" "$CONTAINER=$image"
"${KUBECTL[@]}" patch "deployment/$DEPLOYMENT" \
  -p "{\"spec\":{\"template\":{\"spec\":{\"containers\":[{\"name\":\"$CONTAINER\",\"envFrom\":[{\"configMapRef\":{\"name\":\"opencare-config\"}},{\"secretRef\":{\"name\":\"opencare-secrets\"}}]}]}}}}" >/dev/null
"${KUBECTL[@]}" patch "deployment/$DEPLOYMENT" \
  -p "{\"spec\":{\"template\":{\"spec\":{\"containers\":[{\"name\":\"$CONTAINER\",\"imagePullPolicy\":\"Never\"}]}}}}" >/dev/null

echo "Restarting deployment/$DEPLOYMENT"
"${KUBECTL[@]}" scale "deployment/$DEPLOYMENT" --replicas=0
"${KUBECTL[@]}" delete pod -l "app=$DEPLOYMENT" --grace-period=0 --force --wait=false >/dev/null 2>&1 || true
sleep 5
"${KUBECTL[@]}" scale "deployment/$DEPLOYMENT" --replicas=1
"${KUBECTL[@]}" rollout status "deployment/$DEPLOYMENT" --timeout=600s

echo "Backend deployed from $BRANCH @ $commit"
echo "Image: $image"
