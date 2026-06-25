#!/usr/bin/env bash
set -euo pipefail

BRANCH="${BRANCH:-codex/jazan-demo}"
REMOTE="${REMOTE:-origin}"
NAMESPACE="${NAMESPACE:-opencare}"
IMAGE_PREFIX="${IMAGE_PREFIX:-opencare-local-ai-gateway:jazan}"
KUBECONFIG_PATH="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"
DEPLOY_STEP_TIMEOUT_SECONDS="${DEPLOY_STEP_TIMEOUT_SECONDS:-1200}"
AI_HOST="${AI_HOST:-ai.opendatalake.com}"
LOCAL_AI_MODEL="${JAZAN_AI2_MODEL:-mistral-nemo:12b}"
OLLAMA_BASE_URL="${OLLAMA_BASE_URL:-http://168.119.156.124:11434/v1}"
LOCAL_AI_CHAT_API_URL="${LOCAL_AI_CHAT_API_URL:-http://ai2.opendatalake.com:3000/api/chat}"
LOCAL_AI_HEALTH_URL="${LOCAL_AI_HEALTH_URL:-http://ai2.opendatalake.com:3000/healthz}"
KUBECTL=(sudo env KUBECONFIG="$KUBECONFIG_PATH" kubectl -n "$NAMESPACE")

if ! command -v git >/dev/null 2>&1; then
  echo "ERROR: git is required." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker is required to build the local AI gateway image." >&2
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

echo "Building local AI gateway image: $image"
timeout "$DEPLOY_STEP_TIMEOUT_SECONDS" docker build --no-cache -t "$image" apps/ai-gateway

echo "Importing local AI gateway image into K3s: $image"
timeout "$DEPLOY_STEP_TIMEOUT_SECONDS" bash -c 'docker save "$1" | sudo k3s ctr images import -' _ "$image"

echo "Ensuring LOCAL_AI_API_KEY exists in secret/opencare-secrets"
if ! "${KUBECTL[@]}" get secret opencare-secrets >/dev/null 2>&1; then
  "${KUBECTL[@]}" create secret generic opencare-secrets >/dev/null
fi

if ! "${KUBECTL[@]}" get secret opencare-secrets -o jsonpath='{.data.LOCAL_AI_API_KEY}' 2>/dev/null | grep -q .; then
  if command -v openssl >/dev/null 2>&1; then
    local_ai_api_key="$(openssl rand -base64 36 | tr -d '\n')"
  else
    local_ai_api_key="$(date +%s | sha256sum | awk '{print $1}')"
  fi
  local_ai_api_key_b64="$(printf '%s' "$local_ai_api_key" | base64 -w0)"
  "${KUBECTL[@]}" patch secret opencare-secrets --type merge \
    -p "{\"data\":{\"LOCAL_AI_API_KEY\":\"${local_ai_api_key_b64}\"}}" >/dev/null
  echo "Generated LOCAL_AI_API_KEY in secret/opencare-secrets."
else
  echo "LOCAL_AI_API_KEY already exists in secret/opencare-secrets."
fi

echo "Applying local AI module"
echo "Local AI model: $LOCAL_AI_MODEL"
echo "Local AI chat API: $LOCAL_AI_CHAT_API_URL"
if "${KUBECTL[@]}" get deployment/local-ai-gateway >/dev/null 2>&1; then
  "${KUBECTL[@]}" set env deployment/local-ai-gateway \
    LOCAL_AI_MODEL- \
    LOCAL_AI_CHAT_API_URL- \
    LOCAL_AI_HEALTH_URL- >/dev/null || true
fi
sudo env \
  KUBECONFIG="$KUBECONFIG_PATH" \
  NAMESPACE="$NAMESPACE" \
  AI_HOST="$AI_HOST" \
  LOCAL_AI_MODEL="$LOCAL_AI_MODEL" \
  OLLAMA_BASE_URL="$OLLAMA_BASE_URL" \
  LOCAL_AI_CHAT_API_URL="$LOCAL_AI_CHAT_API_URL" \
  LOCAL_AI_HEALTH_URL="$LOCAL_AI_HEALTH_URL" \
  LOCAL_AI_GATEWAY_IMAGE="$image" \
  LOCAL_AI_GATEWAY_WAIT=false \
  bash scripts/local-ai/apply_local_ai.sh

echo "Pinning deployment/local-ai-gateway to local image: $image"
"${KUBECTL[@]}" set image deployment/local-ai-gateway "local-ai-gateway=$image" >/dev/null
"${KUBECTL[@]}" set env deployment/local-ai-gateway \
  "LOCAL_AI_MODEL=$LOCAL_AI_MODEL" \
  "LOCAL_AI_CHAT_API_URL=$LOCAL_AI_CHAT_API_URL" \
  "LOCAL_AI_HEALTH_URL=$LOCAL_AI_HEALTH_URL" >/dev/null
"${KUBECTL[@]}" patch deployment/local-ai-gateway \
  -p "{\"spec\":{\"template\":{\"spec\":{\"containers\":[{\"name\":\"local-ai-gateway\",\"imagePullPolicy\":\"Never\"}]}}}}" >/dev/null

echo "Ensuring public AI host is configured: $AI_HOST"
if "${KUBECTL[@]}" get ingress opencare-app >/dev/null 2>&1; then
  if ! "${KUBECTL[@]}" get ingress opencare-app -o jsonpath='{range .spec.rules[*]}{.host}{"\n"}{end}' | grep -Fx "$AI_HOST" >/dev/null; then
    ai_rule="{\"host\":\"${AI_HOST}\",\"http\":{\"paths\":[{\"path\":\"/\",\"pathType\":\"Prefix\",\"backend\":{\"service\":{\"name\":\"local-ai-gateway\",\"port\":{\"number\":8080}}}}]}}"
    "${KUBECTL[@]}" patch ingress opencare-app --type=json \
      -p "[{\"op\":\"add\",\"path\":\"/spec/rules/-\",\"value\":${ai_rule}}]" >/dev/null
  fi
  if "${KUBECTL[@]}" get ingress opencare-app -o jsonpath='{.spec.tls[0].hosts[0]}' >/dev/null 2>&1; then
    if ! "${KUBECTL[@]}" get ingress opencare-app -o jsonpath='{range .spec.tls[*].hosts[*]}{.}{"\n"}{end}' | grep -Fx "$AI_HOST" >/dev/null; then
      "${KUBECTL[@]}" patch ingress opencare-app --type=json \
        -p "[{\"op\":\"add\",\"path\":\"/spec/tls/0/hosts/-\",\"value\":\"${AI_HOST}\"}]" >/dev/null
    fi
  fi
else
  echo "WARN: ingress/opencare-app not found; skipping AI public host ingress patch." >&2
fi

echo "Restarting local AI gateway"
"${KUBECTL[@]}" rollout restart deployment/local-ai-gateway >/dev/null
echo "Clearing existing local-ai-gateway pods to avoid single-node rollout stalls"
"${KUBECTL[@]}" scale deployment/local-ai-gateway --replicas=0
"${KUBECTL[@]}" delete pod -l "app=local-ai-gateway" --grace-period=0 --force --wait=false >/dev/null 2>&1 || true
sleep 10
"${KUBECTL[@]}" scale deployment/local-ai-gateway --replicas=1

echo "Waiting for deployment/local-ai-gateway to become available"
deadline=$((SECONDS + 600))
available=false
while (( SECONDS < deadline )); do
  if "${KUBECTL[@]}" wait --for=condition=available deployment/local-ai-gateway --timeout=20s; then
    available=true
    break
  fi
  echo "Still waiting for deployment/local-ai-gateway; current pods:"
  "${KUBECTL[@]}" get pods -l "app=local-ai-gateway" -o wide || true
done

if [[ "$available" != true ]]; then
  echo "ERROR: deployment/local-ai-gateway did not become available." >&2
  "${KUBECTL[@]}" get deployment local-ai-gateway -o wide >&2 || true
  "${KUBECTL[@]}" get rs -l "app=local-ai-gateway" -o wide >&2 || true
  "${KUBECTL[@]}" get pods -l "app=local-ai-gateway" -o wide >&2 || true
  "${KUBECTL[@]}" describe pods -l "app=local-ai-gateway" >&2 || true
  "${KUBECTL[@]}" logs -l "app=local-ai-gateway" --tail=120 --all-containers=true >&2 || true
  exit 1
fi

run_cluster_http_check local-ai-gateway-health http://local-ai-gateway:8080/health 3 5

if "${KUBECTL[@]}" get deployment portal >/dev/null 2>&1; then
  echo "Restarting portal so local AI environment changes are visible to Next.js server routes"
  "${KUBECTL[@]}" rollout restart deployment/portal >/dev/null
  "${KUBECTL[@]}" rollout status deployment/portal --timeout=600s
fi

echo "Local AI deployed from $BRANCH @ $commit"
echo "Gateway image: $image"
echo "Public endpoint: https://${AI_HOST}/v1/chat/completions"
echo "Retrieve API key on the VM with:"
echo "  sudo KUBECONFIG=${KUBECONFIG_PATH} kubectl -n ${NAMESPACE} get secret opencare-secrets -o jsonpath='{.data.LOCAL_AI_API_KEY}' | base64 -d; echo"
