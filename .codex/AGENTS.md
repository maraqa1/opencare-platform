# OpenCare Insight Platform — Codex Rules

## Product
This repo implements OpenCare Insight Platform (OCIP), a lightweight, single-tenant healthcare analytics platform for bed occupancy intelligence.

## Locked architecture
- Single tenant
- One VM
- K3s
- Let’s Encrypt TLS
- PostgreSQL
- MinIO
- Redis
- Keycloak
- FastAPI backend
- Next.js portal
- Superset embedded dashboards
- dbt for transformation
- Airbyte for external MySQL ingestion
- R runtimes for forecast and anomaly

## Non-negotiable rules
- Do not introduce alternate stacks unless explicitly asked
- Do not expose Superset as the main product UI
- Do not allow dashboards to read raw tables
- Do not bypass dbt as the transformation path
- Do not let R runtimes read raw data
- Keep one environment contract
- Keep one storage contract
- Keep manifests, scripts, and docs consistent

## Build philosophy
- Minimal but production-shaped
- Idempotent scripts
- Clear health checks
- Small coherent changes
- Update docs when behavior changes

## Directory ownership
- apps/backend: FastAPI APIs
- apps/portal: customer/admin UI
- dbt/opencare: transformation models
- r-runtime: predictive modules
- manifests: Kubernetes resources
- install: installation and validation
- sql: bootstrap and dictionary schemas
- configs: service-level configuration

## Before editing
Always:
1. inspect existing files in scope
2. preserve naming consistency
3. update docs if behavior changes
4. add or update validation where appropriate
