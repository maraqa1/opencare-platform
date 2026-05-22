#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"
# shellcheck source=scripts/use_cases/manifest.sh
source "$ROOT_DIR/scripts/use_cases/manifest.sh"

usage() {
  cat <<'EOF'
Usage: bash scripts/use_cases/validate_use_case.sh <use_case>

Supported use cases:
  - bed_pressure
  - revenue_cycle_management
  - talemia_business_intelligence
  - all
EOF
}

ensure_use_case_prereqs() {
  require_cmd bash
  require_cmd kubectl
  ensure_cluster_access
}

check_postgres_greater_than_zero() {
  local sql="$1"
  local actual

  actual="$(kubectl -n "$NAMESPACE" exec -i postgres-0 -- psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "$sql" | tr -d '[:space:]')"
  [[ "$actual" =~ ^[0-9]+$ ]] || fail "Non-numeric SQL result for [$sql]: [$actual]"
  (( actual > 0 )) || fail "Expected result greater than zero for [$sql], got [$actual]"
}

validate_bed_pressure() {
  log "Validating Bed Pressure use case"
  bash "$ROOT_DIR/scripts/demo/validate_phase2_loop.sh"
  run_cluster_http_check occupancy-current "${BACKEND_URL}/api/v1/occupancy/current"
  run_cluster_http_check occupancy-historical "${BACKEND_URL}/api/v1/occupancy/historical?days=30"
  run_cluster_http_check forecast-latest "${BACKEND_URL}/api/v1/forecast"
  run_cluster_http_check anomalies-latest "${BACKEND_URL}/api/v1/anomalies"
  run_cluster_http_check portal-bed-pressure "${PORTAL_URL}/use-cases/bed-pressure/status"
  run_cluster_http_check bed-pressure-decisions "${BACKEND_URL}/api/v1/decisions/count?use_case=bed_pressure"
  log_success "Bed Pressure use case validated"
}

validate_revenue_cycle_management() {
  log "Validating Revenue Cycle Management use case"
  check_postgres_greater_than_zero "select count(*) from ${DEMO_RAW_SCHEMA}.rcm_claims;"
  check_postgres_greater_than_zero "select count(*) from ${DEMO_RAW_SCHEMA}.rcm_financial_postings;"
  check_postgres_greater_than_zero "select count(*) from ${DEMO_RAW_SCHEMA}.rcm_referrals;"
  check_postgres_greater_than_zero "select count(*) from ${ANALYTICS_SCHEMA}.fct_revenue_cycle;"
  check_postgres_greater_than_zero "select count(*) from ${ANALYTICS_SCHEMA}.fct_cash_forecast;"
  check_postgres_greater_than_zero "select count(*) from ${ANALYTICS_SCHEMA}.fct_cash_recovery_opportunity;"
  check_postgres_greater_than_zero "select count(*) from ${ANALYTICS_SCHEMA}.fct_revenue_leakage;"
  check_postgres_greater_than_zero "select count(*) from ${ANALYTICS_SCHEMA}.fct_team_recovery_performance;"
  run_cluster_http_check revenue-cycle-cash-command "${BACKEND_URL}/api/v1/revenue-cycle/cash-command"
  run_cluster_http_check revenue-cycle-recovery-queue "${BACKEND_URL}/api/v1/revenue-cycle/recovery-queue"
  run_cluster_http_check revenue-cycle-payer-control "${BACKEND_URL}/api/v1/revenue-cycle/payer-control"
  run_cluster_http_check revenue-cycle-leakage "${BACKEND_URL}/api/v1/revenue-cycle/leakage"
  run_cluster_http_check revenue-cycle-team-performance "${BACKEND_URL}/api/v1/revenue-cycle/team-performance"
  run_cluster_http_check revenue-cycle-executive-narrative "${BACKEND_URL}/api/v1/revenue-cycle/executive-narrative"
  run_cluster_http_check portal-revenue-cycle "${PORTAL_URL}/use-cases/revenue-cycle-management/cash-command"
  log_success "Revenue Cycle Management use case validated"
}

validate_talemia_business_intelligence() {
  log "Validating TALEMIA Business Intelligence use case"
  check_postgres_greater_than_zero "select count(*) from ${ANALYTICS_SCHEMA}.fct_talemia_opportunity;"
  check_postgres_greater_than_zero "select count(*) from ${ANALYTICS_SCHEMA}.fct_talemia_pipeline;"
  check_postgres_greater_than_zero "select count(*) from ${ANALYTICS_SCHEMA}.fct_talemia_win_loss;"
  check_postgres_greater_than_zero "select count(*) from ${ANALYTICS_SCHEMA}.fct_talemia_account_manager_performance;"
  check_postgres_greater_than_zero "select count(*) from ${ANALYTICS_SCHEMA}.fct_talemia_business_line_performance;"
  check_postgres_greater_than_zero "select count(*) from ${ANALYTICS_SCHEMA}.fct_talemia_dashboard_reconciliation;"
  check_postgres_greater_than_zero "select count(*) from ${DICTIONARY_SCHEMA}.dict_talemia_metrics;"
  check_postgres_greater_than_zero "select count(*) from ${DICTIONARY_SCHEMA}.dict_talemia_terms;"
  run_cluster_http_check talemia-executive-summary "${BACKEND_URL}/api/v1/talemia/executive-summary"
  run_cluster_http_check talemia-pipeline-business-lines "${BACKEND_URL}/api/v1/talemia/pipeline/business-lines"
  run_cluster_http_check talemia-pipeline-stages "${BACKEND_URL}/api/v1/talemia/pipeline/stages"
  run_cluster_http_check talemia-win-loss "${BACKEND_URL}/api/v1/talemia/win-loss"
  run_cluster_http_check talemia-account-managers "${BACKEND_URL}/api/v1/talemia/account-managers"
  run_cluster_http_check talemia-opportunities "${BACKEND_URL}/api/v1/talemia/opportunities"
  run_cluster_http_check talemia-updates "${BACKEND_URL}/api/v1/talemia/updates"
  run_cluster_http_check talemia-kpis "${BACKEND_URL}/api/v1/talemia/kpis"
  run_cluster_http_check talemia-governance-reconciliation "${BACKEND_URL}/api/v1/talemia/governance/reconciliation"
  run_cluster_http_check portal-talemia "${PORTAL_URL}/use-cases/talemia-business-intelligence"
  log_success "TALEMIA Business Intelligence use case validated"
}

validate_one_use_case() {
  local use_case="$1"
  local use_case_name

  manifest_assert_enabled_use_case "$use_case"
  use_case_name="$(manifest_use_case_name "$use_case")"
  log "Validating use case: ${use_case_name:-$use_case}"

  case "$use_case" in
    bed_pressure)
      validate_bed_pressure
      ;;
    revenue_cycle_management)
      validate_revenue_cycle_management
      ;;
    talemia_business_intelligence)
      validate_talemia_business_intelligence
      ;;
    *)
      fail "Manifest entry exists but no validation workflow is implemented yet for: ${use_case}"
      ;;
  esac
}

main() {
  local use_case="${1:-}"

  [[ -n "$use_case" ]] || {
    usage
    exit 1
  }

  case "$use_case" in
    --help|-h)
      usage
      exit 0
      ;;
  esac

  ensure_use_case_prereqs

  case "$use_case" in
    bed_pressure)
      validate_one_use_case "$use_case"
      ;;
    revenue_cycle_management)
      validate_one_use_case "$use_case"
      ;;
    talemia_business_intelligence)
      validate_one_use_case "$use_case"
      ;;
    all)
      while IFS= read -r enabled_use_case; do
        [[ -n "$enabled_use_case" ]] || continue
        validate_one_use_case "$enabled_use_case"
      done < <(manifest_enabled_use_cases)
      log_success "All currently supported use cases validated"
      ;;
    *)
      fail "Unknown use case requested: ${use_case}"
      ;;
  esac
}

main "$@"
