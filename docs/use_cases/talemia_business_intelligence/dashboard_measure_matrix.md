# TALEMIA Dashboard Measure Matrix

Use-case key: `talemia_business_intelligence`  
Dashboard slug: `talemia-business-intelligence`  
API prefix: `/api/v1/talemia`

## 1. Measure Rules

- Measures are computed in analytics and dictionary marts, not in the portal or API layer.
- APIs must query analytics and dictionary only.
- Superset must query analytics only.
- Dashboard target values from `raw_demo.talemia_dashboard_targets` are reconciliation inputs, not authoritative KPI values.
- Standard filters are `year`, `account_manager`, `business_line`, `workflow_state`, `winning_likelihood`, and `sector_type`.

## 2. KPI Matrix

| KPI | Formula | Source mart | Raw lineage | Dashboard placement | Filter dimensions | Limitations |
| --- | --- | --- | --- | --- | --- | --- |
| YTD opportunities | `count(distinct opportunity_id)` where selected year equals `submission_year` or year of `submission_date` | `analytics.fct_talemia_opportunity` | `raw_demo.talemia_opportunities` | Executive KPI cards, Overview | all standard filters | `created_date` is incomplete; YTD may need submission date fallback |
| Pipeline opportunities | `count(distinct opportunity_id)` where opportunity is active and not closed won/lost | `analytics.fct_talemia_pipeline` | opportunities, opportunity stage, workflow state | Executive KPI cards, Opportunities by stage | all standard filters | V3 stage extract contains limited active-stage evidence |
| Pipeline value | `sum(contract_value)` for active pipeline opportunities | `analytics.fct_talemia_pipeline` | opportunities | Executive KPI cards, Financial, Business Lines | all standard filters | Value definition must confirm whether to use contract value or qualified sales |
| Qualified pipeline | `sum(qualified_sales)` for active qualified opportunities | `analytics.fct_talemia_pipeline` | opportunities | Financial, Executive | all standard filters | Qualification state may be inferred from non-null qualified sales |
| Wins value | `sum(awarded_value)` for won opportunities | `analytics.fct_talemia_win_loss` | opportunities, awards | Executive KPI cards, Win/loss ratio | all standard filters | Award date missing in observed sample |
| YTD wins | `count(distinct opportunity_id)` for won opportunities in selected year | `analytics.fct_talemia_win_loss` | opportunities, awards | Executive KPI cards | all standard filters | Year may need fallback to submission year when award date is missing |
| Win rate | `won_opportunity_count / nullif(closed_opportunity_count, 0)` | `analytics.fct_talemia_win_loss` | awards, losses, opportunities | Executive KPI cards, Win/loss | all standard filters | Requires complete closed opportunity population |
| Hit rate | `won_value / nullif(submitted_or_closed_bid_value, 0)` | `analytics.fct_talemia_win_loss` | awards, losses, opportunities | Executive, Financial | all standard filters | Business must confirm whether denominator is submitted, closed, or all bids |
| Client count | `count(distinct normalized_client_name)` | `analytics.fct_talemia_opportunity` | opportunities, clients | Executive, Opportunities | all standard filters | Client normalization needed for Arabic and translated names |
| New clients | `count(distinct client_id)` where first-seen year equals selected year | `analytics.fct_talemia_opportunity` | opportunities, clients | Executive | all standard filters | Requires historical persistence or first-seen derivation |
| Business-line pipeline value | `sum(active_pipeline_value)` grouped by business line | `analytics.fct_talemia_business_line_performance` | opportunities, business lines | Business Lines, pipeline value by business line | year, business_line, workflow_state, winning_likelihood, sector_type | Business-line values need accepted-value cleanup |
| Account-manager pipeline value | `sum(active_pipeline_value)` grouped by account manager | `analytics.fct_talemia_account_manager_performance` | opportunities, account managers | Account Managers, account manager performance | year, account_manager, business_line, workflow_state, winning_likelihood, sector_type | One account manager record is blank in the extract |
| Lost bid value | `sum(contract_value)` for lost opportunities | `analytics.fct_talemia_win_loss` | loss reasons, opportunities | Financial, Win/loss | all standard filters | Loss dates, reasons, and competitors may be blank |
| Converted value 2026 | `sum(converted_value_2026)` | `analytics.fct_talemia_opportunity` | opportunities | Financial | all standard filters | Observed sample includes nulls; definition requires source validation |
| Average sales cycle days | `avg(close_or_outcome_date - start_date)` where start is created date else submission date | `analytics.fct_talemia_opportunity` | opportunities, awards, losses | Financial, Governance | all standard filters | Date completeness is weak; fallback must be reported |
| Opportunity aging | `current_date - start_date` for active opportunities | `analytics.fct_talemia_pipeline` | opportunities | Opportunities table, stale signals | all standard filters | Created date may be absent; submission date fallback needed |
| High likelihood count | `count(distinct opportunity_id)` where `winning_likelihood = 'High'` | `analytics.fct_talemia_pipeline` | opportunities, risk classification | Executive KPI cards, Opportunities | all standard filters | Closed versus active inclusion must match view |
| Medium likelihood count | `count(distinct opportunity_id)` where `winning_likelihood = 'Medium'` | `analytics.fct_talemia_pipeline` | opportunities, risk classification | Executive KPI cards, Opportunities | all standard filters | Medium not observed in V3 sample but required as accepted value |
| Low likelihood count | `count(distinct opportunity_id)` where `winning_likelihood = 'Low'` | `analytics.fct_talemia_pipeline` | opportunities, risk classification | Executive KPI cards, Opportunities | all standard filters | Closed versus active inclusion must match view |

## 3. Required Dashboard Charts

### Executive KPI Cards

Measures:

- YTD opportunities
- Pipeline opportunities
- Pipeline value
- Qualified pipeline
- Wins value
- YTD wins
- Win rate
- Hit rate
- Client count
- New clients
- Lost bid value
- Converted value 2026

Dataset: `analytics.fct_talemia_opportunity`, `analytics.fct_talemia_pipeline`, `analytics.fct_talemia_win_loss`.

### Opportunities by Stage

Measures:

- Opportunity count by `opportunity_stage`.
- Pipeline value by `opportunity_stage`.
- Split by `workflow_state` where useful.

Dataset: `analytics.fct_talemia_opportunity` and `analytics.fct_talemia_pipeline`.

### Pipeline Value by Business Line

Measures:

- Business-line pipeline value.
- Business-line opportunity count.
- Qualified pipeline by business line.

Dataset: `analytics.fct_talemia_business_line_performance`.

### Win/Loss Ratio

Measures:

- Won count.
- Lost count.
- Win rate.
- Hit rate.
- Lost bid value.

Dataset: `analytics.fct_talemia_win_loss`.

### Account Manager Performance

Measures:

- Account-manager pipeline value.
- Active opportunity count.
- Wins value.
- Lost bid value.
- Overload indicator placeholder.

Dataset: `analytics.fct_talemia_account_manager_performance`.

### Opportunity Details Table

Columns:

- Opportunity ID.
- Opportunity name.
- Client.
- Client department.
- Account manager.
- Business line.
- Sector type.
- Opportunity stage.
- Workflow state.
- Winning likelihood.
- Contract value.
- Qualified sales.
- Expected award date.
- Submission date.
- Opportunity aging days.
- Last update date or week label.

Dataset: `analytics.fct_talemia_opportunity`.

### Weekly Updates Table

Columns:

- Update ID.
- Opportunity ID.
- Opportunity name.
- Client.
- Week number.
- Week label.
- Update text.
- Update language.
- Operational signal.
- Risk flag.
- Source row.

Dataset: `analytics.fct_talemia_opportunity_updates`.

### KPI Governance / Reconciliation Table

Columns:

- Dashboard name.
- KPI name.
- Filter context.
- Target visible value.
- Mart value.
- Parsed target value.
- Absolute variance.
- Percent variance.
- Reconciliation status.
- Limitation note.

Dataset: `analytics.fct_talemia_dashboard_reconciliation`.

## 4. Accepted Values

### `opportunity_stage`

Contract values:

- Identified
- Qualified
- Proposal Development
- Submitted
- Negotiation
- Awarded
- Lost
- Contract Signed

Observed V3 values:

- Awarded
- Lost

### `workflow_state`

Contract values:

- New
- In Review
- In Progress
- Submitted
- Pending Award
- Awarded
- Lost
- On Hold
- Cancelled

Observed V3 values:

- Awarded
- Lost

### `winning_likelihood`

Contract values:

- High
- Medium
- Low
- Unknown

Observed V3 values:

- High
- Low

### `sector_type`

Contract values:

- MoE+
- Non-MoE
- Unknown

Observed V3 values:

- MoE+
- Non-MoE

## 5. Reconciliation Rules

- Parse `raw_demo.talemia_dashboard_targets.visible_value` into numeric values when possible.
- Store parse failures as reconciliation status `unparsed_target`.
- Store missing mart values as `missing_mart_value`.
- Store values within approved tolerance as `matched`.
- Store values outside tolerance as `variance`.
- Store values whose source formula is unresolved as `requires_business_review`.
- Reconciliation must be visible in Platform -> Administration -> Governance -> TALEMIA before executive metrics are marked authoritative.

## 6. Phase 2 Measures

These measures are explicitly out of phase 1:

- Forecasted pipeline value.
- Anomaly detection across win/loss and update cadence.
- Predictive likelihood scoring.
- Automated next-best-action ranking.
- Historical trend analysis requiring persisted snapshots.
