Read .codex/AGENTS.md first.

Build FastAPI backend in apps/backend.

Create:
- app entrypoint
- config loader
- routes:
  /healthz
  /readyz
  /api/dictionary
  /api/forecasts/latest
  /api/anomalies/latest
  /api/status/runtime
  /api/status/platform
  /api/reports
  /api/facts

Add Dockerfile and requirements.

Keep it minimal and consistent with .env.template.
