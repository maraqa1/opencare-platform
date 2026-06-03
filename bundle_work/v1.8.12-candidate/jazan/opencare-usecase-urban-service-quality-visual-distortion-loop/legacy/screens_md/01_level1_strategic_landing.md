# Screen 01 — Level 1 strategic landing

**Path**: `/jazan-performance/use-cases/urban-service-quality-visual-distortion-loop`
**Implements**: Level 1 of the three-level navigation hierarchy
**Renders for**: All users on first load. The entry point.

## Purpose

Show, in one screen, the strategic objective cascading to six governed KPIs with current threshold state. A reviewer should be able to scan the entire portfolio in five seconds and immediately identify which KPIs are deviating, which need attention soon, and which case is the highest priority right now.

## Regions

The screen is composed of four stacked regions plus a persistent sidebar (sidebar is global, not per-screen).

### Region 1.1 — Page header

- Title (bilingual): `Strategic objective cascade · monitoring & thresholds`
- Subtitle (English only): `One objective · six governed KPIs · live threshold state`
- Mode chip (top right): `Demo data · seeded` if the workspace is rendering against demo; absent only when populated-state proof is current
- Timestamp: last refresh time of the underlying marts

### Region 1.2 — Strategic objective hero card

- Tag: `OBJ-SVC-QUALITY-01`
- Title (bilingual): the strategic objective name from `contracts/kpi.yaml#strategic_objective`
- Frameworks (right-aligned): Vision 2030 Quality of Life · MOMRAH Municipal Index · 25 municipalities · 1.6 M residents
- Portfolio rollup (bottom strip, 4 columns):
  - Meeting target — count of KPIs in green state
  - Approaching trigger — count in amber state
  - In breach — count in red state
  - Decision candidates — count of open candidates this week

### Region 1.3 — Cascade visual

SVG cascade with a single source point at top and six branches fanning to the cards below. Each branch terminus is a coloured dot encoding the KPI's current state (red breach / amber approaching / green meeting). The visual is purely indicative — the cards below carry the actual KPI data.

Dimensions: 640 × 70 px viewBox.

### Region 1.4 — KPI threshold cards (×6)

Two-column grid, three rows. Each card displays:

- KPI number (top left): `KPI 1` through `KPI 6`
- Status pill (top right): `In breach` (red, ti-alert-octagon), `Approaching trigger` (amber, ti-alert-triangle), or `Meeting target` (green, ti-circle-check)
- KPI name (bilingual): English + Arabic from `i18n/{locale}.yaml`
- Current value (large): the latest reading from the analytics mart
- Target reference (right-aligned): "target X · ↑/↓ Y above/below"
- **Threshold bar**: horizontal bar showing red / amber / green zones with a marker indicating current position. Zones are inverted for KPIs where lower is better (KPI 3 permit issuance time).
- Bar axis labels: minimum, trigger, target, maximum
- Trigger rule card: coloured the same family as the status (red trigger rule for breaching KPI, amber for approaching, neutral for meeting). Text is the rule from `contracts/kpi.yaml#monitoring_rules`.
- Footer: owner role · refresh cadence

Card states:
- **Populated** — all of the above
- **Empty (data not yet available)** — show "Data not yet available" in the value position, hide the threshold bar, keep the card structure
- **Error** — show typed error with retry option

### Region 1.5 — Active case banner

Appears only when one or more KPIs are in breach. Shows the highest-risk case (max composite risk score). Contents:

- Tag: `Active risk case · highest priority` with ti-alert-triangle
- Municipality name (bilingual)
- KPI name + brief situation description
- Risk score · forecast probability · status
- "Review case" button (links to Level 3 case workspace for this case)

If no KPI is in breach, the banner is hidden and replaced with a smaller "All KPIs within governance bands" affirmation.

## Data bindings

| Component | Source | Binding type |
|---|---|---|
| Strategic objective card | `contracts/kpi.yaml#strategic_objective` | YAML reference (static) |
| Portfolio rollup counts | `analytics.fct_jazan_kpi_portfolio_summary` (compute from latest values of all 6 KPIs) | Query |
| KPI card current values | `analytics.fct_jazan_{kpi_specific_mart}` — six sources | Query |
| Threshold zones | `contracts/kpi.yaml#monitoring_rules` per KPI | YAML reference |
| Active case banner | `decision.jazan_generated_service_decisions` ordered by `composite_risk_score desc limit 1` | Query |

## Interactions

| Trigger | Behaviour |
|---|---|
| Click any KPI card | Navigate to Level 2 KPI workspace for that KPI |
| Click "Review case" on active banner | Navigate to Level 3 case workspace, default `overview` tab |
| Locale toggle (header) | Re-render in selected locale; URL adds `?lang=ar` or `?lang=en` |

## Bilingual

Every visible string uses an `i18n_key`. Required keys for this screen:
- `screen.l1.title`, `screen.l1.subtitle`
- `screen.l1.objective.tag`, `screen.l1.objective.name`, `screen.l1.objective.aliases.*`
- `screen.l1.rollup.meeting`, `screen.l1.rollup.approaching`, `screen.l1.rollup.breach`, `screen.l1.rollup.candidates`
- `kpi.{n}.name`, `kpi.{n}.short_name`, `kpi.{n}.target_text`, `kpi.{n}.trigger_text`, `kpi.{n}.owner`
- `status.in_breach`, `status.approaching`, `status.meeting`
- `bar.label.trigger`, `bar.label.target`
- `active_case.tag`, `active_case.action_button`

## Renderer requirements

The OpenCare native-BI renderer must support:
- Multi-zone horizontal threshold bar with current-position marker
- SVG cascade visual with state-colored terminus dots
- Bilingual side-by-side text in card titles
- Direction-aware layout (RTL for ar-SA)
- Conditional banner rendering based on data state
