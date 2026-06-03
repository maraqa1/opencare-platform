# Screen 06 — Cross-cutting decision audit & action tracker

**Path**: `/jazan-performance/use-cases/urban-service-quality-visual-distortion-loop/audit`
**Implements**: Cross-cutting function view
**Renders for**: Emarah Diwan auditor, MOMRAH liaison, internal compliance

## Purpose

Full lifecycle audit view. Where Screen 04 (decision command) shows what's awaiting decision, this screen shows what has been decided, what action was taken, what evidence was submitted, what tickets were created, and what notifications were sent. This is the audit surface — defensible to government audit teams.

## Regions

### Region 6.1 — Page header

- Title (bilingual): `Decision queue & action audit`
- Subtitle: `See decisions, actions taken, emails, tickets and audit trail`
- Mode chip: `Demo data · seeded`
- Locale toggle

### Region 6.2 — Lifecycle counters strip

Eight-column strip (two more columns than Screen 04 because this view includes the full lifecycle):
- New decisions
- Under review
- Approved
- Escalated
- Tickets created
- Emails sent
- Actions in progress
- Actions closed

### Region 6.3 — Decision queue (table)

Similar columns to Screen 04, with one additional Actions column showing all available audit actions per row (view, edit, ticket history, email log, evidence, archive).

This is the same underlying data as Screen 04, but with audit-focused affordances rather than decision-focused.

### Region 6.4 — Action history per selected decision

When a decision is selected, show:

**Time-ordered action log**:
| Time | Performer | Channel | Result | Created record | Notes |
|---|---|---|---|---|---|
| 07 Sep 06:30 | Performance Office | Portal | Approved | Decision EVT-9001 | Reviewer added priority elevation |
| 07 Sep 06:31 | System | Portal | Created corrective action | ACT-0001 | Action assigned to Field Compliance |
| 07 Sep 06:32 | System | Email | Sent notification | NOTIF-771 | Sent to Asst Mayor for Operations |
| 07 Sep 06:33 | System | Ticketing | Ticket created | TCK-0045 | Priority High; linked decision JZN-DEC-1007 |

Every row is immutable. The audit log is append-only.

### Region 6.5 — Email-sent panel

Compact card showing the latest email artefact sent for the selected decision:
- To (recipient role)
- Subject
- Body excerpt (bilingual)
- Sent timestamp
- Linked decision ID

If multiple emails were sent, show the most recent and a "show all (N)" link.

### Region 6.6 — Ticket-created panel

Compact card showing the latest ticket artefact:
- System (e.g. MAKEEN, Service Desk)
- Ticket ID (font-mono)
- Priority
- Status
- Linked decision ID
- Linked action ID

### Region 6.7 — Corrective action tracker (table)

One row per corrective action with columns:
- Action ID (font-mono)
- Decision ID (linkable back)
- Action plan summary (intervention type)
- Owner role
- Status (assigned / in progress / evidence submitted / verified / closed)
- Due date
- Evidence status (pending / submitted / verified / overdue)
- Next step

This is the table that auditors will scrutinise. The evidence-status column is the most important field — anything "Pending" or "Overdue" for an extended period is a visible accountability gap.

### Region 6.8 — Footer

Audit assertion: *"All actions are audit-logged and traceable end-to-end. No automated external escalation without human approval."*

## Data bindings

| Component | Source | Binding type |
|---|---|---|
| Lifecycle counters | `decision.jazan_decision_action_events` aggregated by current_status | Query |
| Decision queue | Same as Screen 04 but unfiltered (includes closed/archived) | Query |
| Action history | `decision.jazan_decision_action_events` filtered by selected decision_id, ordered by event_ts | Query |
| Email log | `decision.jazan_notification_log` filtered by decision_id | Query |
| Ticket log | `decision.jazan_ticket_log` filtered by decision_id | Query |
| Corrective action tracker | `decision.jazan_corrective_actions` joined with `dim_jazan_municipality` | Query |

## Interactions

| Trigger | Behaviour |
|---|---|
| Row click in decision queue | Select decision; populate action history, email panel, ticket panel |
| Click action ID in tracker | Open action detail view |
| Click "Linked decision" | Navigate to that decision in this view |
| Click ticket ID | External link to the ticketing system (with audit log of who opened it) |
| Click email "show all" | Expand email log to full list |

## Honest signalling

The action tracker must show real states. If an action is overdue or pending evidence, it shows that — do not hide it. Saudi audit teams respect honest visibility into gaps more than they respect cosmetic perfection.

## Bilingual

The action history table renders in active locale. Performer roles, action descriptions, and notes are bilingual where authored. System-generated records (e.g. "Created corrective action") use the locale-appropriate string from i18n keys.

## Renderer requirements

- Append-only immutable action log table
- Linked-record drill-through (decision → action → email → ticket)
- Evidence-status indicator with overdue highlighting
- External link with audit logging
- Bilingual table cells where authored content exists
