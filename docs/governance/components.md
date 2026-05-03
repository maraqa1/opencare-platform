# Governance component inventory

## Design rule
The governance surface should be split by route purpose, not by piling more tabs into one page.

## Components to build or extract

### `KpiSearchEntry`
- Route: `/governance`
- Purpose: search-first KPI entry page
- Replaces: current discovery/search controls embedded in `GovernanceControlTower.tsx`
- Props:
  - `kpis`
  - `recentKpis`
  - `suggestedGroups`
  - `onSelectKpi`
- States:
  - loading
  - empty
  - error
- A11y:
  - keyboard focus on search input
  - results list must be arrow/Enter accessible

### `KpiTrustHero`
- Route: `/governance/kpi/:slug`
- Purpose: headline KPI plus single trust badge
- Replaces: top-level governance summary framing on the current page
- Props:
  - `kpiName`
  - `value`
  - `periodLabel`
  - `delta`
  - `trustStatus`
  - `attestationLabel`
- States:
  - trusted
  - degraded
  - untrusted
  - unmapped
- A11y:
  - trust status announced clearly in heading region

### `KpiTrustJourney`
- Route: `/governance/kpi/:slug`
- Purpose: hero Business Trust Map with inline trust signals
- Replaces: multi-region trust-map + tabbed lineage treatment in `GovernanceControlTower.tsx`
- Props:
  - `stages`
  - `selectedStageId`
  - `onSelectStage`
  - `trustStatus`
- States:
  - trusted
  - degraded
  - untrusted
  - unmapped
  - loading skeleton
  - error
- A11y:
  - each stage announced as ordered step with status
  - keyboard navigable

### `StageDetailPopover`
- Route context: KPI trust page
- Purpose: lightweight stage detail without introducing a second equal-weight surface
- Replaces: heavy inline detail blocks and redundant asset-detail tabs
- Props:
  - `stage`
  - `isOpen`
  - `onClose`
- States:
  - open
  - closed
  - missing instrumentation
- A11y:
  - dialog/popover semantics
  - Escape closes

### `TrustBadge`
- Route context: KPI page, asset page, health page
- Purpose: three-state trust indicator
- States:
  - trusted
  - degraded
  - untrusted
  - optional unmapped state if needed
- Notes:
  - this should become the single semantic trust-state component

### `SignalChip`
- Route context: KPI journey and asset detail
- Purpose: small inline trust signal
- Signal types:
  - freshness
  - owner
  - tests
  - SLA
  - compliance
  - attestation
- States:
  - healthy
  - warning
  - issue
  - not instrumented

### `AssetDetailPanel`
- Route: `/governance/asset/:id`
- Purpose: single source of truth for asset detail
- Replaces:
  - persistent trust drawer
  - duplicated asset tabs/detail blocks on governance page
- Props:
  - `asset`
  - `lineage`
  - `freshness`
  - `quality`
  - `impact`
  - `compliance`
- States:
  - loading
  - empty
  - error
- A11y:
  - clear heading and section landmarks

### `GovernanceHealthOverview`
- Route: `/governance/health`
- Purpose: governance posture rollup
- Replaces: top summary metrics strip on current governance page

## Existing files to reuse as-is

### Backend lineage truth
- `apps/backend/app/routes/lineage.py`
- `apps/backend/app/services/lineage_service.py`
- Reason:
  - strongest current real signal source
  - should remain the technical truth layer

### Technical lineage renderer
- `apps/portal/components/LineageDAG.tsx`
- New role:
  - body of `/governance/kpi/:slug/trace`
  - also usable in `/governance/asset/:id`

### Existing dictionary destination
- `apps/backend/app/routes/dictionary.py`
- `apps/portal/app/dictionary/page.tsx`
- Reason:
  - glossary already has a home
  - governance should link to it rather than duplicate it

## Existing files to refactor

### `apps/portal/components/GovernanceControlTower.tsx`
- Current role:
  - overloaded all-in-one control tower
- Future role:
  - should be broken apart or retired in favor of route-specific components
- Why:
  - currently mixes discovery, story, proof, glossary, compliance, asset detail, and stewardship tooling

### `apps/portal/lib/governance-registry.ts`
- Current role:
  - curated governance metadata and business trust-map content
- Future role:
  - remain curated metadata source for:
    - KPI-to-journey mapping
    - owner/steward labels
    - glossary links
    - business trust-map stages
    - curated asset metadata
- Requirement:
  - curated signals must remain distinguishable from discovered/backend signals

### `apps/portal/components/SourceFreshness.tsx`
- Current role:
  - standalone freshness panel
- Future role:
  - extract or reuse its data path for inline freshness signals and asset detail

### `apps/portal/components/DataQualitySummary.tsx`
- Current role:
  - standalone quality summary card
- Future role:
  - proof/detail content on asset or trace routes
- Warning:
  - current presentation should be audited so it does not overstate test health

### `apps/portal/components/ComplianceSummary.tsx`
- Current role:
  - standalone compliance card
- Future role:
  - demoted evidence section on asset detail or small KPI-page indicator

### `apps/portal/components/ImpactAnalysis.tsx`
- Current role:
  - standalone impact panel
- Future role:
  - steward-facing detail on `/governance/asset/:id`

## Existing files to delete or retire

### `apps/portal/components/GovernanceView.tsx`
- Reason:
  - legacy stack-of-cards governance composition
  - reinforces console behavior

## Existing UI patterns to hide or remove from the KPI trust page
- top summary metrics strip
- persistent use-case selector chrome
- glossary tab
- compliance as a peer surface
- technical lineage as a peer surface
- duplicate asset-detail drawer / inline detail duplication
- wide multi-tab equal-weight control tower structure

## Route-level mapping

### `/governance`
- Components:
  - `KpiSearchEntry`

### `/governance/kpi/:slug`
- Components:
  - `KpiTrustHero`
  - `KpiTrustJourney`
  - `TrustBadge`
  - `SignalChip`
  - `StageDetailPopover`

### `/governance/kpi/:slug/trace`
- Components:
  - `LineageDAG`
  - reused proof/detail sections from freshness, quality, impact as needed

### `/governance/asset/:id`
- Components:
  - `AssetDetailPanel`
  - `LineageDAG`
  - reused detail sections from freshness, quality, impact, compliance

### `/governance/health`
- Components:
  - `GovernanceHealthOverview`

## Current unresolved dependency
The KPI entry route needs a real KPI list source. Smallest viable first source:
- curated KPI metadata in `governance-registry.ts`

This is acceptable for the first pass as long as:
- it is clearly curated
- it does not claim discovered completeness
