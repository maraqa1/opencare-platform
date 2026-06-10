#!/usr/bin/env bash
set -euo pipefail

BRANCH="${BRANCH:-codex/jazan-demo}"
REMOTE="${REMOTE:-origin}"
NAMESPACE="${NAMESPACE:-opencare}"
DEPLOYMENT="${DEPLOYMENT:-portal}"
CONTAINER="${CONTAINER:-portal}"
IMAGE_PREFIX="${IMAGE_PREFIX:-opencare-portal:jazan}"
KUBECONFIG_PATH="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"
KUBECTL=(sudo env KUBECONFIG="$KUBECONFIG_PATH" kubectl -n "$NAMESPACE")

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

echo "Updating deployment/$DEPLOYMENT in namespace $NAMESPACE"
"${KUBECTL[@]}" set image "deployment/$DEPLOYMENT" "$CONTAINER=$image"
"${KUBECTL[@]}" patch "deployment/$DEPLOYMENT" \
  -p "{\"spec\":{\"template\":{\"spec\":{\"containers\":[{\"name\":\"$CONTAINER\",\"envFrom\":[{\"configMapRef\":{\"name\":\"opencare-config\"}},{\"secretRef\":{\"name\":\"opencare-secrets\",\"optional\":true}}],\"env\":[{\"name\":\"PORT\",\"value\":\"3000\"}]}]}}}}"
"${KUBECTL[@]}" patch "deployment/$DEPLOYMENT" \
  -p "{\"spec\":{\"template\":{\"spec\":{\"containers\":[{\"name\":\"$CONTAINER\",\"imagePullPolicy\":\"Never\"}]}}}}"
"${KUBECTL[@]}" rollout restart "deployment/$DEPLOYMENT"
"${KUBECTL[@]}" rollout status "deployment/$DEPLOYMENT"

echo "Portal deployed from $BRANCH @ $commit"
echo "Image: $image"
