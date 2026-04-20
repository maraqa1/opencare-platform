# OpenCare Phase 2 Diagnosis

## Executive Diagnosis

Phase 2 closes the analytics loop for the Bed Pressure Early Warning workflow.

The core question for this phase is not just whether dbt builds. It is whether the governed analytics chain can refresh repeatedly and leave behind credible, user-facing runtime outputs:

`Airbyte -> dbt -> analytics -> forecast/anomaly runtimes -> output -> backend`

## What Phase 2 Proves

Phase 2 is successful when the repo and VM agree on all of the following:

- `analytics.fct_bed_occupancy` remains the single curated runtime input
- `output.forecast` contains all wards across the configured forecast horizon
- `output.anomaly` contains the seeded pressure wards and stays in a credible alert band
- the scheduled loop exists through:
  - `cronjob/airbyte-demo-sync`
  - `cronjob/dbt-runner`
  - `cronjob/bed-forecast-refresh`
  - `cronjob/anomaly-refresh`
- the loop can be exercised repeatedly without manual repair

## Problems Phase 2 Needed To Solve

The main issues uncovered while closing the loop were:

- runtime outputs initially lived in the wrong place or could leave stale rows behind
- anomaly output quality depended on deterministic pressure seeding and explicit threshold control
- the scheduled loop needed a repo-controlled contract rather than manual reruns
- append-style raw landing tables required staging-layer dedupe instead of unrealistic raw-table uniqueness assumptions
- proof needed to distinguish between:
  - current live state
  - a single successful loop execution
  - repeated accelerated loop execution
  - a true 24-hour unattended soak

## Root Causes

The root causes were contract drift and proof ambiguity:

1. Output-table ownership was not fully explicit across runtime and backend layers.
2. Demo pressure signals were not guaranteed to be present unless the seed path was intentionally refreshed.
3. dbt validation originally assumed raw uniqueness that does not hold under repeated append-style syncs.
4. The repo needed a clearer separation between diagnosis scripts and proof scripts.

## Fix Pattern That Emerged

The fixes that stabilized Phase 2 followed the same product discipline as Phase 1:

- keep one source of truth for runtime and dbt config
- seed the pressure scenario deterministically
- read from curated analytics only
- write to output only
- validate with runnable scripts, not narrative claims
- distinguish clearly between:
  - live-state diagnosis
  - single-pass validation
  - accelerated repeat-cycle validation
  - real soak observation

## What Is Proven Vs Not Proven

Proven by automation when the scripts are green:

- current live Phase 2 state on the VM
- output table population and row-count expectations
- seeded pressure wards present in anomaly output
- scheduled loop objects exist
- accelerated repeat-cycle reruns succeed without manual repair

Not proven by automation alone:

- a literal 24-hour unattended soak
- long-window CronJob behavior under real elapsed time
- operator handling of intermittent cluster or network faults over a full day

## Runnable Report

To generate a current Phase 2 diagnosis report from the VM, run:

```bash
bash scripts/demo/phase2_diagnosis.sh
```

To prove the Phase 2 loop directly, use:

```bash
bash scripts/demo/validate_phase2_loop.sh
bash scripts/demo/exercise_phase2_cycle.sh --cycles 3 --sleep-seconds 0
```
