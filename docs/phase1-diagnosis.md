# OpenCare Phase 1 Diagnosis

## Executive Diagnosis

Phase 1 was the right first milestone, and the core workflow did become real:

- deterministic demo source data can be generated
- Airbyte can ingest the demo MySQL source into Postgres
- dbt can build the analytics and dictionary layer from that raw landing zone
- the backend can serve live occupancy, forecast, anomaly, and metadata responses

The main diagnosis is that Phase 1 was not just "ingest works". It was a data-contract problem:

- the demo source and the dbt source schema needed to stay aligned
- runtime consumers needed to read governed outputs rather than stale or scaffolded values
- the install path needed to remain idempotent and repeatable instead of drifting between manual fixes and repo state

## What Phase 1 Proved

Phase 1 proved the end-to-end provenance chain for the flagship use case:

`MySQL source -> Airbyte -> raw -> dbt -> analytics/dictionary -> backend API`

That chain validated the platform's core promise:

- a repeatable ingestion path
- governed analytics logic in dbt
- a stable backend API surface
- a demoable bed-occupancy dataset with enough scale to be believable

The synthetic dataset was intentionally sized and shaped to support the workflow:

- 12 wards
- 2,400 patients
- 18 months of history
- 12,363 bed events
- deliberate pressure patterns in the source data

## Problems Discovered

The practical issues that surfaced during Phase 1 were:

- raw and analytics state could drift when dbt source configuration fell back to the wrong schema
- stale runtime output could remain visible after a zero-result run if the output table was not explicitly cleared
- backend endpoints needed to read from the governed runtime output contract rather than old placeholder assumptions
- repeated demo syncs exposed the difference between append-only landing tables and the uniqueness expectations in early dbt tests

These were not separate product failures. They were all symptoms of the same root issue: the data contract was not yet treated as a single source of truth across install, dbt, runtime, and API layers.

## Root Causes

The diagnosis from the Phase 1 work was:

1. Configuration drift was possible because schema defaults lived in more than one place.
2. dbt source and staging expectations were too optimistic for the demo's repeatable append-based ingest pattern.
3. Runtime outputs needed explicit cleanup behavior for empty results.
4. Backend readers needed to be aligned to the actual runtime output contract, not the earlier analytics scaffolding.

## Fix Pattern That Emerged

The fixes that made the platform stable were all contract-based:

- keep demo source generation deterministic
- keep the repo as the source of truth for config
- align dbt source schema defaults with the demo landing schema
- dedupe at the staging layer instead of asserting impossible source uniqueness
- make runtime writes explicit and idempotent
- make backend reads follow the output schema contract

That pattern is the key Phase 1 lesson. The platform becomes credible when the contract is explicit and repeated everywhere, not when individual components are hand-repaired.

## Phase 1 Outcome

Phase 1 should be considered complete for the core product loop once the repo and VM agree on:

- Airbyte demo ingestion works
- dbt builds the 12-ward analytics model set
- the backend serves live data
- the install path is repeatable

What remained after that was not a Phase 1 failure. It was the natural next milestone:

- close the analytics loop
- schedule the pipeline
- produce runtime outputs as first-class product artifacts

## What To Carry Forward

The strongest Phase 1 lessons for later phases are:

- one source of truth for config
- validate from the repo, not from a one-off shell fix
- make runtime behavior noisy and observable
- treat demo data seeding as part of the product contract
- keep dbt as the governed analytics authoring layer

Those are the habits that kept Phase 2 from becoming another pile of special cases.

## Runnable Report

To generate a current Phase 1 report from the VM, run:

```bash
bash scripts/demo/phase1_diagnosis.sh
```

The script writes a markdown report to `.state/demo-reports/` and prints the same report to stdout.
