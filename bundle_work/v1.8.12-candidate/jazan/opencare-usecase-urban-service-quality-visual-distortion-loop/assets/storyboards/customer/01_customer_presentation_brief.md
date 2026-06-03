# Urban Service Quality & Visual Distortion Assurance Loop
## حلقة ضمان جودة الخدمات الحضرية ومعالجة التشوه البصري

**Customer:** Jazan Performance Management Office · مكتب إدارة الأداء — منطقة جازان
**Sponsoring framework:** Saudi Vision 2030 · National Transformation Program · MOMRAH Municipal Performance Index (مؤشر الأداء البلدي)
**Status:** Pilot-ready · 25 municipalities in scope

---

## 1. Executive summary

The Jazan Region operates **25 municipalities** delivering urban services to roughly **1.6 million residents** across a 13,000 km² area that ranges from coastal Farasan to mountainous Fayfa. Municipal performance is reported nationally through the MOMRAH Municipal Performance Index, audited against Vision 2030 Quality of Life targets, and watched in real time by citizens through Balady and social channels.

Today, performance is **measured monthly and acted on reactively**. By the time a KPI breach is visible in a MOMRAH report, the underlying citizen experience has already deteriorated, and the corrective response is documented but rarely measured for recovery effectiveness. There is no continuous early-warning loop, no standard recommendation library, no closed-loop learning between intervention and outcome.

This use case delivers exactly that loop: **continuous KPI monitoring → forecast and anomaly detection → composite risk score → recommendation lookup → human-approved decision → corrective action → measured recovery → learning feedback**. It is fully aligned to MOMRAH performance categories, governs every transition through human-in-the-loop approval and audit, and produces the evidence packs Jazan needs for national reporting.

---

## 2. Why this matters for Jazan

**Strategic alignment.** Vision 2030's Quality of Life Program names municipal service excellence as a national outcome. The National Transformation Program tracks municipal digital transformation as a sectoral commitment. The MOMRAH Performance Index ranks all Saudi municipalities annually against standardised KPIs. Jazan's performance position is publicly comparable to every other region in the Kingdom.

**Operational reality in Jazan.** The region's 25 municipalities are not interchangeable. Jazan City and Sabya are urbanised hubs with high request volumes and dense permit pipelines. Farasan and Fayfa are remote and seasonal. Abu Arish and Samtah straddle urban-rural delivery. A single performance treatment cannot work for all of them — the risk score must respect each municipality's baseline, and recommendations must come from the right peer set.

**National context.** The Saudi visual distortion programme (مكافحة التشوه البصري) has been active since 2019. MOMRAH and regional Emarah offices set targets for case closure quality and citizen satisfaction. Closure *quality* — not just closure rate — is now the audited measure: a case closed without proper evidence or with poor downstream durability does not count.

**The current gap.** Jazan today operates on five disconnected layers: source systems (Balady, MAKEEN, GIS, satisfaction surveys), monthly Excel rollups, manual quality reviews, ad-hoc corrective directives, and informal verification. The five layers do not share definitions, do not share state, and do not produce a recoverable audit trail. This use case unifies them under one governed pipeline.

---

## 3. The business problem

Three problems compound:

**The visibility problem.** KPI deterioration is detected only after monthly reporting cycles. By that point, citizen complaints have already escalated, MOMRAH has already taken note, and the corrective window has narrowed.

**The action problem.** When a breach is identified, the corrective response is built from scratch each time. Officers do not have a structured library of what has worked before in comparable municipalities. The same interventions are reinvented case by case, and weak interventions are repeated because nobody measured their effectiveness last time.

**The loop problem.** Once an action is taken, recovery is rarely measured against the original breach. There is no quantitative feedback into the next decision cycle, so the model of "what works" never improves. The system has no memory.

The cost of this is concrete: lower MOMRAH index scores, citizen dissatisfaction in priority districts, repeat enforcement costs on the same offenders, and a reactive performance culture that consumes leadership attention on incidents rather than on strategy.

---

## 4. The use case in one paragraph

Six governed KPIs flow continuously from source municipal systems through curated dbt marts. Three platform runtimes — an RNN forecast horizon of 4–8 weeks, a z-score anomaly detector, and a composite risk-scorer — generate municipality-level risk signals. A similarity-based recommendation engine surfaces what has worked in comparable historical cases. The platform produces decision *candidates*, never autonomous actions. The Jazan Performance Office reviews each candidate, approves or revises, assigns ownership, and tracks the corrective action through evidence submission, verification, and closure. Recovery is measured against the original baseline thirty days after closure. Effectiveness data feeds back into the recommendation engine and is summarised in evidence packs aligned to MOMRAH reporting categories.

---

## 5. The six governed KPIs

Each KPI carries an Arabic name, an explicit formula, a source mart, an owner, and a target tied to a MOMRAH reporting category. The customer can audit every number end-to-end.

| # | KPI (EN) | KPI (AR) | Formula | Source mart | Target | MOMRAH category |
|---|---|---|---|---|---|---|
| 1 | Visual distortion closure quality | جودة تنفيذ إغلاق بلاغات التشوه البصري | (Cases closed with verified evidence within SLA) ÷ (Total cases closed in month) | analytics.fct_jazan_visual_distortion_performance | ≥ 0.85 | Urban environment |
| 2 | Service request closure rate | نسبة إغلاق طلبات الخدمات | (Service requests closed within SLA) ÷ (Total service requests received) | analytics.fct_jazan_service_quality | ≥ 0.90 | Service delivery |
| 3 | Average permit issuance time | متوسط إصدار الرخص | mean(approval_date − submission_date) in working days, per permit category | analytics.fct_jazan_permit_performance | ≤ 5 days (commercial), ≤ 14 days (building) | Investment enablement |
| 4 | Urban service coverage | نسبة تغطية الخدمات الحضرية | (Population in districts with full service coverage) ÷ (Total municipal population) | analytics.fct_jazan_service_coverage | ≥ 0.95 | Service equity |
| 5 | Emergency and resilience readiness | مؤشر صمود الأزمات والطوارئ | Weighted composite of inspection completion, drill participation, and recovery time | analytics.fct_jazan_emergency_readiness | ≥ 0.80 | Resilience |
| 6 | Citizen satisfaction | رضا المستفيدين | Quarterly survey net promoter score, weighted by municipality population | analytics.fct_jazan_citizen_satisfaction | ≥ 0.75 | Citizen experience |

Every KPI has an owner (named role, not individual), a steward in the Data & Analytics Office, a monitoring cadence, and a trigger threshold that creates a decision candidate when crossed.

---

## 6. The intelligence layer

Three named runtimes, each with declared inputs, outputs, and refresh schedules.

**Forecast runtime (RNN, GRU/LSTM family).** Reads twelve months of monthly KPI history and citizen-satisfaction trend, predicts 4–8 weeks ahead for each KPI in each municipality. Outputs a breach probability against the configured target. Operates only on curated marts — never on raw source tables.

**Anomaly runtime (z-score against 24-month baseline).** Detects abrupt deteriorations even when the forecast horizon hasn't yet flagged a sustained breach. Useful for catching one-off incidents (a contractor walkout, a sudden inspection volume drop) that the forecast would smooth over.

**Composite risk score.** Transparent blend (configurable weights) of: forecast breach probability, anomaly z-score, historical recurrence on the same KPI in the same municipality, and severity-adjusted citizen complaint volume. Returns a 0–100 score with explicit feature contributions visible in the workspace. No black box — every score is explainable to a non-technical reviewer.

**Recommendation lookup.** Given a (municipality, KPI, risk profile) tuple, finds the top-N historical interventions in comparable municipalities and ranks them by measured recovery effectiveness. Each recommendation surfaces its source case, the contributing factors, and the recovered KPI delta.

---

## 7. The decision and action layer

Every recommendation becomes a **decision candidate**, not a decision. The candidate package contains:

- The KPI breach evidence (current vs target, trend, forecast curve)
- The composite risk score with feature breakdown
- Up to three ranked recommendations with historical effectiveness
- A draft corrective action plan and proposed owner
- Audit-ready bilingual narrative for MOMRAH reporting

The Performance Office reviews the candidate and takes one of five actions: **approve**, **request revision**, **escalate**, **create ticket**, **notify owner**. Each action is logged with timestamp, user, role, and rationale. No external notification, ticket, or escalation is ever sent without an authorised user's approval.

Corrective action lifecycle is six stages: assigned → in progress → evidence submitted → verified → closed → measured. Evidence requirements are explicit per intervention type — GPS-stamped photos for field inspections, signed contractor reports for procurement actions, citizen satisfaction re-survey for experience issues.

---

## 8. The feedback loop

Thirty days after closure, the recovery outcome is measured against the original baseline. The platform computes:

- **Recovery delta**: how much did the KPI improve?
- **Forecast accuracy**: did the forecast match the actual deterioration trajectory?
- **Intervention effectiveness**: did the recommended action produce the expected recovery?

These three measurements feed three downstream effects: the recommendation engine updates its effectiveness ranking, the forecast runtime adds the case to its training history, and the evidence pack for MOMRAH reporting acquires a new closed-loop entry. Over time, recurring patterns surface as candidates for codification into standing procedures and field training.

---

## 9. Sample scenario — Sabya Municipality, September 2026

A concrete walk-through (see also `02_demo_story_arc.md` for the full demo flow):

In early September, Sabya's visual distortion closure quality drifts from 0.83 to 0.71 over three weeks — a citizen complaint cluster in the central market district about unlicensed billboards and several abandoned construction sites with overgrowth. The forecast runtime predicts a 78% probability of MOMRAH target breach in October. The anomaly detector confirms with a 2.6 z-score against Sabya's 24-month baseline. The composite risk score returns 84/100, "high" tier.

The recommendation engine finds three analogue cases: accelerated inspection cycle (recovered KPI by +0.14 in Hofuf in 2024), contractor performance audit (recovered +0.09 in Najran in 2023), mobile evidence app deployment (recovered +0.11 in Buraydah in 2025). A decision candidate is created — bilingual narrative, evidence pack, draft action plan.

The Performance Office reviews on September 6, escalates priority, approves the accelerated inspection cycle combined with the contractor audit, assigns to Sabya field compliance. A ticket is created in MAKEEN, the assistant mayor for operations receives a notification. The action lifecycle runs: 24 inspections complete in week one, GPS-stamped evidence submitted October 12, verification passed October 15. On November 12, the recovery measurement returns KPI = 0.85 — recovered above target.

This entire sequence — twelve weeks of operational performance management — is captured in one auditable record, with every transition, approver, evidence artefact, and outcome attributable. It is the unit of evidence Jazan can submit to MOMRAH and reference internally for next year's similar cases.

---

## 10. Expected outcomes and value

**Within 90 days of pilot launch:**

- Continuous visibility on six KPIs across all 25 municipalities, replacing monthly Excel rollups
- First decision candidates generated, reviewed, and converted to corrective actions
- Bilingual MOMRAH-aligned evidence packs available for quarterly reporting

**Within 12 months:**

- Recommendation library of 50+ real Jazan corrective actions, with measured effectiveness
- Forecast accuracy benchmarked against actual outcomes; recommendation effectiveness benchmarked against measured recovery
- First codified standing procedures derived from repeating patterns
- Quantifiable lift on at least three KPIs vs the baseline year

**Strategic outcomes:**

- Movement on the MOMRAH Municipal Performance Index ranking
- Demonstrable Vision 2030 Quality of Life contribution
- Defensible audit trail for every corrective action taken in the region
- A repeatable template for the other twelve regions of the Kingdom

---

## 11. What we need from Jazan to make this real

The pilot requires the following from Jazan over the first 60 days:

1. **Data access**: read-only connections to Balady service-request data, MAKEEN inspection and permit data, GIS service-coverage layers, and the existing satisfaction survey instrument
2. **Governance assignment**: a named owner per KPI, a named steward per dataset, and a designated Performance Office reviewer pool
3. **Pilot scope decision**: whether to start with all six KPIs across all 25 municipalities, or to phase by KPI or by municipality cluster (recommended: start with KPIs 1, 2, and 6 across three pilot municipalities — Jazan City, Sabya, Abu Arish — for the first 90 days)
4. **Workshop time**: three half-day sessions with Performance Office leadership to validate KPI definitions, target thresholds, and the recommendation library seed
5. **Reporting alignment**: a single liaison with the MOMRAH regional reporting team to ensure evidence packs match current submission templates

---

## 12. Governance, data residency, and compliance

**Data residency.** All raw and curated data remains inside Saudi infrastructure, in compliance with the Personal Data Protection Law (PDPL) and NDMO classification policy. No source-domain or raw-layer data is exposed to portal components or external dashboards under any circumstance.

**Access control.** Role-based access for Performance Office, Mayor's Office, Field Compliance, and MOMRAH liaison roles. Decision approval requires Performance Office authorisation; ticket creation requires Mayor's Office or delegated authority; evidence verification requires Field Compliance. Every transition is audit-logged with user, role, timestamp, and rationale.

**Data classification.** Citizen complaint identifiers and personally-identifying fields are classified Restricted and suppressed in workspace views; aggregated municipality-level KPIs are classified Internal; published MOMRAH evidence packs follow MOMRAH classification.

**Audit and evidence.** Every decision candidate, every approval, every action, and every recovery measurement produces an immutable audit record. Evidence packs are exportable in bilingual format suitable for MOMRAH, internal Emarah review, and Vision 2030 PMO inquiries.

**Human-in-the-loop.** The platform does not autonomously notify citizens, escalate to ministry, or instruct field teams. Every external-facing action requires explicit human authorisation. The forecast and recommendation systems are decision-support, not decision-makers.

---

## 13. Closing

This use case takes Jazan from a performance reporting cycle to a performance loop — from monthly visibility to continuous, from reactive correction to proactive prevention, from one-off actions to a learning library. It is purpose-built for Saudi municipal context, aligned to the MOMRAH framework, governed under PDPL and NDMO, and ready to evidence its value within a single quarter.

We propose a 90-day pilot in three municipalities, scoped to three KPIs, with a clear go/no-go review against measured outcomes. From there, scaling to all 25 municipalities and all six KPIs is a matter of operational rollout rather than further engineering.

— *منطقة جازان — حلقة ضمان جودة الخدمات الحضرية ومعالجة التشوه البصري*

---

*Document version 1.1 · Source-of-truth: governed YAML contracts in package urban-service-quality-visual-distortion-loop. Visual mockups under assets/dashboard-designs/ are reference only. All numerical examples are illustrative pending pilot baseline measurement.*
