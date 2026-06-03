# Use Case Contract Template

Use this template to define a new use case before implementation begins.

The contract should describe the use case as a platform-native shell, not a standalone dashboard.

## 1. Identity

- Use-case name:
- Use-case slug:
- Business domain:
- Primary owner:
- Platform mode:
  - `native_shell`
- Bundle version:

## 2. Business outcome

- What problem does this use case solve?
- What strategic objective does it support?
- What decision should the platform enable?
- What operational failure should it make visible early?

## 3. Users and personas

- Executive audience:
- Operational audience:
- Governance audience:
- Human approvers for external actions:

## 4. KPI suite

For each KPI define:

- KPI ID:
- KPI name:
- Business question answered:
- Formula:
- Grain:
- Target:
- Trigger rule:
- Owner:
- Review cadence:
- Downstream decision linkage:

## 5. Dashboard suite

List the canonical dashboards.

For each dashboard define:

- Dashboard ID:
- Visible title:
- Route:
- Business purpose:
- Primary audience:
- Must-answer question:
- Runtime evidence required:
- Governance evidence required:

Required supporting contracts:

- `dashboard_implementation_matrix`
- `story_flow`
- `business_alignment_matrix`
- `dashboard_fidelity_contract`

## 6. Source and data path

- Source systems:
- Synthetic demo source path:
- Raw landing schema:
- Required entities:
- Join keys:
- Primary marts:
- Output tables:
- Decision tables:

## 7. Runtime contract

If prediction, anomaly detection, scoring, or model execution is required, define:

- Runtime IDs:
- Runtime purpose:
- Input tables:
- Output tables:
- Schedule:
- Evidence source:
- Runtime image:

## 8. Decision and action contract

For each action define:

- Action ID:
- Label:
- Business purpose:
- Preconditions:
- Human authorization requirement:
- Audit event:
- Notification side effect:
- Ticket side effect:
- Required evidence:

## 9. Governance contract

- Required metric dictionary entries:
- Classification requirements:
- Ownership and stewardship:
- Freshness expectations:
- Quality expectations:
- Lineage entry points:
- Evidence pack requirements:

## 10. Platform capability bindings

For each required capability define:

- Capability:
- Status:
  - `reuse_existing`
  - `partially_supported`
  - `requires_extension`
- Platform binding:
- Evidence:
- Limitation:

## 11. Portal contract

- Workspace root route:
- Default route:
- Navigation rail or tabs:
- Cross-cut routes:
- Empty-state expectations:
- Bilingual expectations:

## 12. Backend API contract

- API prefix:
- Summary endpoint:
- Detail endpoint:
- Governance endpoint:
- Runtime endpoint:
- Decision endpoint:

For each endpoint define:

- populated response shape
- empty response shape
- filter parameters
- ordering rules
- truth rules for `meta.empty`

## 13. Validation contract

- Required raw row-count checks:
- Required mart row-count checks:
- Required runtime checks:
- Required API checks:
- Required portal route checks:
- Required governance checks:
- Required rendered dashboard conformance checks:

## 14. Implementation mapping

Map the contract into repo targets:

- `config/use_cases.yaml`
- `dbt/opencare/models/...`
- `apps/backend/app/routes/...`
- `apps/backend/app/services/...`
- `apps/portal/app/...`
- `apps/portal/components/...`
- governance registry targets

## 15. Remove or exclude contract

- Operational exclude path:
- Repo removal path:
- Audit preservation rule:

## 16. Demo acceptance criteria

- Live or seeded values visible in workspace
- Required dashboards rendered
- Required components rendered
- Governance evidence visible
- Runtime evidence visible
- External actions visibly human-authorized
- Capability boundaries stated honestly
