# Kubernetes Manifests Scaffold

This directory owns lightweight K3s manifests for platform services and workloads.

Service areas prepared here:
- postgres
- minio
- redis
- keycloak
- backend
- portal
- superset
- dbt
- runtimes

Keep deployment assets minimal, production-shaped, and consistent with one VM operation.

External access is rendered during bootstrap rather than committed as a static manifest:
- `scripts/bootstrap/apply_app.sh` creates a Traefik-compatible ingress
- `/` routes to `portal`
- `/api`, `/docs`, `/openapi.json`, `/healthz`, and `/readyz` route to `backend`
- set `EXTERNAL_HOST` to attach the ingress to a specific host, or leave it blank to match all hosts
