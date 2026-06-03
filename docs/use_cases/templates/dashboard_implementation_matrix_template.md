# Dashboard Implementation Matrix Template

Use this template to define the canonical implementation inventory for every dashboard in a bundle.

This is the main bridge between:

- dashboard identity
- layout zones
- required components
- route structure
- governance evidence
- runtime evidence
- anti-drift rules

## For each dashboard

- Dashboard ID:
- Visible title:
- Route:
- Layout authority:
  - `screens/layout_zones.yaml#<dashboard_id>`
- Story-flow reference:
  - `screens/story_flow.yaml#<dashboard_id>`
- Business-alignment rows:
  - list of `business_alignment_matrix` IDs

### Required zones

For each zone define:

- Zone ID:
- Zone purpose:
- Width intent:
- Required components:
- Forbidden omissions:
- Flattening forbidden:

### Required components

For each component define:

- Component ID:
- Component type:
- Zone ID:
- Business purpose:
- Data binding reference:
- Runtime evidence required:
- Governance evidence required:
- Action surface:

### Governance and runtime evidence

- Required governance panels:
- Required lineage or record-spec touchpoints:
- Required runtime cards, logs, or execution history:

### Anti-drift rules

- Forbidden substitutions:
- Screen substitution forbidden:
- Generic card collapse forbidden:
- Mockup/rendered fidelity required:
