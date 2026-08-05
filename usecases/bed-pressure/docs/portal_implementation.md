# Portal Implementation

## Workspace Routes

The Bed Pressure workspace is mounted at `/use-cases/bed-pressure`.

Pages:

- `/overview`: explains the business problem, personas, pipeline, and decisions supported.
- `/status`: operational landing page with current ward pressure and anomaly rail.
- `/predictions`: forecast and breach risk page.
- `/analysis`: board evidence, native analysis canvas, and embedded Superset dashboard.
- `/decisions`: decision queue and action workflow.

## Portal Components

| Component | Purpose |
| --- | --- |
| `OccupancyGrid` | Fetches current occupancy and renders worst-first ward cards/table. |
| `ForecastView` | Fetches forecast output and shows future breach evidence. |
| `AnomalyAlerts` | Fetches latest anomaly alerts and displays operational alerts. |
| `BedPressureAnalysisCanvas` | Native React analysis board with KPI cards, trend, pressure mix, top wards, and executive actions. |
| `DecisionCards` | Lists decision queue rows and supports decision state transitions. |
| `EmbeddedDashboard` | Embeds Superset analysis when available. |
| `RecordSpecification` | Shows table-level trust evidence for source or output records. |

## Required API Bindings

- Status page: `/api/v1/occupancy/current` and `/api/v1/anomalies`.
- Predictions page: `/api/v1/forecast`.
- Analysis page: `/api/v1/occupancy/historical`, `/api/v1/occupancy/current`, and Superset dashboard data where configured.
- Decisions page: `/api/v1/decisions`, `/api/v1/decisions/generate`, and decision transition endpoints.

## UI Acceptance

- Current status must sort wards by pressure severity and occupancy.
- Every ward display must show current occupancy, available beds, status, and freshness context.
- Predictions must distinguish current observed values from future predicted values.
- Analysis must be useful without Superset: the native canvas should show KPI values, trend, pressure mix, bar charts, and the executive actions board.
- Decision pages must show the full chain from signal to decision to action to outcome.
- Empty decision queues must not look broken. Demo fallback rows are allowed only when clearly labelled and must not write audit events.

## Demo Fallback Rule

The portal can render labelled demo decision candidates if `decision.decision_queue` is empty. This is only for demo readiness. Real decision actions must be generated through the backend decision engine and stored in the decision schema before mutation endpoints are enabled.

## Porting Rules

- Keep the page structure even if the design system changes.
- Keep clinical operations language plain and action-oriented.
- Do not use raw table data directly in the portal. Always use backend APIs or governed BI datasets.
- Keep governance and trust cues visible near the numbers they support.
