# Screen 03 — Level 3 case workspace

**Path**: `/jazan-performance/use-cases/urban-service-quality-visual-distortion-loop/case/{case_id}/intelligence`
**Implements**: Level 3 of the three-level navigation hierarchy
**Renders for**: Users who drilled from a KPI workspace into a specific (municipality, KPI) case

This screen has four internal tabs, documented below. The case context (which municipality, which KPI) persists across all tabs. The user can switch tabs without losing context.

## Persistent case header (all tabs)

- Breadcrumb: `Strategic landing → {kpi.short_name} → {municipality_name}` (each segment clickable)
- Case ID (font-mono): e.g. `JZN-DEC-1007`
- Municipality name (bilingual): e.g. `Sabya · بلدية صبيا`
- KPI name (bilingual): the KPI this case is scoped to
- Status pill: `Awaiting review` / `Under revision` / `Assigned` / `In progress` / `Evidence submitted` / `Verified` / `Closed` / `Recovered`
- Generated date · last updated date
- Tab strip: Overview · Model intelligence · Decision command · Outcome recovery

## Tab 3.1 — Overview

Default tab when entering the case. Summarises everything in one screen.

Regions:
- **Case summary strip** — 4 boxes: current KPI value · target · composite risk score · forecast breach probability
- **Trend snapshot** — small line chart showing the KPI's last 12 weeks for this municipality
- **Top recommendation card** — the #1 ranked recommendation from `output.jazan_recommended_intervention` (full details available on the intelligence tab)
- **Action lifecycle indicator** — six-stage breadcrumb: assigned → in progress → evidence submitted → verified → closed → measured. The current stage is highlighted.
- **Recent activity feed** — chronological log of decisions, actions, evidence submissions, status changes on this case

## Tab 3.2 — Model intelligence

This is the screen with the explainable 84 risk score breakdown. Implements the storyboard's Screen 02.

Regions:
- **Composite risk score panel** — large display: score / 100, tier pill, with feature-contribution stacked bar
  - Contributions: forecast breach probability, anomaly z-score, historical recurrence, complaint volume pressure
  - Each contribution shows its raw signal value and its weighted contribution to the score
- **RNN forecast chart** — actual KPI trajectory (last 6 months) + forecast extension (next 8 weeks) with breach probability badge
  - Target line overlay
  - "Today" marker
  - Confidence band on forecast
- **Anomaly detection card** — z-score with severity tier, which weekly observations contributed, comparison to municipality's 24-month baseline
- **Recommendation list** — top 3 from `output.jazan_recommended_intervention`, each card showing:
  - Source case (region · municipality · year)
  - Intervention type (bilingual)
  - Measured recovery delta from the source case
  - Days to recovery
  - Sustained recovery indicator
  - Similarity score · effectiveness score

## Tab 3.3 — Decision command

This is the action / approval surface. Implements the storyboard's Screen 03 at the case level.

Regions:
- **Evidence pack panel** — 4-column strip: current KPI · target · forecast probability · anomaly z-score
- **Draft MOMRAH narrative** — bilingual prose drafted by the system, editable by the reviewer. English on top, Arabic below, both visible side-by-side or stacked depending on screen width.
- **Recommendation summary** — 3 ranked recommendations from the intelligence tab, condensed
- **Action button row** — five buttons, each linked to a backend POST route with audit:
  - Approve (primary, green)
  - Request revision (secondary)
  - Escalate (secondary)
  - Create ticket (secondary, ti-ticket)
  - Notify owner (secondary, ti-mail)
- **Audit footnote**: "Every action is human-authorised, audit-logged, and bilingual. Platform never escalates externally without approval."

## Tab 3.4 — Outcome recovery

Visible only when the case has reached `closed` or beyond. Implements the storyboard's Screen 04 at the case level.

Regions:
- **Recovery trajectory** — 5-step visual: Baseline → arrow → Target → arrow → After 30 days
  - Each box shows date and KPI value
  - Background colour codes recovery: red baseline, neutral target, green after if recovered
- **Recovery line chart** — KPI from action approval through day-30 measurement and (if available) day-90 sustainment check, with target line overlay
- **Forecast accuracy panel** — `High`/`Medium`/`Low` based on observed vs predicted trajectory, with short narrative
- **Intervention effectiveness panel** — `High`/`Medium`/`Low` based on observed recovery vs expected for this intervention class, with up-weighting note for the recommendation engine
- **Feedback into strategic pillars** — six-pillar grid showing which pillars this closed case strengthens (Strategic alignment, KPI governance, Data & analytics, Early warning, Decision rhythm, Knowledge transfer). Pillars with check marks are credited; others are dashed.
- **Closed-loop evidence ID** with verification metadata and "Open in MOMRAH reporting" link

## Data bindings (across all tabs)

| Component | Source | Binding type |
|---|---|---|
| Persistent case header | `decision.jazan_generated_service_decisions` filtered by `case_id` | Query |
| Trend snapshot (overview) | `analytics.fct_jazan_{kpi}_performance` last 12 weeks for this municipality | Query |
| Top recommendation card | `output.jazan_recommended_intervention` rank=1 for this (muni, kpi) | Query |
| Composite risk score | `output.jazan_municipality_service_risk_score` for this (muni, kpi) | Query |
| RNN forecast chart | `output.jazan_service_rnn_forecast` + `analytics.fct_jazan_{kpi}_performance` | Query (both) |
| Anomaly card | `output.jazan_service_quality_anomaly` for this (muni, kpi) | Query |
| Recommendation list | `output.jazan_recommended_intervention` top 3 for this (muni, kpi) | Query |
| Evidence pack | Joined snapshot from the runtime outputs at moment of generation, stored on the candidate row | Query (stored snapshot, not live) |
| Draft narrative | Generated by `RT-JAZAN-DECISION-CANDIDATE`, stored on candidate row, bilingual | Query (stored) |
| Action button POSTs | `backend/routes.yaml` — five endpoints per action button | Backend |
| Recovery trajectory | `decision.jazan_visual_distortion_recovery_outcome` joined with case | Query |
| Pillar feedback | `decision.jazan_visual_distortion_recovery_outcome.contributing_pillars` | Query |

## Interactions

| Trigger | Behaviour |
|---|---|
| Tab click | Switch tab, URL updates `/{tab}`, scroll resets |
| Breadcrumb click | Navigate up one or two levels |
| Action button click | Open confirmation modal; on confirm, POST to backend route; render audit-log entry |
| "Open in MOMRAH reporting" | External link with audit log of who opened it |
| Edit MOMRAH narrative | Inline editor; save POSTs to backend; previous version archived |

## Bilingual

The draft MOMRAH narrative is the most language-sensitive element on this screen. The auto-drafted Arabic must be reviewed by a native speaker before any customer-facing demo. The narrative panel must visibly show both languages side-by-side (or stacked, based on viewport).

Required i18n keys: status names, tab names, action button labels, lifecycle stage names, panel titles, pillar names. Full list in `i18n/en.yaml` and `i18n/ar.yaml`.

## Renderer requirements

- Tabbed layout with URL-routed tabs (each tab is a separate path segment for bookmarking)
- Stacked-bar contribution breakdown
- Line chart with target overlay, forecast extension, confidence band, today marker
- Action button row with confirmation modal pattern
- Bilingual text panel (editable)
- Multi-step lifecycle breadcrumb
- Pillar credit grid (6 cells, two states: credited / not credited)
