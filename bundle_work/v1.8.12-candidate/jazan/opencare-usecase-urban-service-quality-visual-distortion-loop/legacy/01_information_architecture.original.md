# Information architecture — three-level navigation hierarchy

The Jazan use case navigates in three levels with cross-cutting function views. Do not implement six parallel top-level screens — that pattern is what made prior packages feel generic.

## Levels

### Level 1 — Strategic landing

**One screen**, the package's entry point. Shows the strategic objective cascading to six governed KPIs with threshold bars indicating breach / approaching trigger / meeting target. Includes a portfolio rollup (count of KPIs in each state) and a single high-priority "active case" banner that hands the user to a specific operational situation.

- **URL**: `/jazan-performance/use-cases/urban-service-quality-visual-distortion-loop`
- **User intent**: *Where is the portfolio at risk?*
- **Drill paths**:
  - Click a KPI card → Level 2 (that KPI's workspace)
  - Click the "Review case" button → Level 3 (the active case)
- **Time on screen in demo**: 3 minutes

### Level 2 — KPI workspace

**Six instances**, one per governed KPI. Shows one KPI across all 25 Jazan municipalities — ranking, distribution, trend, governance details, and a list of open cases on this KPI.

- **URL**: `/.../kpi/{kpi_slug}` where `kpi_slug` ∈ `visual-distortion-closure-quality`, `service-request-closure-rate`, `permit-issuance-time`, `urban-service-coverage`, `emergency-readiness`, `citizen-satisfaction`
- **User intent**: *For this KPI, which municipalities need attention?*
- **Drill paths**:
  - Click a municipality row → Level 3 (case workspace for that municipality on this KPI)
  - Up arrow / breadcrumb → Level 1
- **Time on screen in demo**: 2 minutes per KPI walked

### Level 3 — Case workspace

**N instances**, one per active (municipality, KPI) case. Each case is identified by `case_id` (e.g. `JZN-DEC-1007` for Sabya visual distortion). Internal tab structure:

- **Overview tab** — the case in one screen: current KPI vs target, risk score summary, open recommendations, action lifecycle status
- **Model intelligence tab** — explainable risk score breakdown, forecast curve, anomaly detection, recommendation list with comparable historical cases
- **Decision command tab** — case evidence pack, draft MOMRAH narrative (bilingual), action buttons (Approve, Request revision, Escalate, Create ticket, Notify owner)
- **Outcome recovery tab** — before / target / after measurement, forecast accuracy, intervention effectiveness, feedback into strategic pillars (only populated after action closure)

- **URL**: `/.../kpi/{kpi_slug}/case/{case_id}/{tab}` where `tab` ∈ `overview` (default), `intelligence`, `decisions`, `recovery`
- **User intent**: *What decision do I make and what action follows?*
- **Drill paths**:
  - Tab navigation within the case
  - Up arrow / breadcrumb → Level 2 (the parent KPI workspace)
  - "View runtime evidence" link → cross-cutting runtime view (with the relevant runtime pre-selected)
  - "View full audit" link → cross-cutting decision audit (with this case pre-selected)
- **Time on screen in demo**: 12 minutes (4 minutes × 3 tabs walked; recovery tab fast-forwarded)

## Cross-cutting function views

Three views accessible from any level via the persistent sidebar. They aggregate across the hierarchy rather than drilling down through it.

### Decision command queue

Lists every open decision candidate across all KPIs and all municipalities. Status counts at top (new, under review, approved, escalated, tickets created, emails sent). Detail drawer when a row is selected drills the user into the case context without leaving the queue view. Effectively bridges cross-cutting and case-scoped navigation in one screen.

- **URL**: `/.../decisions`
- **User intent (Performance Office reviewer)**: *What's awaiting my decision today?*
- **Time on screen in demo**: 8 minutes (this is the highest-leverage demo screen)

### Runtime evidence & execution history

Shows the three platform runtimes with status, schedule, last run, duration, rows out, seven-day history, input and output tables. For technical and audit stakeholders who need to verify the engine is operational.

- **URL**: `/.../runtimes`
- **User intent (IT lead, MOMRAH audit)**: *Is the intelligence pipeline actually running?*
- **Time on screen in demo**: 4 minutes

### Decision audit & action tracker

Full lifecycle audit view: decision queue + action history per decision (timestamps, channel, result) + email-sent log + ticket-created log + corrective action tracker with evidence status. For governance and audit stakeholders.

- **URL**: `/.../audit`
- **User intent (Emarah Diwan auditor)**: *Where is the proof for every action taken in the last quarter?*
- **Time on screen in demo**: 5 minutes

## What's where

| Element | Level 1 | Level 2 | Level 3 | Cross-cut |
|---|---|---|---|---|
| Strategic objective | ✓ | — | — | — |
| KPI definition + trend | — | ✓ | ✓ (overview tab) | — |
| Municipality ranking | — | ✓ | — | — |
| Risk score breakdown | — | — | ✓ (intelligence tab) | — |
| Forecast curve | — | ✓ (aggregate) | ✓ (per case) | — |
| Recommendations | — | — | ✓ (intelligence tab) | — |
| Decision actions | — | — | ✓ (decisions tab) | — |
| Recovery measurement | — | — | ✓ (recovery tab) | — |
| Cross-case decision queue | — | — | — | ✓ (decisions) |
| Runtime execution status | — | — | — | ✓ (runtimes) |
| Full action audit | — | — | — | ✓ (audit) |

## Why three levels not five flat screens

Five parallel screens (the structure of v1.0.7 / v1.0.8) make every screen carry "what is this for?" navigation overhead. The user lands on a generic overview that mixes strategic and operational. To act on a specific case, they have to traverse "model intelligence" → "decision command" → "recovery" without the system tracking which case they're working on.

Three levels make the unit of navigation match the unit of work:

- **Strategic** answers "where to look?" (one question)
- **Tactical** answers "for this KPI, which case?" (one question)
- **Operational** answers "for this case, what to do?" (one question)

Each level answers exactly one question. The user is always in one scope. Bookmarkable URLs preserve scope. Breadcrumbs always show the path. The audit trail becomes navigable because cases have identity.

This is also how Saudi government performance management actually operates: MOMRAH rolls up by KPI; the Emarah Diwan tracks by municipality; the Performance Office handles individual cases. The IA mirrors the institution.
