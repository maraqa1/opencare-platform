# Governance discovery

## Current primary route
- `apps/portal/app/admin/governance/page.tsx`
  - Current governance entry point.
  - Wraps `GovernanceControlTower` in `PageFrame`.
  - Still framed as an admin control-tower page rather than a KPI-first trust journey.

## Current primary frontend component
- `apps/portal/components/GovernanceControlTower.tsx`
  - Large client component driving the full governance experience.
  - Currently mixes summary metrics, search/filter controls, use-case selection, business trust map, technical lineage, glossary, quality, compliance, and asset-level detail.
  - This is the main source of information-architecture overload.

## Current frontend governance metadata source
- `apps/portal/lib/governance-registry.ts`
  - Current curated metadata source for governance.
  - Holds use cases, governed datasets, columns, glossary terms, certification display state, compliance rows, quality dimensions, classification rules, and business trust-map nodes/edges.
  - This is a curated product metadata layer, not an auto-discovered governance catalog.

## Current backend lineage and trust signal sources
- `apps/backend/app/routes/lineage.py`
  - Real backend lineage API.
  - Exposes model lineage, upstream/downstream, impact analysis, freshness, quality, and compliance summaries.
- `apps/backend/app/services/lineage_service.py`
  - Reads dbt manifest and model metadata.
  - Computes real technical lineage, source freshness, dbt-based quality coverage, impact analysis, and a shallow compliance summary.

## Current technical lineage frontend
- `apps/portal/components/LineageDAG.tsx`
  - Technical lineage renderer backed by `/api/portal/api/v1/lineage/models/{model}`.
  - This is the strongest current proof layer and should remain the technical truth surface.

## Current adjacent governance-related frontend surfaces
- `apps/portal/components/GovernanceView.tsx`
  - Legacy governance composition that stacks `LineageDAG`, `SourceFreshness`, `ImpactAnalysis`, `DataQualitySummary`, and `ComplianceSummary`.
  - Represents an earlier console-style governance pattern.
- `apps/portal/components/DataQualitySummary.tsx`
  - Fetches real dbt quality summary from `/api/portal/api/v1/lineage/quality`.
  - Reusable data source, but current presentation is optimistic and summary-card oriented.
- `apps/portal/components/SourceFreshness.tsx`
  - Fetches real source freshness from `/api/portal/api/v1/lineage/freshness`.
  - Reusable data source for inline trust signals and deeper asset inspection.
- `apps/portal/components/ImpactAnalysis.tsx`
  - Fetches real impact analysis from `/api/portal/api/v1/lineage/impact/{source}`.
  - Valuable for stewards and engineers, not for the flagship KPI trust story.
- `apps/portal/components/ComplianceSummary.tsx`
  - Fetches backend compliance summary from `/api/portal/api/v1/lineage/compliance`.
  - Data exists, but the current experience is broad and should not be promoted as strong evidence without deeper instrumentation.

## Current glossary and dictionary surfaces
- `apps/backend/app/routes/dictionary.py`
  - Backend dictionary route.
  - Reads `dict_metrics` when available and falls back to an in-file metric catalog.
- `dbt/opencare/models/dictionary/dict_metrics.sql`
  - dbt-backed metric dictionary model.
- `apps/portal/app/dictionary/page.tsx`
  - Existing dictionary surface.
- `apps/portal/app/admin/dictionary-management/page.tsx`
  - Existing admin dictionary-management surface.

## Current documentation
- `docs/phase4b-governance-trust-layer.md`
  - Existing governance/trust-layer documentation.

## Real data sources by signal

### Technical lineage
- Source: `apps/backend/app/services/lineage_service.py`
- Confidence: real
- Notes: strongest current trust-proof source

### Freshness
- Source: `lineage_service.py` freshness endpoint
- Consumer: `SourceFreshness.tsx`
- Confidence: real

### Quality / test coverage
- Source: `lineage_service.py` quality endpoint
- Consumer: `DataQualitySummary.tsx`
- Confidence: real but shallow

### Impact analysis
- Source: `lineage_service.py` impact endpoint
- Consumer: `ImpactAnalysis.tsx`
- Confidence: real

### Compliance
- Source: mixed
  - backend compliance summary from `lineage_service.py`
  - curated policy rows in `governance-registry.ts`
- Confidence: mixed
- Gap: no strong evidence-backed attestation source yet
- Smallest viable future source: structured metadata table or dbt-owned governance manifest for evidence links and review dates

### Ownership / stewardship
- Source: `governance-registry.ts`
- Confidence: curated
- Gap: no verified backend source of truth
- Smallest viable future source: metadata table keyed by governed asset or KPI slug

### Certification
- Source: `governance-registry.ts`
- Confidence: curated
- Gap: no workflow-backed source yet
- Smallest viable future source: metadata table keyed by asset with status, reviewer, and reviewed date

### Sensitivity classification / column inventory
- Source: `governance-registry.ts`
- Confidence: curated
- Gap: not discovered from warehouse/catalog today
- Smallest viable future source: dbt column meta or governance metadata table

### Business Trust Map
- Source: `governance-registry.ts`
- Confidence: curated
- Gap: not auto-derived and must be labeled honestly
- Smallest viable future source: keep registry-backed for now, with explicit `curated` labeling

## Reuse / refactor / delete recommendations

### Reuse as-is
- `apps/backend/app/routes/lineage.py`
- `apps/backend/app/services/lineage_service.py`
- `apps/portal/components/LineageDAG.tsx`
- `apps/backend/app/routes/dictionary.py`
- `apps/portal/app/dictionary/page.tsx`

### Reuse with reframing
- `apps/portal/components/SourceFreshness.tsx`
  - Reuse data source, reduce prominence, and expose freshness inline on KPI journey and asset detail.
- `apps/portal/components/DataQualitySummary.tsx`
  - Reuse data source, but treat as proof/detail, not a KPI-page hero panel.
- `apps/portal/components/ComplianceSummary.tsx`
  - Demote to a secondary evidence/detail surface rather than a peer section on the hero page.
- `apps/portal/lib/governance-registry.ts`
  - Keep as curated metadata source and business trust-map layer.

### Must refactor
- `apps/portal/components/GovernanceControlTower.tsx`
  - Current all-in-one control tower should be split by route purpose.

### Delete or retire
- `apps/portal/components/GovernanceView.tsx`
  - Legacy stack-of-cards composition that reinforces console behavior.

## Current design problem
The current governance experience combines:
- a curated business story
- real technical lineage proof
- admin stewardship surfaces
- glossary content
- compliance summaries
- asset inspection

These currently compete on one page. The result is a metadata console rather than a flagship KPI trust experience.

## Discovery conclusion
There are two lineage layers and they should not share one primary canvas:
- Business Trust Map is the story.
- Technical dbt lineage is the proof.

The next IA should elevate the curated Business Trust Map into the hero KPI trust experience and move technical lineage, glossary, compliance detail, and stewardship tooling into adjacent deep-linkable surfaces.
