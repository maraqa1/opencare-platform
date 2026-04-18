# Phase 2 Analytics Loop

## What Changed

Phase 2 closes the analytics loop for the Bed Pressure Early Warning workflow:

- Airbyte demo sync is scheduled hourly through `CronJob/airbyte-demo-sync`
- dbt is scheduled after Airbyte through `CronJob/dbt-runner`
- forecast and anomaly runtimes are scheduled after dbt through:
  - `CronJob/bed-forecast-refresh`
  - `CronJob/anomaly-refresh`
- forecast reads `analytics.fct_bed_occupancy` and writes `output.forecast`
- anomaly reads `analytics.fct_bed_occupancy` and writes `output.anomaly`
- demo data now seeds a deliberate recent pressure scenario for stable anomaly proofing
- runtime thresholds and forecast horizon/lookback are driven from the shared env/config contract

## Manual Validation

Run the repo-controlled loop:

```bash
bash scripts/airbyte/test_demo_sync.sh --sync-only
bash scripts/dbt/apply_dbt.sh
bash scripts/runtime/apply_runtimes.sh
bash scripts/demo/validate_phase2_loop.sh
```

Expected outcome:

- `analytics.fct_bed_occupancy` contains all demo wards
- `output.forecast` contains all wards across the configured horizon
- `output.anomaly` contains the tuned alert set for the seeded pressure wards

## Accelerated Repeat-Cycle Validation

To exercise the scheduled loop repeatedly without claiming a literal 24-hour soak:

```bash
bash scripts/demo/exercise_phase2_cycle.sh --cycles 3 --sleep-seconds 0
```

This proves that the Airbyte -> dbt -> runtime path can be rerun repeatedly without manual repair and that the validation checks stay green after each cycle.

## Real 24-Hour Soak Checklist

Not yet proven by automation alone:

- uninterrupted hourly execution over a full 24-hour period
- operator review of CronJob history across the soak window
- confirmation that no stale output or scheduling drift appears under live elapsed time

Operator checklist for a real soak:

1. Apply the repo and confirm all four CronJobs exist.
2. Capture the initial validation with `bash scripts/demo/validate_phase2_loop.sh`.
3. Observe at least 24 hours of:
   - `cronjob/airbyte-demo-sync`
   - `cronjob/dbt-runner`
   - `cronjob/bed-forecast-refresh`
   - `cronjob/anomaly-refresh`
4. Confirm successive job completions and inspect failures immediately.
5. Re-run `bash scripts/demo/validate_phase2_loop.sh` at the end of the soak.
6. Record final counts, latest `generated_at` values, and any job retries for the admin-status follow-on work.
