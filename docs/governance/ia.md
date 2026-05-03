# Governance IA plan

## Design stance
Governance is a product surface, not an admin console. Its primary job is to answer one question:

> Can I trust this number, and how do I know?

The governance experience should separate:
- the curated business story
- the technical proof
- the stewardship and health tooling

## Two-layer lineage model

### Business Trust Map
- Source: curated metadata in `apps/portal/lib/governance-registry.ts`
- Purpose: the executive story
- Placement: hero experience on the KPI trust page
- Requirement: always labeled honestly as curated product-layer lineage

### Technical lineage
- Source: real backend/dbt lineage from `apps/backend/app/services/lineage_service.py`
- Purpose: the proof layer
- Placement: one click away from the KPI trust journey

These layers must not share one equal-weight canvas.

## Proposed route structure

### `/governance`
- Purpose: KPI search and entry
- Primary persona: executive or operator
- Why: the user should enter governance by selecting a KPI, not by landing on a multi-panel admin surface

### `/governance/kpi/:slug`
- Purpose: KPI trust journey hero page
- Primary persona: executive or operator
- Why: this is the flagship trust experience and should be the default destination once a KPI is chosen

### `/governance/kpi/:slug/trace`
- Purpose: technical proof view for the KPI
- Primary persona: analytics engineer or data steward
- Why: keeps technical lineage available but secondary, using the existing `LineageDAG`

### `/governance/asset/:id`
- Purpose: technical asset detail
- Primary persona: data steward or analytics engineer
- Why: asset inspection, tests, freshness, lineage, and classification belong on a deep view, not the KPI hero page

### `/governance/health`
- Purpose: governance posture and program-health rollups
- Primary persona: governance lead, steward, engineering admin
- Why: summary metrics measure the governance program, not the trustworthiness of one KPI

### `/admin/governance`
- Purpose: legacy entrypoint
- Behavior: redirect to `/governance/health`
- Why: the flagship governance experience should not live under an admin path

## Routes deliberately not added

### No `/governance/glossary`
- Existing `/dictionary` already serves glossary/dictionary use cases.
- Governance should link to that route contextually rather than duplicate it.

### No `/governance/compliance`
- Current compliance data is mixed and partly curated.
- A first-class compliance route would overclaim maturity.
- Compliance should be contextual on the KPI page and richer only on asset detail until stronger evidence exists.

## Page hierarchy

### 1. `/governance` as the front door
- KPI search
- recently viewed KPIs
- suggested KPIs by use case
- small link to governance health

This is where use-case selection lives as discovery content, not as persistent chrome.

### 2. `/governance/kpi/:slug` as the flagship page
This page should have one unmistakable hero:
- KPI hero
- Business Trust Map journey
- inline trust signals along the journey
- one clear affordance to the technical trace

The KPI page should not include:
- summary metric strip
- glossary as a peer section
- compliance panel
- asset registry tab set
- technical lineage as a peer region
- persistent use-case selector

### 3. `/governance/kpi/:slug/trace` as the proof view
- full technical lineage via `LineageDAG`
- source freshness
- test coverage
- impact analysis

This is a deep proof route, not a side drawer.

### 4. `/governance/asset/:id` as the steward detail view
- asset metadata
- tests and freshness
- upstream/downstream lineage
- classification
- owner/steward
- compliance evidence when real
- impact analysis

### 5. `/governance/health` as the governance program page
- summary metrics
- coverage and posture rollups
- stewardship gaps
- curated vs discovered coverage where relevant

## What belongs on the KPI trust page

### Keep
- KPI hero
- Business Trust Map
- inline signals:
  - freshness
  - test coverage
  - owner
  - SLA where instrumented
  - one compliance indicator
  - attestation / review date where available
- single action:
  - `See technical trace`

### Move off the KPI page
- summary metric strip → `/governance/health`
- discovery search/filter controls → `/governance`
- persistent use-case selector → `/governance`
- glossary → `/dictionary`
- technical lineage panel → `/governance/kpi/:slug/trace`
- asset detail drawer / duplicate tabs → `/governance/asset/:id`
- impact analysis → `/governance/asset/:id`
- compliance detail panel → asset detail or later evidence surface

## Main navigation flow

### Executive / operator flow
`/governance`
→ search/select KPI
→ `/governance/kpi/:slug`
→ optionally:
- `See technical trace` → `/governance/kpi/:slug/trace`
- click an asset/stage → `/governance/asset/:id`
- click a term → `/dictionary`

### Steward / engineer flow
`/governance/health`
→ inspect flagged coverage/posture issue
→ `/governance/asset/:id`
→ optionally:
- `/governance/kpi/:slug/trace`

## Deep links that must work
- `/governance/kpi/:slug`
- `/governance/kpi/:slug/trace`
- `/governance/asset/:id`
- `/governance/health`

These should work directly without requiring prior navigation.

## Honesty principle
Every signal must be clearly one of:
- real/discovered
- curated
- not yet instrumented

The KPI trust badge should only show `Trusted` when:
- curated metadata is complete enough to tell the story
- and real backend trust signals are healthy

If either side is incomplete or degraded, the badge should degrade honestly.

## Open IA decision
If some KPIs do not yet have a curated Business Trust Map:
- show an explicit unmapped state on `/governance/kpi/:slug`
- do not silently replace the hero with technical lineage

Recommended unmapped behavior:
- message that the business trust journey is not yet mapped
- clear action to `See technical trace`
- stewardship path from `/governance/health` to close the mapping gap
