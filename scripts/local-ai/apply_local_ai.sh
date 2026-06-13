#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

LOCAL_AI_MODEL="${LOCAL_AI_MODEL:-llama3.2:3b}"
LOCAL_AI_KEEP_ALIVE="${LOCAL_AI_KEEP_ALIVE:--1}"
AI_GATEWAY_INTERNAL_URL="${AI_GATEWAY_INTERNAL_URL:-http://local-ai-gateway:8080/v1}"
AI_GATEWAY_PUBLIC_URL="${AI_GATEWAY_PUBLIC_URL:-https://${AI_HOST:-ai.opendatalake.com}/v1}"
SKIP_LOCAL_AI_MODEL_PULL="${SKIP_LOCAL_AI_MODEL_PULL:-false}"
SKIP_LOCAL_AI_MODEL_WARM="${SKIP_LOCAL_AI_MODEL_WARM:-false}"
MODEL_PULL_JOB_TIMEOUT_SECONDS="${MODEL_PULL_JOB_TIMEOUT_SECONDS:-7200}"
MODEL_WARM_JOB_TIMEOUT_SECONDS="${MODEL_WARM_JOB_TIMEOUT_SECONDS:-900}"

apply_file "$ROOT_DIR/manifests/local-ai/ollama.yaml"

log "Waiting for deployment/ollama"
kubectl -n "$NAMESPACE" rollout status deployment/ollama --timeout="${LOCAL_AI_OLLAMA_TIMEOUT_SECONDS:-600}s"

log "Configuring local AI runtime settings"
kubectl -n "$NAMESPACE" patch configmap opencare-config --type merge \
  -p "{\"data\":{\"ENABLE_LOCAL_AI\":\"true\",\"ENABLE_OPENAI\":\"false\",\"AI_PROVIDER\":\"local\",\"AI_PROVIDER_FALLBACK\":\"none\",\"LOCAL_AI_MODEL\":\"${LOCAL_AI_MODEL}\",\"LOCAL_AI_KEEP_ALIVE\":\"${LOCAL_AI_KEEP_ALIVE}\",\"OLLAMA_BASE_URL\":\"http://ollama:11434/v1\",\"AI_GATEWAY_BASE_URL\":\"${AI_GATEWAY_INTERNAL_URL}\",\"AI_GATEWAY_PUBLIC_URL\":\"${AI_GATEWAY_PUBLIC_URL}\",\"AI_HOST\":\"${AI_HOST:-ai.opendatalake.com}\"}}" >/dev/null

if [[ "$SKIP_LOCAL_AI_MODEL_PULL" != "true" ]]; then
  log "Pulling local AI model into Ollama: ${LOCAL_AI_MODEL}"
  wait_for_job_cleanup local-ai-model-pull
  apply_file "$ROOT_DIR/manifests/local-ai/model-pull-job.yaml"
  previous_job_timeout="$JOB_TIMEOUT_SECONDS"
  JOB_TIMEOUT_SECONDS="$MODEL_PULL_JOB_TIMEOUT_SECONDS"
  if ! wait_for_job_completion local-ai-model-pull; then
    print_job_diagnostics local-ai-model-pull
    fail "Local AI model pull failed: ${LOCAL_AI_MODEL}"
  fi
  JOB_TIMEOUT_SECONDS="$previous_job_timeout"
else
  log_skip "Skipping model pull via SKIP_LOCAL_AI_MODEL_PULL=true"
fi

if [[ "$SKIP_LOCAL_AI_MODEL_WARM" != "true" ]]; then
  log "Warming local AI model in memory: ${LOCAL_AI_MODEL} keep_alive=${LOCAL_AI_KEEP_ALIVE}"
  wait_for_job_cleanup local-ai-model-warm
  apply_file "$ROOT_DIR/manifests/local-ai/model-warm-job.yaml"
  previous_job_timeout="$JOB_TIMEOUT_SECONDS"
  JOB_TIMEOUT_SECONDS="$MODEL_WARM_JOB_TIMEOUT_SECONDS"
  if ! wait_for_job_completion local-ai-model-warm; then
    print_job_diagnostics local-ai-model-warm
    fail "Local AI model warm-up failed: ${LOCAL_AI_MODEL}"
  fi
  JOB_TIMEOUT_SECONDS="$previous_job_timeout"
else
  log_skip "Skipping model warm-up via SKIP_LOCAL_AI_MODEL_WARM=true"
fi

if [[ -n "${LOCAL_AI_GATEWAY_IMAGE:-}" ]]; then
  rendered_gateway="$(mktemp)"
  sed "s|image: opencare-local-ai-gateway:dev|image: ${LOCAL_AI_GATEWAY_IMAGE}|g" \
    "$ROOT_DIR/manifests/local-ai/gateway.yaml" >"$rendered_gateway"
  kubectl apply -f "$rendered_gateway"
  rm -f "$rendered_gateway"
else
  apply_file "$ROOT_DIR/manifests/local-ai/gateway.yaml"
fi

log "Waiting for deployment/local-ai-gateway"
kubectl -n "$NAMESPACE" rollout status deployment/local-ai-gateway --timeout="${LOCAL_AI_GATEWAY_TIMEOUT_SECONDS:-600}s"

run_cluster_http_check local-ai-gateway-health http://local-ai-gateway:8080/health 3 5

log_success "Local AI runtime ready"
