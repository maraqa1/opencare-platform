# KPI Formula Reconciliation Report v1.8.12

## Method
- Reviewed `business/kpis.yaml`
- Reviewed `dbt/model_index.yaml`
- Inspected the KPI mart SQL models under `dbt/models/analytics/`

## Summary
| KPI | dbt model inspected | Reconciliation status | Notes |
| --- | --- | --- | --- |
| Visual Distortion Closure Quality | `fct_jazan_visual_distortion_performance.sql` | `sql_aligned` | Business ratio and SQL expression match |
| Service Request Closure Rate | `fct_jazan_service_quality.sql` | `sql_aligned` | Business ratio and SQL expression match |
| Average Permit Issuance Time | `fct_jazan_permit_performance.sql` | `discrepancy_found` | SQL uses service-resolution proxy, not permit submission/approval dates |
| Urban Service Coverage | `fct_jazan_service_coverage.sql` | `discrepancy_found` | SQL uses weighted proxy, not covered population over total population |
| Emergency Readiness | `fct_jazan_emergency_readiness.sql` | `discrepancy_found` | SQL uses proxy composite, not readiness-check/drill/recovery inputs |
| Citizen Satisfaction | `fct_jazan_citizen_satisfaction.sql` | `discrepancy_found` | SQL uses service-quality proxy blend, not pure weighted survey score |

## KPI Details

### KPI-VDQ-01 · Visual Distortion Closure Quality
- Explicit formula: closed visual-distortion cases meeting the closure quality bar divided by all closed cases
- dbt model: `dbt/models/analytics/fct_jazan_visual_distortion_performance.sql`
- dbt expression: `sum(cases_meeting_quality_bar) / nullif(sum(cases_closed), 0)`
- Status: `sql_aligned`
- Follow-up: no formula-contract change required beyond continued test coverage

### KPI-SRC-02 · Service Request Closure Rate
- Explicit formula: requests completed within SLA divided by valid requests received minus rejected
- dbt model: `dbt/models/analytics/fct_jazan_service_quality.sql`
- dbt expression: `sum(requests_completed_within_sla) / nullif(sum(requests_received - requests_rejected), 0)`
- Status: `sql_aligned`
- Follow-up: no formula-contract change required beyond continued test coverage

### KPI-PIT-03 · Average Permit Issuance Time
- Explicit formula: average working-day difference between permit submission and approval
- dbt model: `dbt/models/analytics/fct_jazan_permit_performance.sql`
- Current SQL expression: `avg(avg_resolution_hours) / 24.0`
- Status: `discrepancy_found`
- Discrepancy: current mart proxies permit timing from service-request resolution
- Required follow-up: add permit request raw/staging sources and rebuild mart from actual submission/approval timestamps

### KPI-USC-04 · Urban Service Coverage
- Explicit formula: covered population divided by total population
- dbt model: `dbt/models/analytics/fct_jazan_service_coverage.sql`
- Current SQL expression: `service_request_closure_rate * 0.70 + (1 - reopen_rate) * 0.20 + avg_request_satisfaction_score * 0.10`
- Status: `discrepancy_found`
- Discrepancy: current mart is a service-quality proxy, not a coverage denominator model
- Required follow-up: add service-coverage asset and population source data

### KPI-ERR-05 · Emergency Readiness
- Explicit formula: weighted readiness composite of completed checks, drill pass rate, and recovery-time adherence
- dbt model: `dbt/models/analytics/fct_jazan_emergency_readiness.sql`
- Current SQL expression: `service_request_closure_rate * 0.45 + visual_distortion_closure_quality * 0.45 + no_critical_cases_flag * 0.10`
- Status: `discrepancy_found`
- Discrepancy: current mart proxies readiness through service and visual-distortion performance
- Required follow-up: add readiness-check, drill, and recovery-time source models

### KPI-CSI-06 · Citizen Satisfaction
- Explicit formula: population-weighted survey satisfaction score for the quarter
- dbt model: `dbt/models/analytics/fct_jazan_citizen_satisfaction.sql`
- Current SQL expression: `avg_request_satisfaction_score * 0.65 + service_request_closure_rate * 0.25 + (1 - reopen_rate) * 0.10`
- Status: `discrepancy_found`
- Discrepancy: current mart blends operational proxies with satisfaction score
- Required follow-up: add raw survey response grain and population weighting inputs
