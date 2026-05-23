# Dashboard Contract Template

## Dashboard identity

- Dashboard name:
- Dashboard slug:
- Audience:
- Workspace tab:

## Business purpose

- What decision should this dashboard support?
- What should a user understand within 30 seconds?

## Required datasets

- `analytics.<dataset_1>`
- `analytics.<dataset_2>`

## Required charts

- chart 1
- chart 2
- chart 3

For each chart define:

- title
- KPI or dimension
- viz type
- source dataset
- expected filters

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

## Empty-state behavior

- what should render when the dataset is empty?
- what should render when only partial data exists?

## Validation

- datasets exist
- dashboard route resolves
- charts render
- values reconcile to expected metrics
