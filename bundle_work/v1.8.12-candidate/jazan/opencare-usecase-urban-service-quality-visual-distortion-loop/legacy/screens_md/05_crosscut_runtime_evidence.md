# Screen 05 — Cross-cutting runtime evidence & execution history

**Path**: `/jazan-performance/use-cases/urban-service-quality-visual-distortion-loop/runtimes`
**Implements**: Cross-cutting function view
**Renders for**: IT lead, data team, MOMRAH audit liaison

## Purpose

Prove the intelligence pipeline is real and operational. This screen exists for the technical and audit stakeholders who will be in the customer room asking different questions than the Performance Office. The headline answer is: *the three runtimes are registered with the platform, they run on schedule, here is the evidence.*

## Regions

### Region 5.1 — Page header

- Title (bilingual): `Runtime evidence · سجل تشغيل النماذج`
- Subtitle: `3 platform runtimes · last 7-day execution history`
- Status pill: `N/M online` (e.g. `3/3 online`) with a green dot when all online
- Mode chip: `Demo data · seeded`

### Region 5.2 — Runtime cards (×3)

One card per registered runtime. Stacked vertically (each card spans the full width). Each card shows:

**Header row**:
- Runtime ID (font-mono): `RT-JAZAN-SERVICE-RNN-FORECAST`, `RT-JAZAN-SERVICE-ANOMALY`, `RT-JAZAN-DECISION-CANDIDATE`
- Status pill: `online` (green dot) or `offline` / `degraded`
- Runtime type label: `rnn_forecast · GRU/LSTM`, `anomaly_detection · z-score`, `decision_candidate_generation`
- For the decision-candidate runtime, an additional `HITL required` pill (purple, ti-user-check)

**Title row**:
- Human name: `Jazan Service Quality RNN Forecast` etc.
- One-line description

**Last 7 runs visual** (right side of header row):
- Seven mini bars showing run duration and success state for each of the last 7 days
- Green for success, amber for degraded, red for failed
- Hover tooltip per bar showing date, duration, rows out

**Metadata strip** (4 columns):
- Last run timestamp
- Duration
- Rows out (or candidates out for the decision runtime)
- Next scheduled run

**Inputs and outputs panel**:
- Inputs row: comma-separated list of source marts (font-mono table names)
- Outputs row: comma-separated list of output tables

### Region 5.3 — Page footer

Three small indicators:
- Lineage governed in `governance/business_trust_map.yaml`
- Daily schedule
- Raw layer never queried by runtimes

## Data bindings

| Component | Source | Binding type |
|---|---|---|
| Runtime status | Platform runtime registry (OpenCare provides) | Platform API |
| Last run, duration, rows out, next scheduled | Platform runtime execution log | Platform API |
| 7-day history | Platform runtime execution log, last 7 days | Platform API |
| Inputs/outputs | `runtime/runtimes.yaml` declarations | YAML reference |

## Interactions

| Trigger | Behaviour |
|---|---|
| Click "Lineage governed in..." | Navigate to governance trust map view |
| Hover bar in 7-day history | Tooltip with run detail |
| Click runtime ID | Open runtime detail panel (audit log of all runs, parameter history) |

## Honest signalling

The seven-day history should reflect reality including degradations. A perfect 100% green history reads as fake to a technically literate Saudi government audience. If a runtime had a degraded day in the demo seed, leave it visible with the retry-succeeded annotation. Honesty about real degradation is more credible than fabricated perfection.

## Bilingual

Required i18n keys: page title (already bilingual), runtime card labels (`inputs`, `outputs`, `last run`, `duration`, `next scheduled`, `rows out`, `candidates out`), status labels (`online`, `degraded`, `offline`, `HITL required`).

The runtime IDs and table names themselves are not localised — they're technical identifiers and remain font-mono in either locale.

## Renderer requirements

- Mini bar chart per runtime (7 bars with state colouring)
- Hover tooltips on chart bars
- Font-mono inline text for technical identifiers
- Status pill with coloured dot indicator
- Multi-column metadata strip per card
