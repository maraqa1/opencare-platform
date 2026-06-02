# Dashboard Fidelity Contract Template

Use this file when a bundle declares dashboards that must be implemented with full fidelity to the source contract.

## Required rule

If a dashboard is declared in the bundle, implementation must prove that:

- the dashboard exists as a visible surface
- the required components are present
- the required data bindings are present
- the required actions are present
- the required governance and runtime evidence surfaces are present where declared
- the dashboard has not been collapsed into another screen or generic shell section

## Template

```yaml
dashboard_fidelity_contract:
  required_dashboard_count: 6
  required_dashboard_ids:
    - "01_strategic_objective_monitoring"
    - "02_model_intelligence_risk_overview"
    - "03_decision_command_centre"
    - "04_outcome_recovery_learning_feedback"
    - "05_runtime_evidence_execution_history"
    - "06_decision_queue_action_audit"

  fidelity_rules:
    dashboard_fidelity_required: true
    screen_substitution_forbidden: true
    generic_shell_substitution_forbidden: true
    silent_dashboard_merging_forbidden: true

  evidence_requirements:
    - dashboard_route
    - rendered_screen_capture
    - component_inventory
    - binding_inventory
    - action_inventory
    - governance_inventory
    - runtime_evidence_inventory
```

## Validation expectation

Every dashboard listed here must also appear in:

- `screens/dashboard_implementation_matrix.yaml`
- `screens/story_flow.yaml`
- `acceptance/dashboard_acceptance.yaml`
