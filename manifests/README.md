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

Superset runs from `ghcr.io/maraqa1/opencare-superset:latest`, a small wrapper image
around `apache/superset:4.1.1` that installs the PostgreSQL driver required for
metadata setup and dashboard sync. Superset metadata is stored in PostgreSQL via
`SQLALCHEMY_DATABASE_URI`, defaulting to the `superset_meta` schema in PostgreSQL, so
dashboards/datasets survive pod replacement instead of falling back to the pod-local
default SQLite database.

Keep deployment assets minimal, production-shaped, and consistent with one VM operation.

External access is rendered during bootstrap rather than committed as a static manifest:
- `scripts/bootstrap/apply_app.sh` creates a Traefik-compatible ingress
- `/` routes to `portal`
- `/api`, `/docs`, `/openapi.json`, `/healthz`, and `/readyz` route to `backend`
- `ANALYTICS_HOST` routes to `superset`
- set `EXTERNAL_HOST` to attach the ingress to a specific host, or leave it blank to match all hosts
- set `SUPERSET_EMBED_URL` explicitly if you want the portal iframe to target a different public analytics URL; otherwise it derives from `ANALYTICS_HOST`
