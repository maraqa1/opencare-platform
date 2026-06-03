# Demo Story Arc — Jazan Performance Office Walkthrough

A click-through scenario built around two real Jazan municipalities. Use this as the live demo script. Every screen, panel, and number below maps to a YAML binding in the package so the demo is reproducible from seed data.

---

## Scenario A — Sabya Municipality: Visual Distortion KPI breach forecast

### Setup

**Municipality:** Sabya (بلدية صبيا) — second-largest in Jazan governorate, population ~228,000, mixed urban-rural, primary economic activity agriculture and trade, central market district densely commercial.

**Date in demo:** Monday, 7 September 2026

**Triggering signal:** The visual distortion closure quality KPI in Sabya has drifted from 0.83 (June baseline) to 0.71 over the past three weeks, driven by a citizen complaint cluster in the central market district about unlicensed billboards and three abandoned construction sites with overgrowth.

### Demo flow

**Screen 1 — Use Case Overview** (`/jazan-performance/use-cases/urban-service-quality-visual-distortion-loop`)

Open on the overview. The headline strip shows six KPIs across all 25 Jazan municipalities. Five are green or amber; **visual distortion closure quality** is red. The golden thread timeline shows the September weekly trend dipping below target. The active case banner names Sabya as the highest-risk municipality this week.

> *Talking point: "We're not waiting for the monthly report. This signal appeared in week 2 of September — twenty-six days before MOMRAH's quarterly review would have caught it."*

Click into the active case banner. The recommendation preview shows three analogue interventions, ranked.

---

**Screen 2 — KPI Contract & Monitoring**

Show the objective-to-KPI map: the strategic objective "Sustain and improve municipal service quality and visual distortion response" cascades into the six governed KPIs. Each KPI card shows: name (EN/AR), target, current value, owner, steward, last refreshed, and trigger threshold.

Filter to KPI 1 (visual distortion closure quality). The monitoring rule card shows: "When KPI < 0.75 for two consecutive weeks OR forecast breach probability > 0.70 for any of next 8 weeks, generate decision candidate."

> *Talking point: "The KPI didn't just deteriorate — it crossed two of the governed monitoring rules. That's why a candidate was generated. No ad-hoc judgement, no manual escalation."*

---

**Screen 3 — Model Intelligence & Risk Overview**

The runtime evidence panel shows three runtimes with last-run timestamps and admin status (all green). The model cards:

- **Forecast model card (RNN):** Sabya, KPI 1, forecast window Sept 8 → Nov 3. Breach probability against the 0.75 MOMRAH threshold: **0.78**. Confidence interval visible. The chart overlays actual (June–Sept) and forecast (Sept–Nov) curves; the forecast crosses below target around week 39.
- **Anomaly model card:** z-score against Sabya's 24-month baseline: **2.6**. Severity: high. The card shows which weekly observations contributed.
- **Composite risk score card:** **84/100, high tier**. Feature contributions visible: forecast breach probability 38%, anomaly z-score 24%, historical recurrence on KPI 1 in Sabya 18%, citizen complaint volume 20%.
- **Recommendation lookup card:** three ranked analogues, each with municipality, year, intervention type, and measured KPI recovery delta.

> *Talking point: "Every score is explainable. We're not asking your leadership to trust a black box. They can trace each contribution back to a real signal."*

---

**Screen 4 — Decision Command Centre**

The decision queue shows the Sabya candidate at the top, status "Awaiting Review", risk score 84, KPI 1.

Click the candidate. The detail drawer opens, showing:

- **Evidence pack:** current KPI value 0.71, forecast probability 0.78, anomaly z-score 2.6, citizen complaint cluster summary (anonymised), governance lineage to the underlying marts
- **Recommended actions** (ranked by historical effectiveness):
  1. *Accelerated inspection cycle* — Hofuf 2024, recovered +0.14 over 28 days
  2. *Contractor performance audit* — Najran 2023, recovered +0.09 over 35 days
  3. *Mobile evidence app deployment* — Buraydah 2025, recovered +0.11 over 42 days
- **Draft corrective action plan:** combined options 1 and 2, 14-day execution window, owner: Sabya field compliance, escalation pathway: Sabya assistant mayor for operations
- **Bilingual MOMRAH narrative** drafted, ready for review

Five action buttons available, each mapped to a backend POST endpoint with audit:

- **Approve** → creates corrective action, assigns owner, posts to action queue
- **Request revision** → returns to runtime with reason
- **Escalate** → notifies Emarah liaison with full pack
- **Create ticket** → opens MAKEEN ticket with bilingual brief
- **Notify owner** → emails Sabya assistant mayor with action package and SLA

Click **Approve** with light edits (priority elevated, evidence app deferred). The audit log entry appears immediately.

> *Talking point: "Nothing leaves this screen without a Performance Office authorisation. Every external system call — ticket, email, escalation — has a human signature behind it. This is your audit trail for MOMRAH and for the Emarah Diwan."*

---

**Screen 5 — Outcome Recovery & Learning Feedback**

Fast-forward in the demo to 12 November 2026 (post-action measurement). Open the recovery dashboard for the Sabya case.

- **Before / target / after table:** baseline 0.71, target 0.75, measured at day 30 = **0.85**. Recovery delta: +0.14, recovered above target.
- **Forecast accuracy panel:** predicted deterioration trajectory vs actual. The forecast was directionally correct, ~3 days early on the trough. Logged as "high" accuracy.
- **Recommendation effectiveness panel:** the accelerated inspection cycle (recommended #1) delivered the expected recovery. Effectiveness score for this intervention class is upweighted in the recommendation engine.
- **Feedback-to-pillars map:** the closed-loop evidence flows into Pillar 1 (Strategic Alignment), Pillar 4 (Early Warning), Pillar 5 (Decision Rhythm), and Pillar 6 (Knowledge Transfer). One closed case strengthens four pillars.
- **Closed-loop evidence ID:** unique, exportable, citable in the MOMRAH quarterly evidence pack.

> *Talking point: "This case is now permanent learning. The next Sabya-like signal, anywhere in the region, will surface this exact intervention with measured effectiveness. The system has memory."*

---

## Scenario B — Farasan Islands: Emergency readiness anomaly

A shorter secondary scenario, useful if the customer asks "how does this work for smaller municipalities?"

**Municipality:** Farasan (بلدية فرسان) — island municipality, population ~17,000, seasonal tourism load, remote logistics, ferry-dependent supply.

**Triggering signal:** Emergency and resilience readiness KPI dropped from 0.82 to 0.69 after the August inspection cycle, driven by two failed drill participations and an inspection completion shortfall. Citizen satisfaction did not move — the issue is operational readiness, not perception.

**Demo emphasis:**

- The anomaly detector caught this without a forecast breach (z-score 2.2, but the KPI is volatile in seasonal-tourism municipalities, so the forecast was not yet committing to a sustained breach)
- The recommendation engine returned different analogues than Sabya — Yanbu 2024 (also coastal/seasonal), Al-Ula 2023 (also remote logistics)
- The risk score weighted differently: anomaly z-score contribution was higher than forecast, reflecting the volatility profile
- The action plan reflected logistics constraints: 21-day window instead of 14, ferry-aware evidence submission
- Recovery outcome shows the recommendation engine learning per-municipality context

> *Talking point: "Farasan and Sabya are both 'Jazan municipalities', but the system does not treat them identically. The risk score profile and recommendation peer set respect each municipality's real character. This matters because Jazan has 25 municipalities ranging from urban to highland to island."*

---

## Demo timing guide

| Section | Time | Key emotional beat |
|---|---|---|
| Screen 1 — overview | 3 min | "We see the problem early." |
| Screen 2 — KPI contract | 3 min | "Every number is governed." |
| Screen 3 — model intelligence | 5 min | "The model explains itself." |
| Screen 4 — decision command | 8 min | "You are in control. The platform proposes; you decide." |
| Screen 5 — outcome feedback | 4 min | "The system learns. Memory compounds." |
| Scenario B (optional) | 5 min | "The system respects each municipality." |
| Q&A | 12 min | — |
| **Total** | **40 min** | |

---

## What to have ready before the demo

- Seed data loaded: 24 months of historical KPIs for at least three pilot municipalities (Jazan City, Sabya, Abu Arish recommended)
- Sabya scenario pre-seeded: KPI deterioration visible, forecast and anomaly outputs already computed, three recommendations pre-ranked
- Decision candidate present in the queue, not yet approved (the demo will approve it live)
- Recovery measurement data prepared for the November 12 fast-forward
- Bilingual labels reviewed by a native Arabic-speaking colleague before the customer sees the screens
- Empty-state banners covered or off-screen — the screens with no live data should not be navigated to during the demo without a clear "this is roadmap" framing
- Mode chip set to demo for the entire walkthrough; the customer must see "Demo data" labelled honestly, not "Live"

---

## Hard rules during the demo

These are non-negotiable for credibility with a Saudi government customer:

1. **Do not show fake green live status.** If a panel is on demo data, the chip says so. The customer's technical staff will check.
2. **Never reveal a placeholder.** If a component is not yet implemented, navigate around it, do not pretend.
3. **Arabic labels must be correct.** A single mistranslated KPI name in a Saudi government meeting is a credibility loss the rest of the demo cannot recover from. Have a native speaker review every visible string.
4. **Numbers must be defensible.** Every number on screen must trace to a query, a runtime, or a seeded source. If asked "where does this 0.78 come from?", the answer is on Screen 3, not "from our model".
5. **Human-in-the-loop is the headline.** The most-asked question from Saudi public-sector customers will be variations of "does this make decisions on its own?" The answer is always "no — every external action requires authorised approval". Demonstrate this physically on Screen 4 by hovering over the Approve button without clicking, then narrating the authorisation step.

---

*Demo script v1.1. Aligned to package urban-service-quality-visual-distortion-loop v1.0.8 contracts. Scenarios A and B are illustrative; numerical examples should be re-seeded to match the pilot baseline before customer delivery.*
