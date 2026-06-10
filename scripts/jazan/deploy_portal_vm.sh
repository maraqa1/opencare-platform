#!/usr/bin/env bash
set -euo pipefail

BRANCH="${BRANCH:-codex/jazan-demo}"
REMOTE="${REMOTE:-origin}"
NAMESPACE="${NAMESPACE:-opencare}"
DEPLOYMENT="${DEPLOYMENT:-portal}"
CONTAINER="${CONTAINER:-portal}"
IMAGE_PREFIX="${IMAGE_PREFIX:-opencare-portal:jazan}"
KUBECONFIG_PATH="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"

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

echo "Building portal image: $image"
docker build --no-cache -t "$image" apps/portal

echo "Importing image into K3s: $image"
docker save "$image" | sudo k3s ctr images import -

echo "Updating deployment/$DEPLOYMENT in namespace $NAMESPACE"
sudo env KUBECONFIG="$KUBECONFIG_PATH" kubectl -n "$NAMESPACE" set image "deployment/$DEPLOYMENT" "$CONTAINER=$image"
sudo env KUBECONFIG="$KUBECONFIG_PATH" kubectl -n "$NAMESPACE" patch "deployment/$DEPLOYMENT" \
  -p "{\"spec\":{\"template\":{\"spec\":{\"containers\":[{\"name\":\"$CONTAINER\",\"imagePullPolicy\":\"Never\"}]}}}}"
sudo env KUBECONFIG="$KUBECONFIG_PATH" kubectl -n "$NAMESPACE" rollout restart "deployment/$DEPLOYMENT"
sudo env KUBECONFIG="$KUBECONFIG_PATH" kubectl -n "$NAMESPACE" rollout status "deployment/$DEPLOYMENT"

echo "Portal deployed from $BRANCH @ $commit"
echo "Image: $image"

