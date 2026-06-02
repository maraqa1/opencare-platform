# Dashboard Implementation Matrix Template

Use this file when a bundle declares one or more dashboards that must be implemented exactly as defined.

## Required rule

If a dashboard appears in this matrix, implementation must render that dashboard directly.

It may not:

- collapse it into another screen
- merge it into a generic shell section
- substitute another dashboard
- omit required components

## Template

```yaml
dashboards:
  - dashboard_id: "01_strategic_objective_monitoring"
    route: "/use-cases/<slug>"
    audience:
      - executive
      - operational_lead
    business_question:
      - "Is the strategic objective on track and which KPI branch is in breach?"
    must_render:
      - hero_banner
      - objective_card
      - metric_strip
      - kpi_status_grid
      - priority_case_banner
    must_bind:
      - analytics.<fact_table>
      - output.<runtime_output>
    must_show_actions:
      - review_case
    must_show_governance:
      - lineage
      - record_spec
      - freshness
    must_show_runtime_evidence: false
    screen_substitution_forbidden: true
```

## Validation expectation

Every dashboard listed here must also appear in:

- `screens/screen_catalog.yaml`
- `screens/story_flow.yaml`
- `acceptance/dashboard_fidelity_contract.yaml`
