# Portal Implementation

## Workspace Routes

The RCM workspace is mounted at `/use-cases/revenue-cycle-management`.

Pages:

- `cash-command`
- `recovery-queue`
- `decision-queue`
- `payer-control`
- `revenue-leakage`
- `team-performance`
- `executive-narrative`

## Components

Key files:

- `apps/portal/components/RCMDashboard.tsx`
- `apps/portal/components/RevenueCycleConsole.tsx`
- `apps/portal/components/rcm/RevenueCycleJourney.tsx`
- `apps/portal/components/rcm/views/CashCommand.tsx`
- `apps/portal/components/rcm/views/RecoveryQueue.tsx`
- `apps/portal/components/rcm/views/DecisionQueue.tsx`
- `apps/portal/components/rcm/views/PayerControl.tsx`
- `apps/portal/components/rcm/views/Leakage.tsx`
- `apps/portal/components/rcm/views/TeamPerformance.tsx`
- `apps/portal/components/rcm/views/ExecutiveNarrative.tsx`

## Board Pack

Report files:

- `apps/portal/app/api/v1/revenue-cycle/board-pack/route.ts`
- `apps/portal/lib/rcm-board-pack.ts`
- `apps/portal/public/reports/revenue-cycle-board-pack-prompt.md`
- `apps/portal/public/reports/revenue-cycle-board-pack-sample.html`

The report must consume the backend board-pack payload and must show Data Trust last.

## UI Acceptance

- Cash Command tells the financial story before showing charts.
- Recovery Queue is action-oriented and ranked by value, effort, due date, and owner.
- Decision Queue shows approval cycles and not just a static table.
- User-facing copy avoids unexplained abbreviations such as AR.
- Empty states are truthful and identify missing data sources.
