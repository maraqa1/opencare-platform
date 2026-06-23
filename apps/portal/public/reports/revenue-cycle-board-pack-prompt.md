# Revenue Cycle Board Pack Prompt

Build or update the OpenCare Revenue Cycle Board Pack as a live, CFO-ready HTML report.

## Goal

Reframe the report as:

`From care delivered to cash collected, and from cash risk to ranked recovery execution.`

The report must be generated from real platform data at run time.

## Source of Truth

Use the consolidated backend payload:

`GET /api/v1/rcm/board-pack`

Do not hard-code KPI values, trends, claims, counts, currencies, or story text with fixed numbers.

## Hard Rules

- Use live backend calculations only.
- Do not use Superset.
- Do not copy numbers from an exported HTML file.
- Do not preserve prompt example values as truth.
- If a metric is unavailable, show `Metric unavailable`.
- List missing or unavailable metrics in `Data Trust`.
- Keep source-table lineage only in the `Data Trust` section.
- Use the tenant or payload currency. Default to `SAR` only when the live payload returns `SAR`.

## Required Sections

1. Executive cover
2. Business storyline
3. Cash Command
4. Recovery Queue
5. Decision Queue next layer
6. Board talk track
7. Data Trust

## Payload Shape

The report should be driven from one consistent payload with this shape:

```json
{
  "generated_at": "...",
  "currency": "SAR",
  "period": {
    "date_from": "...",
    "date_to": "...",
    "label": "..."
  },
  "filters_applied": {},
  "executive_cover": {},
  "storyline": {},
  "cash_command": {},
  "recovery_queue": {},
  "decision_layer": {},
  "board_talk_track": "...",
  "data_trust": {}
}
```

## Required Dynamic Metrics

### Cash Command

- Net patient revenue
- Cash collected
- Collection rate
- Average payment days
- Rejected claim rate
- Revenue at risk
- Collections vs charges trend
- Aging buckets
- Rejected claims and recovery pipeline
- Risk concentration

### Recovery Queue

- Recoverable queue value
- Expected recovery
- Due this week
- Overdue items
- High priority items
- Recovery effort hours
- Issue mix
- Payer recovery
- Owner workload
- Due window mix
- Ranked action table

### Decision Layer

If live decision data exists, show real counts and statuses.
If not fully configured, say so truthfully and position it as the next maturity layer.

## Validation

- Changing report filters must change the board-pack values.
- No forbidden static KPI literals should exist in templates.
- `Data Trust` must appear last.
- Missing metrics must be explicit, never silently fabricated.
- The report must remain printable and responsive.

