# Use Case Contract Template

## Business outcome

- What problem does this use case solve?
- Who is the primary decision maker?
- What action should the platform enable?

## Users and audience

- Executive audience:
- Operational audience:
- Governance audience:

## Source systems

- Source system(s):
- Synthetic demo source path:
- Raw landing schema:

## Required entities

- entity 1
- entity 2
- entity 3

## Required dbt models

### Staging

- `stg_<use_case>_...`

### Marts

- `fct_<use_case>_...`

### Dictionary

- `dict_<use_case>_...`

## Backend API contract

- API prefix:
- Summary endpoint:
- Detail endpoint:
- Governance endpoint:

For each endpoint define:

- populated response shape
- empty response shape
- filter parameters
- ordering rules

## Portal contract

- Workspace root route:
- Default route:
- Tabs:

## Dashboard contract

- Dashboard suite contract path:
- Primary datasets:
- Required dashboard entry points:

## Governance contract

- required metric dictionary entries
- lineage requirements
- reconciliation expectations

## Provisioning contract

- raw loader or source sync:
- dbt selection strategy:
- post-load sync steps:

## Validation contract

- required raw row-count checks
- required mart row-count checks
- required API checks
- required portal route checks

## Remove or exclude contract

- operational exclude path:
- repo removal path:

## Demo acceptance criteria

- live values visible in workspace
- API endpoints populated
- governance contract visible
- include/exclude tested
