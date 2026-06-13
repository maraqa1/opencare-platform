# Local AI Gateway

This module deploys a standalone local AI runtime for OpenCare/DMO and other projects.

Public endpoint:

```text
https://ai.opendatalake.com/v1/chat/completions
```

Internal endpoint:

```text
http://local-ai-gateway.opencare.svc.cluster.local:8080/v1/chat/completions
```

The gateway exposes an OpenAI-compatible surface but does not call OpenAI. It proxies to Ollama only.

## Deploy on the Jazan/DMO VM

```bash
bash scripts/jazan/deploy_local_ai_vm.sh
```

Defaults:

```bash
AI_HOST=ai.opendatalake.com
LOCAL_AI_MODEL=llama3.2:3b
```

Retrieve the generated API key:

```bash
sudo KUBECONFIG=/etc/rancher/k3s/k3s.yaml \
  kubectl -n opencare get secret opencare-secrets \
  -o jsonpath='{.data.LOCAL_AI_API_KEY}' | base64 -d; echo
```

Call from another machine:

```bash
curl https://ai.opendatalake.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_LOCAL_AI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.2:3b",
    "messages": [
      { "role": "user", "content": "Write a one sentence test response." }
    ]
  }'
```

Remove the module:

```bash
kubectl -n opencare delete deployment/local-ai-gateway service/local-ai-gateway
kubectl -n opencare delete deployment/ollama service/ollama
kubectl -n opencare delete pvc/ollama-models
```
