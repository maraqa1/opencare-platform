# Screen 02 — Level 2 KPI workspace

**Path**: `/jazan-performance/use-cases/urban-service-quality-visual-distortion-loop/kpi/{kpi_slug}`
**Implements**: Level 2 of the three-level navigation hierarchy
**Renders for**: Users who clicked into a KPI from Level 1 (or directly via URL)

## Purpose

Show one KPI across all 25 Jazan municipalities. The user is now scoped to a single KPI and needs to see which municipalities are performing well, which are struggling, and which have open cases requiring review.

## Regions

### Region 2.1 — Page header with breadcrumb

- Breadcrumb: `Strategic landing → {kpi.short_name}` (clickable)
- Title (bilingual): KPI name from `i18n/{locale}.yaml#kpi.{n}.name`
- Subtitle: KPI formula / definition (from `contracts/kpi.yaml#kpis[n].formula_text`)
- Mode chip: `Demo data · seeded`
- Locale toggle

### Region 2.2 — KPI summary strip

Four-column strip:
- Current portfolio average (this KPI averaged across all 25 municipalities, weighted by population)
- Trend vs prior month (delta + arrow)
- Municipalities in breach (count)
- Open cases on this KPI (count)

### Region 2.3 — Municipality ranking table

Sortable table with one row per municipality (25 rows). Columns:

- Municipality name (bilingual)
- Municipality archetype (urban / urban_rural / coastal / island / highland / agricultural)
- Population band
- Current KPI value (with threshold-coloured background)
- Target compliance (% above/below target)
- Trend (last 6 months sparkline)
- Risk score (composite from `output.jazan_municipality_service_risk_score`)
- Risk tier pill (critical / high / moderate / low)
- Open case indicator (chip if a case is open, else dash)
- Action: row click → navigate to Level 3 case workspace (or, if no open case, to a read-only case view)

Default sort: risk score descending. Top of the table is the highest-priority municipality.

### Region 2.4 — KPI portfolio trend chart

Line chart showing the KPI's aggregate (population-weighted average) trajectory over the past 24 months, with the target threshold overlaid. Forecast extension (next 8 weeks) shown as a dashed continuation with confidence band.

### Region 2.5 — Governance & lineage panel

Two-column layout:

Left — KPI contract details:
- Owner role (from `contracts/kpi.yaml#kpis[n].owner`)
- Steward role
- Refresh cadence
- Source mart
- Dictionary term ID with link to dictionary
- Last governance review date

Right — lineage (compact view):
- Source systems contributing → staging models → analytics mart
- "Open in business trust map" link to the cross-cutting governance view

### Region 2.6 — Open cases list

If any cases are open on this KPI, list them with: case ID, municipality, current value, risk score, status (awaiting review / under revision / assigned / in progress), generated date.

Click a row → Level 3 case workspace.

## Data bindings

| Component | Source | Binding type |
|---|---|---|
| KPI summary strip | `analytics.fct_jazan_{kpi}_performance` aggregated over latest month | Query |
| Municipality ranking | Join `analytics.fct_jazan_{kpi}_performance` with `dim_jazan_municipality` and `jazan_municipality_service_risk_score` | Query |
| Portfolio trend chart | `analytics.fct_jazan_{kpi}_performance` last 24 months, population-weighted average | Query |
| Forecast extension | `output.jazan_service_rnn_forecast` filtered to this KPI | Query |
| Governance panel | `contracts/kpi.yaml#kpis[n]` and `governance/governed_datasets.yaml` | YAML reference |
| Open cases list | `decision.jazan_generated_service_decisions` filtered to this KPI, status in (awaiting_review, under_revision, assigned, in_progress) | Query |

## Interactions

| Trigger | Behaviour |
|---|---|
| Click breadcrumb "Strategic landing" | Navigate to Level 1 |
| Click municipality row | Navigate to Level 3 case workspace for that (KPI, municipality) |
| Click open case row | Same as above, default to `overview` tab |
| Sort table column | In-table sort, no navigation |
| Click "Open in business trust map" | Navigate to cross-cutting governance view |

## Bilingual

Required i18n keys (in addition to KPI-specific keys from screen 01):
- `screen.l2.breadcrumb.l1`
- `screen.l2.summary.average`, `summary.trend`, `summary.in_breach`, `summary.open_cases`
- `table.col.municipality`, `table.col.archetype`, `table.col.population`, `table.col.current`, `table.col.target_compliance`, `table.col.trend`, `table.col.risk_score`, `table.col.risk_tier`, `table.col.case_status`
- `governance.owner`, `governance.steward`, `governance.cadence`, `governance.source`, `governance.dictionary`, `governance.last_review`
- `open_cases.title`, `open_cases.empty`

## Renderer requirements

- Sortable data table with conditional row colouring by threshold zone
- Inline sparkline chart per row
- Line chart with overlay (target line) and dashed forecast extension with confidence band
- Bilingual table headers (display side-by-side or in active locale)
