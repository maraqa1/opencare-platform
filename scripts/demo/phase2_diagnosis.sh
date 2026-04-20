#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

REPORT_DIR="${REPORT_DIR:-$ROOT_DIR/.state/demo-reports}"
REPORT_FILE="${REPORT_FILE:-$REPORT_DIR/phase2-diagnosis-$(date '+%Y%m%d-%H%M%S').md}"
SUMMARY_FILE="$ROOT_DIR/$DEMO_SEED_OUTPUT_DIR/opencare_demo_summary.json"

require_phase2_diagnosis_prereqs() {
  require_cmd kubectl
  require_cmd python3
}

ensure_demo_summary_file() {
  local should_regenerate="true"

  if [[ -f "$SUMMARY_FILE" ]]; then
    if python3 - "$SUMMARY_FILE" <<'PY'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as handle:
    payload = json.load(handle)

required = {"phase2_expected_alert_wards", "phase2_expected_alert_range"}
missing = [key for key in required if key not in payload]
if missing:
    raise SystemExit(1)
PY
    then
      should_regenerate="false"
    fi
  fi

  if [[ "$should_regenerate" == "true" ]]; then
    mkdir -p "$ROOT_DIR/$DEMO_SEED_OUTPUT_DIR"
    python3 "$ROOT_DIR/scripts/demo/generate_demo_data.py" --output-dir "$ROOT_DIR/$DEMO_SEED_OUTPUT_DIR" >/dev/null
  fi
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

sql_value() {
  local sql="$1"
  kubectl -n "$NAMESPACE" exec -i postgres-0 -- psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "$sql" | tr -d '[:space:]'
}

cronjob_status() {
  local name="$1"
  if kubectl -n "$NAMESPACE" get cronjob "$name" >/dev/null 2>&1; then
    printf 'present'
  else
    printf 'missing'
  fi
}

emit_report() {
  local expected_ward_count expected_alert_min expected_alert_max
  local forecast_expected_rows
  local raw_signal_rows fct_wards fct_rows
  local forecast_rows forecast_wards forecast_days forecast_run_timestamp
  local anomaly_rows anomaly_run_timestamp
  local airbyte_cron dbt_cron forecast_cron anomaly_cron
  local summary_json seeded_wards
  local proof_status
  local fence='```'

  expected_ward_count="$(summary_json_value "wards_row_count" | tr -d '[:space:]')"
  expected_alert_min="$(summary_json_value "phase2_expected_alert_range.min" | tr -d '[:space:]')"
  expected_alert_max="$(summary_json_value "phase2_expected_alert_range.max" | tr -d '[:space:]')"
  forecast_expected_rows=$(( expected_ward_count * FORECAST_HORIZON_DAYS ))

  raw_signal_rows="$(sql_value "select count(*) from ${DEMO_RAW_SCHEMA}.bed_events where scenario_tag = 'phase2_pressure_signal';")"
  fct_wards="$(sql_value "select count(distinct ward_id) from ${ANALYTICS_SCHEMA}.fct_bed_occupancy;")"
  fct_rows="$(sql_value "select count(*) from ${ANALYTICS_SCHEMA}.fct_bed_occupancy;")"
  forecast_rows="$(sql_value "select count(*) from ${OUTPUT_SCHEMA}.${FORECAST_OUTPUT_TABLE};")"
  forecast_wards="$(sql_value "select count(distinct ward_id) from ${OUTPUT_SCHEMA}.${FORECAST_OUTPUT_TABLE};")"
  forecast_days="$(sql_value "select count(distinct forecast_date) from ${OUTPUT_SCHEMA}.${FORECAST_OUTPUT_TABLE};")"
  forecast_run_timestamp="$(sql_value "select coalesce(max(run_timestamp)::text, 'null') from ${OUTPUT_SCHEMA}.${FORECAST_OUTPUT_TABLE};")"
  anomaly_rows="$(sql_value "select count(*) from ${OUTPUT_SCHEMA}.${ANOMALY_OUTPUT_TABLE};")"
  anomaly_run_timestamp="$(sql_value "select coalesce(max(run_timestamp)::text, 'null') from ${OUTPUT_SCHEMA}.${ANOMALY_OUTPUT_TABLE};")"

  airbyte_cron="$(cronjob_status airbyte-demo-sync)"
  dbt_cron="$(cronjob_status dbt-runner)"
  forecast_cron="$(cronjob_status bed-forecast-refresh)"
  anomaly_cron="$(cronjob_status anomaly-refresh)"

  seeded_wards="$(summary_json_value "phase2_expected_alert_wards")"
  summary_json="$(python3 - "$SUMMARY_FILE" <<'PY'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as handle:
    payload = json.load(handle)

print(json.dumps(payload, indent=2))
PY
)"
  proof_status="$(cat <<'EOF'
- Proves the current repo-controlled Phase 2 state from live VM data.
- Proves the current analytics input, runtime outputs, and CronJob objects exist.
- Does not re-run the full Airbyte -> dbt -> runtime loop by itself.
- Does not prove the accelerated repeat-cycle path by itself.
- Does not prove a literal 24-hour unattended soak.
EOF
)"

  mkdir -p "$REPORT_DIR"

  cat <<EOF | tee "$REPORT_FILE"
# OpenCare Phase 2 Report

## Status

- Repo commit: \`$(git -C "$ROOT_DIR" log --oneline -1 | sed 's/^ *//')\`
- Report generated at: \`$(date '+%Y-%m-%d %H:%M:%S')\`
- Summary file: \`$SUMMARY_FILE\`

## Phase 2 Contract

Phase 2 closes the analytics loop for the flagship workflow:

\`Airbyte -> dbt -> analytics -> runtimes -> output -> backend\`

## Proof Status

$proof_status

## Current Loop State

- phase2 pressure-signal rows in raw: \`$raw_signal_rows\`
- analytics.fct_bed_occupancy wards: \`$fct_wards\`
- analytics.fct_bed_occupancy rows: \`$fct_rows\`
- output.forecast rows: \`$forecast_rows\`
- output.forecast wards: \`$forecast_wards\`
- output.forecast days: \`$forecast_days\`
- output.forecast latest run_timestamp: \`$forecast_run_timestamp\`
- output.anomaly rows: \`$anomaly_rows\`
- output.anomaly latest run_timestamp: \`$anomaly_run_timestamp\`

## Expected Targets

- expected ward count: \`$expected_ward_count\`
- expected forecast rows: \`$forecast_expected_rows\`
- expected anomaly alert range: \`$expected_alert_min\` to \`$expected_alert_max\`
- expected anomaly wards:

${fence}text
$seeded_wards
${fence}

## Scheduled Loop Objects

- cronjob/airbyte-demo-sync: \`$airbyte_cron\`
- cronjob/dbt-runner: \`$dbt_cron\`
- cronjob/bed-forecast-refresh: \`$forecast_cron\`
- cronjob/anomaly-refresh: \`$anomaly_cron\`

## Seed Summary

${fence}json
$summary_json
${fence}

## Phase 2 Diagnosis

- The governed runtime input is the analytics layer, not raw landing tables.
- The forecast loop is healthy when row count, ward count, and day count all match the configured contract.
- The anomaly loop is healthy when the seeded pressure wards appear and the alert count stays in the tuned range.
- Scheduled loop presence is necessary but not the same as repeated successful execution.
- The repeat-cycle proof and real soak remain separate evidence layers on purpose.

## Follow-On Note

Use \`bash scripts/demo/validate_phase2_loop.sh\` for direct Phase 2 validation and \`bash scripts/demo/exercise_phase2_cycle.sh --cycles 3 --sleep-seconds 0\` for accelerated repeat-cycle proof.
EOF
}

main() {
  require_phase2_diagnosis_prereqs
  ensure_cluster_access
  ensure_demo_summary_file
  emit_report
  log_success "Phase 2 diagnosis report written to ${REPORT_FILE#"$ROOT_DIR"/}"
}

main "$@"
