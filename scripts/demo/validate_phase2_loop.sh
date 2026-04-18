#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

SUMMARY_FILE="$ROOT_DIR/$DEMO_SEED_OUTPUT_DIR/opencare_demo_summary.json"

require_phase2_validation_prereqs() {
  require_cmd kubectl
  require_cmd python3
}

ensure_demo_summary_file() {
  if [[ -f "$SUMMARY_FILE" ]]; then
    return 0
  fi

  mkdir -p "$ROOT_DIR/$DEMO_SEED_OUTPUT_DIR"
  python3 "$ROOT_DIR/scripts/demo/generate_demo_data.py" --output-dir "$ROOT_DIR/$DEMO_SEED_OUTPUT_DIR" >/dev/null
}

summary_json_value() {
  local expression="$1"
  python3 - "$SUMMARY_FILE" "$expression" <<'PY'
import json
import sys

summary_path, expression = sys.argv[1], sys.argv[2]
with open(summary_path, "r", encoding="utf-8") as handle:
    payload = json.load(handle)

value = payload
for part in expression.split("."):
    if not part:
        continue
    if isinstance(value, list):
        value = value[int(part)]
    else:
        value = value[part]

if isinstance(value, list):
    print("\n".join(str(item) for item in value))
else:
    print(value)
PY
}

check_postgres_equals() {
  local sql="$1"
  local expected="$2"
  local actual

  actual="$(kubectl -n "$NAMESPACE" exec -i postgres-0 -- psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "$sql" | tr -d '[:space:]')"
  [[ "$actual" == "$expected" ]] || fail "Unexpected SQL result for [$sql]. Expected [$expected], got [$actual]"
}

check_postgres_between() {
  local sql="$1"
  local min_value="$2"
  local max_value="$3"
  local actual

  actual="$(kubectl -n "$NAMESPACE" exec -i postgres-0 -- psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "$sql" | tr -d '[:space:]')"
  [[ "$actual" =~ ^[0-9]+$ ]] || fail "Non-numeric SQL result for [$sql]: [$actual]"
  (( actual >= min_value && actual <= max_value )) || fail "Expected [$sql] to be between ${min_value} and ${max_value}, got ${actual}"
}

check_postgres_greater_than_zero() {
  local sql="$1"
  local actual

  actual="$(kubectl -n "$NAMESPACE" exec -i postgres-0 -- psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "$sql" | tr -d '[:space:]')"
  [[ "$actual" =~ ^[0-9]+$ ]] || fail "Non-numeric SQL result for [$sql]: [$actual]"
  (( actual > 0 )) || fail "Expected result greater than zero for [$sql], got [$actual]"
}

validate_phase2_loop() {
  local expected_ward_count
  local forecast_expected_rows
  local expected_alert_min
  local expected_alert_max
  local seeded_ward
  local seeded_wards=()

  expected_ward_count="$(summary_json_value "wards_row_count" | tr -d '[:space:]')"
  expected_alert_min="$(summary_json_value "phase2_expected_alert_range.min" | tr -d '[:space:]')"
  expected_alert_max="$(summary_json_value "phase2_expected_alert_range.max" | tr -d '[:space:]')"
  forecast_expected_rows=$(( expected_ward_count * FORECAST_HORIZON_DAYS ))

  while IFS= read -r seeded_ward; do
    [[ -n "$seeded_ward" ]] || continue
    seeded_wards+=("$seeded_ward")
  done < <(summary_json_value "phase2_expected_alert_wards")

  log "Validating Phase 2 analytics loop"
  check_postgres_greater_than_zero "select count(*) from ${DEMO_RAW_SCHEMA}.bed_events where scenario_tag = 'phase2_pressure_signal';"
  check_postgres_equals "select count(distinct ward_id) from ${ANALYTICS_SCHEMA}.fct_bed_occupancy;" "$expected_ward_count"
  check_postgres_greater_than_zero "select count(*) from ${ANALYTICS_SCHEMA}.fct_bed_occupancy;"

  check_postgres_equals "select count(distinct department_id) from ${OUTPUT_SCHEMA}.${FORECAST_OUTPUT_TABLE};" "$expected_ward_count"
  check_postgres_equals "select count(distinct forecast_date) from ${OUTPUT_SCHEMA}.${FORECAST_OUTPUT_TABLE};" "$FORECAST_HORIZON_DAYS"
  check_postgres_equals "select count(*) from ${OUTPUT_SCHEMA}.${FORECAST_OUTPUT_TABLE};" "$forecast_expected_rows"

  check_postgres_between "select count(*) from ${OUTPUT_SCHEMA}.${ANOMALY_OUTPUT_TABLE};" "$expected_alert_min" "$expected_alert_max"
  for seeded_ward in "${seeded_wards[@]}"; do
    check_postgres_greater_than_zero "select count(*) from ${OUTPUT_SCHEMA}.${ANOMALY_OUTPUT_TABLE} where department_id = '${seeded_ward}';"
  done

  kubectl -n "$NAMESPACE" get cronjob airbyte-demo-sync dbt-runner bed-forecast-refresh anomaly-refresh >/dev/null
  log_success "Phase 2 analytics loop validated"
}

main() {
  require_phase2_validation_prereqs
  ensure_cluster_access
  ensure_demo_summary_file
  validate_phase2_loop
}

main "$@"
