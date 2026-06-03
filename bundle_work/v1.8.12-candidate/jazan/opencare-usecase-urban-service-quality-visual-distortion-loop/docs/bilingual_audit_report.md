# Bilingual Audit Report

## Scope
- `assets/i18n/en.yaml`
- `assets/i18n/ar.yaml`
- `screens/bilingual_contract.yaml`

## Structural findings
- English and Arabic bundles expose the same visible i18n key families for objective, KPI, navigation, screen, status, chip, and action-button labels.
- `screens/bilingual_contract.yaml` already covers the mandatory dashboard-rigid component families required for strategic, KPI, decision, runtime, and audit surfaces.
- The case decision tab remains structurally bilingual through:
  - `bilingual_narrative_panel`
  - `case_action_button_row`
  - `audit_footnote_panel`
  - `confirmation_drawer`

## Translation-quality notes
- The Arabic file is explicitly marked as a draft requiring native-speaker review before customer-facing use.
- Several Arabic strings render as mojibake in Windows console output because of terminal encoding; the file should still be reviewed in a UTF-8 aware editor.
- Technical identifiers, runtime names, and certain evidence references should remain monospace or untranslated where the dashboard contract says they are identifiers, not prose.

## Missing-key assessment
- No missing English-or-Arabic key drift is expected for the core dashboard-visible contract keys after structural comparison.
- The validator now treats any English/Arabic key mismatch as a hard failure.

## RTL and composition notes
- RTL direction is declared in both bundle metadata and bilingual contract.
- Side-by-side bilingual composition is mandatory for the case decision narrative panel.
- Strategic objective, KPI threshold, runtime, and audit components remain covered by bilingual contract rules and family rules.

## Follow-up
- Perform native Arabic terminology review for MOMRAH, Emarah Diwan, and municipal-operational vocabulary before external delivery.
