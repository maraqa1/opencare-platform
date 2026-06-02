# Story Flow Template

Use this file to declare the required narrative order of the dashboards.

This prevents implementation from preserving the data contract while losing the intended operating story.

## Required rule

The story flow is canonical.

If the bundle defines a dashboard order, implementation must preserve that order unless the bundle explicitly allows alternate navigation.

## Template

```yaml
story_flow:
  locale:
    default: en
    supported:
      - en
      - ar
  direction:
    en: ltr
    ar: rtl

  steps:
    - sequence: 1
      dashboard_id: "01_strategic_objective_monitoring"
      purpose: "Establish the strategic objective, KPI threshold state, and current breach posture."
      user_should_learn:
        - "Whether the objective is on track"
        - "Which KPI branch is in breach"
      next_dashboard: "02_model_intelligence_risk_overview"
```

## External action rule

Any story step that triggers an external action must declare:

- `human_authorization_required: true`
- `audit_event_type`
- `notification_side_effect`
- `ticket_side_effect`
