# Revenue Cycle Management Demo

## Core message

This platform turns hospital revenue from retrospective reporting into real-time cash control.

## Demo flow

1. CFO opens **Cash Command**.
2. Sees recoverable cash this week.
3. Opens a top action such as a high-value denial or payer underpayment review.
4. Reviews payer contract breach evidence.
5. Assigns a recovery owner.
6. Opens **Recovery Queue**.
7. Shows expected recovery and due date.
8. Opens **Team Performance**.
9. Shows expected versus actual recovery.
10. Ends with **Executive Narrative**:
    This platform turns hospital revenue from retrospective reporting into real-time cash control.

## Executive framing

- Cash Command answers: how much cash can we still recover this week?
- Recovery Queue turns opportunities into owned work with due dates and effort.
- Payer Control exposes underpayment and SLA breach behavior as a contract-enforcement problem.
- Leakage decomposes lost value into specific operational failure modes.
- Team Performance shows whether expected recovery is turning into actual cash.
- Executive Narrative converts the operating data into a CFO-readable story.

## Before and after

These are demo targets, not live UI values unless clearly marked elsewhere.

### Before

- AR Days 68
- Denial Rate 11%
- Visibility monthly
- Actions reactive

### After

- AR Days target 38
- Denial Rate target 5%
- Visibility real-time
- Actions prioritized and tracked

## Demo talk track

- Start with the cash command, not a chart gallery.
- Explain that recoverable cash is ranked by expected recovery and effort, not just volume.
- Show that payer accountability is grounded in contracted versus actual performance.
- Move into the queue to show execution ownership and deadlines.
- Close with expected versus actual recovery to prove the system is operational, not retrospective.

## Validation notes

- Empty states must remain truthful when revenue-cycle data has not been loaded yet.
- Revenue APIs read analytics and decision schemas only.
- Superset dashboard sync uses ORM inside the Superset pod and must not create charts with the REST chart POST or PUT endpoints.
