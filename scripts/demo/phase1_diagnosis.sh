#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=install/helpers.sh
source "$ROOT_DIR/install/helpers.sh"

REPORT_DIR="${REPORT_DIR:-$ROOT_DIR/.state/demo-reports}"
REPORT_FILE="${REPORT_FILE:-$REPORT_DIR/phase1-diagnosis-$(date '+%Y%m%d-%H%M%S').md}"

require_phase1_diagnosis_prereqs() {
  require_cmd kubectl
  require_cmd python3
}

ensure_demo_summary_file() {
  local summary_file="$ROOT_DIR/$DEMO_SEED_OUTPUT_DIR/opencare_demo_summary.json"

  if [[ -f "$summary_file" ]]; then
    return 0
  fi

  mkdir -p "$ROOT_DIR/$DEMO_SEED_OUTPUT_DIR"
  python3 "$ROOT_DIR/scripts/demo/generate_demo_data.py" --output-dir "$ROOT_DIR/$DEMO_SEED_OUTPUT_DIR" >/dev/null
}

sql_value() {
  local sql="$1"
  kubectl -n "$NAMESPACE" exec -i postgres-0 -- psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "$sql" | tr -d '[:space:]'
}

emit_report() {
  local raw_wards raw_patients raw_bed_events
  local dim_ward dim_date fct_bed_occupancy dict_metrics
  local min_date max_date pressure_days
  local generated_range
  local summary_file="$ROOT_DIR/$DEMO_SEED_OUTPUT_DIR/opencare_demo_summary.json"

  raw_wards="$(sql_value "select count(*) from ${DEMO_RAW_SCHEMA}.wards;")"
  raw_patients="$(sql_value "select count(*) from ${DEMO_RAW_SCHEMA}.patients;")"
  raw_bed_events="$(sql_value "select count(*) from ${DEMO_RAW_SCHEMA}.bed_events;")"
  dim_ward="$(sql_value "select count(*) from ${ANALYTICS_SCHEMA}.dim_ward;")"
  dim_date="$(sql_value "select count(*) from ${ANALYTICS_SCHEMA}.dim_date;")"
  fct_bed_occupancy="$(sql_value "select count(*) from ${ANALYTICS_SCHEMA}.fct_bed_occupancy;")"
  dict_metrics="$(sql_value "select count(*) from ${DICTIONARY_SCHEMA}.dict_metrics;")"
  min_date="$(sql_value "select min(date_day)::text from ${ANALYTICS_SCHEMA}.dim_date;")"
  max_date="$(sql_value "select max(date_day)::text from ${ANALYTICS_SCHEMA}.dim_date;")"
  pressure_days="$(sql_value "select count(*) from ${ANALYTICS_SCHEMA}.fct_bed_occupancy where pressure_flag is true;")"
  generated_range="$(sql_value "select min(generated_at)::text || '|' || max(generated_at)::text from ${ANALYTICS_SCHEMA}.fct_bed_occupancy;")"

  mkdir -p "$REPORT_DIR"

  cat <<EOF | tee "$REPORT_FILE"
# OpenCare Phase 1 Report

## Status

- Repo commit: \`$(git -C "$ROOT_DIR" log --oneline -1 | sed 's/^ *//')\`
- Report generated at: \`$(date '+%Y-%m-%d %H:%M:%S')\`
- Summary file: \`$summary_file\`

## Phase 1 Contract

Phase 1 proves the flagship ingest and transform chain:

\`MySQL source -> Airbyte -> raw -> dbt -> analytics/dictionary\`

## Current Counts

- raw.wards: \`$raw_wards\`
- raw.patients: \`$raw_patients\`
- raw.bed_events: \`$raw_bed_events\`
- analytics.dim_ward: \`$dim_ward\`
- analytics.dim_date: \`$dim_date\`
- analytics.fct_bed_occupancy: \`$fct_bed_occupancy\`
- dictionary.dict_metrics: \`$dict_metrics\`
- analytics.dim_date range: \`$min_date\` to \`$max_date\`
- pressure days: \`$pressure_days\`
- generated_at span in analytics.fct_bed_occupancy: \`$generated_range\`

## Seed Summary

```json
$(cat "$summary_file")
```

## Phase 1 Diagnosis

- The demo source is deterministic and repeatable.
- Airbyte can land the source into Postgres raw tables.
- dbt can build the governed analytics and dictionary layer from that raw landing zone.
- The Phase 1 success criteria are met when the repo and VM agree on the counts above and the install path stays repeatable.
- The main lessons are configuration discipline, staging dedupe, and keeping governed analytics logic in dbt.

## Follow-On Note

The runtime forecast and anomaly loop is Phase 2 work. This report intentionally stops at the Phase 1 boundary.
EOF
}

main() {
  require_phase1_diagnosis_prereqs
  ensure_cluster_access
  ensure_demo_summary_file
  emit_report
  log_success "Phase 1 diagnosis report written to ${REPORT_FILE#"$ROOT_DIR"/}"
}

main "$@"
