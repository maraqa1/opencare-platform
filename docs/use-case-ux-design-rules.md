# Use-Case UX Design Rules

These rules define how OpenCare use-case workspaces should present identity, navigation, titles, and theme.

## 1. One Use Case, One Identity

Each use case must have one canonical identity defined in the shared registry:

- workspace name
- shell label
- shell title
- persona badge
- primary admin/governance action

Do not invent alternate workspace names in page-level components once the registry name exists.

Examples:

- `Bed Pressure Intelligence`
- `Revenue Cycle Management`

Good:

- shell and page copy both reinforce the same workspace identity

Bad:

- shell says `Executive Revenue Workspace`
- tabs say `Revenue Cycle Management`
- page title says something else

## 2. One Navigation Vocabulary

Tab labels for a use case must come from one shared source.

Rules:

- use a shared tab registry for each use case
- preserve title casing across all surfaces
- do not shorten labels in one surface and expand them in another unless there is an approved design reason

Good:

- `Revenue Leakage` everywhere

Bad:

- `Revenue Leakage` in one file
- `Leakage` in another

## 3. Prefer Shared Navigation Components

Use the shared navigation primitives unless a use case has an approved exception:

- `NavigationShell` for the platform shell
- `TabNav` for workspace tabs
- `UseCaseWorkspace` when a page follows the standard workspace frame

If a use case needs a thin wrapper, that wrapper should delegate to the shared component rather than reimplementing the full pattern.

## 4. Shell Context Must Be Use-Case Driven

The global shell topbar must resolve from the current route using the shared use-case registry.

Required fields:

- label
- title
- badge
- action href
- action label

Do not fall back to historical project labels like phase names for active use-case routes.

## 5. Titles Must Follow a Stable Hierarchy

Use this hierarchy consistently:

1. platform shell title
2. workspace title
3. page/view title

Examples:

- Shell: `Revenue Cycle Workspace`
- Workspace: `Revenue Cycle Management`
- View: `Cash Command`

The shell should orient the user.
The workspace title should name the product surface.
The page/view title should name the operational mode.

## 6. Theme Is a System, Not a Page Decoration

Theme consistency includes:

- shared tokens
- shared typography
- shared spacing rhythm
- shared navigation treatment
- shared state colors

Rules:

- use CSS tokens from `apps/portal/app/globals.css`
- avoid page-specific color systems for active workspaces
- keep active tab styling, badges, buttons, and cards visually related across use cases

Allowed:

- page-specific content emphasis
- use-case-specific copy and metrics

Not allowed:

- separate visual language that makes one active workspace feel like a different product

## 7. Governance Must Stay Cross-Use-Case

Use-case workspaces can have operational personality, but governance entry points should stay consistent:

- same governance destination pattern
- same cross-workspace meaning
- same trust framing

## 8. New Use-Case Checklist

Before shipping a new use case:

1. Add identity metadata to the shared use-case registry.
2. Add canonical tabs to the shared use-case registry.
3. Confirm shell context resolves correctly from route.
4. Confirm page titles match the workspace identity hierarchy.
5. Confirm labels are identical across tabs, links, and headers.
6. Confirm theme uses shared platform tokens and components.
7. Confirm governance/admin entry points remain consistent.

## 9. Review Standard

When reviewing use-case UX, check:

- Is the workspace name stable?
- Is the menu vocabulary stable?
- Does the shell reinforce the same identity?
- Do page titles fit the hierarchy?
- Does the theme feel like OpenCare, not a side product?

