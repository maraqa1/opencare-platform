# Dashboard Contract Template

Use this template for each canonical dashboard in a use case.

A dashboard contract is not complete unless it defines:

- business purpose
- route
- zone structure
- component set
- visual grammar
- data bindings
- action rules
- governance evidence
- fidelity acceptance

## 1. Dashboard identity

- Dashboard name:
- Dashboard ID:
- Dashboard slug:
- Visible title:
- Route:
- Audience:
- Workspace position:

## 2. Business purpose

- What decision should this dashboard support?
- What should a user understand within 30 seconds?
- What question must this dashboard answer before the user moves on?

## 3. Canonical zones

List zones in required order.

For each zone define:

- Zone ID:
- Zone purpose:
- Width intent:
- Nesting rules:
- Required components:
- Flattening forbidden:
- Render assertion:

## 4. Required components

For each component define:

- Component ID:
- Component type:
- Business meaning:
- Data binding:
- Required anatomy:
- Required labels:
- Required bilingual behavior:
- Allowed states:
  - populated
  - empty
  - loading
  - hidden
  - blocked

## 5. Visual grammar

Define:

- density
- status badge rules
- threshold rail requirements
- connector line requirements
- CTA prominence
- bilingual label placement
- visual non-negotiables
- style-flexible elements

## 6. Data bindings

- Primary datasets:
- Required marts:
- Runtime outputs:
- Governance evidence sources:

For each critical component define:

- source dataset
- grain
- aggregation logic
- filters
- sort order

## 7. Actions

List visible actions.

For each action define:

- label
- purpose
- preconditions
- required evidence
- authorization requirement
- audit event
- external side effect if any

## 8. Governance and runtime evidence

- Required governance elements:
- Required runtime evidence elements:
- Required lineage entry points:
- Freshness or quality badges:

## 9. Empty-state behavior

- What should show when no data exists?
- What should show when only partial data exists?
- What should not be faked?

## 10. Fidelity and anti-drift rules

- Required visual elements:
- Forbidden simplifications:
- Screen substitution forbidden:
- Dashboard fidelity required:
- Mockup traceability required:

## 11. Validation

- Route resolves
- Required zones render
- Required components render
- Data bindings resolve
- Governance evidence visible
- Runtime evidence visible where required
- Rendered conformance evidence captured
