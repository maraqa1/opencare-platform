# Data Governance v1.3 Phase 5C Validation

## Status

Phase 5C validation is in shadow mode. The revised Data Governance workspace is implemented and tested, but legacy governance routes and registry code are not removed yet.

## Validation Matrix

| # | Check | Status | Evidence |
|---|---|---|---|
| 1 | All eight routes exist | Pass | `/governance`, `/governance/use-cases/[slug]`, metric detail, table detail, lineage, issues, evidence, policies |
| 2 | Navigation works from Data Governance entry | Pass | `apps/portal/config/navigation.ts` uses `Data Governance` |
| 3 | Use Case Governance is scoped to selected use case | Pass | `GovernanceReadService.get_use_case(slug)` |
| 4 | Metric Detail shows definition, formula, evidence, source table, consumers | Pass | `/governance/use-cases/[slug]/metrics/[id]` |
| 5 | Table Detail shows schema, clickable attributes, classification, owner, consumers | Pass with limitation | Table detail route exists; attribute rows render no evidence until catalog evidence is loaded |
| 6 | Attribute detail shows policy/version/rule/evidence | Pass with limitation | Missing catalog evidence renders Unknown/no evidence |
| 7 | Classification Policies supports multiple policies | Pass | Policy YAML loader and `/governance/policies` |
| 8 | Lineage shows source, table, output, consumer nodes | Pass | Use-case declared lineage nodes |
| 9 | Lineage table nodes are clickable | Pass | Table nodes link to table detail |
| 10 | Issues supports Open, Assigned, Resolved, Ignored | Pass | Operator issue action endpoints |
| 11 | Evidence page lists export packs | Pass | Six evidence packs |
| 12 | Viewer cannot perform operator actions | Pass | Viewer UI has no admin API references or operator buttons |
| 13 | Operator actions write audit events | Pass | `actions.py` writes `governance.audit_log` in the same transaction |
| 14 | Missing data shows Unknown / Not configured / Not instrumented | Pass | Shared v2 governance panels |
| 15 | No hardcoded PASS, Trusted, or fake KPI values | Pass | v2 pages use backend API responses |
| 16 | No dead buttons | Pass | Evidence export button posts through JSON bridge |
| 17 | No raw table access from portal | Pass | Portal uses `/api/v1/governance` API client |
| 18 | Backend APIs follow resolver path | Pass | Routes use `GovernanceReadService` |
| 19 | Tests pass | Pass | `test_governance_*.py` |
| 20 | Route verification notes exist | Pass | Next build route output validates generated pages |

## Shadow-Mode Divergence

Current new governance YAML use cases:

```text
bed-pressure
```

Legacy static governance registry remains present in:

```text
apps/portal/lib/governance-registry.ts
apps/portal/app/governance/health/page.tsx
apps/portal/app/governance/explore/page.tsx
apps/portal/app/governance/kpi/[slug]/page.tsx
apps/portal/app/governance/kpi/[slug]/trace/page.tsx
apps/portal/app/governance/asset/[id]/page.tsx
```

Cleanup decision:

```text
Do not remove legacy governance code yet.
```

Reason:

```text
The v1.3 route tree is live and tested, but old routes still exist for shadow comparison and should only be removed after operator acceptance.
```

## Remaining Risks

- Attribute-level catalog evidence is not loaded yet, so attribute rows render no evidence rather than real classifications.
- Issue store may be empty until seeded or populated by runtime checks.
- Header-based operator role guard is a repo-conformant placeholder until a reusable JWT role dependency exists.
- Legacy governance pages still use static registry values and should not be treated as v1.3 proof.

## Validation Commands

```bash
PYTHONPATH=apps/backend python3 -m unittest discover -s apps/backend/tests -p 'test_governance_*.py'
git diff --check
bash -n scripts/db/apply_postgres.sh
cd apps/portal && npm run build
```

## Cleanup List

Deferred until acceptance:

```text
apps/portal/lib/governance-registry.ts
apps/portal/app/governance/health/page.tsx
apps/portal/app/governance/explore/page.tsx
apps/portal/app/governance/kpi/[slug]/page.tsx
apps/portal/app/governance/kpi/[slug]/trace/page.tsx
apps/portal/app/governance/asset/[id]/page.tsx
apps/portal/components/governance/*
```
