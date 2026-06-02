# Dashboard Contract Template

## Dashboard identity

- Dashboard name:
- Dashboard slug:
- Dashboard id:
- Route:
- Audience:
- Workspace tab:
- Locale(s):
- Direction(s):

## Business purpose

- What decision should this dashboard support?
- What should a user understand within 30 seconds?
- What exact story step does this dashboard represent?

## Canonical implementation rule

- Is this dashboard canonical and non-substitutable? `yes/no`
- If yes, implementation may not merge or collapse it into another page.

## Required datasets

- `analytics.<dataset_1>`
- `analytics.<dataset_2>`
- `output.<runtime_output>` when predictive/runtime evidence is required

## Required components

For each required component define:

- component id
- component type
- business meaning
- data binding
- action binding
- governance evidence binding

## Required charts

For each chart define:

- title
- KPI or dimension
- viz type
- source dataset
- expected filters
- whether the chart is mandatory for acceptance

## KPI definitions

- KPI name:
- SQL or model source:
- business meaning:
- empty-state meaning:

## Filter contract

- default filters:
- optional filters:
- filter labels:
- filter interaction rules:

## Actions

- required actions:
- human authorization required:
- audit event emitted:
- notification side effect:
- ticket side effect:

## Governance and runtime evidence

- required lineage panel:
- required record spec:
- required freshness:
- required runtime status:
- required execution history:

## Empty-state behavior

- what should render when the dataset is empty?
- what should render when only partial data exists?

## Fidelity rules

- required dashboard count in this workspace:
- dashboard substitution forbidden:
- required companion dashboards:

## Validation

- datasets exist
- dashboard route resolves
- charts render
- values reconcile to expected metrics
- dashboard appears in `dashboard_implementation_matrix.yaml`
- dashboard appears in `story_flow.yaml`
- dashboard appears in `dashboard_fidelity_contract.yaml`
