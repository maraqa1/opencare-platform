# Governance policies — Jazan use case

This document is the basis for the package's `governance/policies.yaml`, `governance/data_catalog.yaml`, and role-based access control declarations. Codex should translate this prose into the structured YAML files the platform expects, preserving every constraint stated here.

## 1. Regulatory framework

**Saudi Personal Data Protection Law (PDPL).** Citizen identifiers are personal data. Aggregate KPIs computed from citizen interactions are not. The package must enforce this distinction at the data-classification level and at the response level.

**NDMO Data Classification.** All datasets in the package carry an NDMO classification: Restricted, Confidential, Internal, or Public. Workspace components render Internal-classified data by default. Restricted data is masked unless the requesting role has explicit clearance.

**MOMRAH Municipal Performance Index reporting.** Every quarterly report submitted to MOMRAH must be reproducible from this package's evidence packs. The audit log must capture every action that contributed to a number on a MOMRAH report.

## 2. Data classification map

| Data type | NDMO class | Workspace visibility |
|---|---|---|
| Aggregate KPI values per (municipality, month) | Internal | Visible to performance_office, mayor_office, momrah_liaison, emarah_diwan_audit |
| Citizen identifiers (national ID, phone, address) | Restricted | Masked in all workspace components |
| Citizen complaint text content | Confidential | Aggregated and analysed; raw text masked |
| Officer/employee identifiers | Confidential | Masked to role-level only |
| Forecast and anomaly scores | Internal | Visible to all roles in the use case |
| Decision candidates | Internal | Visible to performance_office and above |
| Audit log entries | Confidential | Visible to emarah_diwan_audit, compliance, admin |

## 3. Role-based access control

- `performance_office` — Primary user. Can view all Internal data, take all decision actions.
- `mayor_office` — Can view all Internal data. Can approve and create tickets. Cannot un-approve or delete audit log.
- `field_compliance` — Scoped to assigned municipality. Cannot view other municipalities' Restricted data.
- `data_analytics` — System observability. Cannot take decision actions.
- `momrah_liaison` — Read-only across all cases and audit. Can view evidence packs.
- `emarah_diwan_audit` — Read-only across all data including audit logs.
- `civil_defense_liaison` — Read-only scoped to KPI 5.
- `permit_office` — Read-only scoped to KPI 3.
- `admin` — Full access, every action audit-logged.

No role views Restricted data in workspace components. Restricted data is accessible only via direct database query by admin with policy decision logged.

## 4. Human-in-the-loop enforcement

The following cannot be taken without explicit human authorisation:

- Decision approval
- Decision revision request
- Decision escalation
- External ticket creation in MAKEEN or Service Desk
- Email notification to case owner
- SMS notification (reserved)
- Publication of MOMRAH narrative for inclusion in quarterly report

Every such action must (1) be initiated by a human click on a workspace action button, (2) be authenticated as a specific user with a known role, (3) be authorised against the role-permission matrix above, (4) produce an audit log entry with full context, and (5) be reversible only by another human action (not by system retry).

The decision candidate generation runtime produces *candidates*, not decisions. The platform must enforce that no candidate becomes a decision without a human approval action.

## 5. Audit log

Append-only. Deletion forbidden except through admin-authorised retention purge after the legal retention period (7 years per Saudi public-sector audit).

Every entry includes: event_id (UUID), event_ts (ISO 8601), actor_user_id, actor_role, event_type, target_case_id, target_kpi_id, target_municipality_id, confirmation_modal_response, side_effects_executed, request_metadata.

The audit log is queryable by Emarah Diwan audit role. Audit log query itself is audit-logged.

## 6. Data residency

All Jazan data — raw, staging, analytics, and decision layers — must remain in Saudi-resident cloud regions per PDPL. The platform must enforce this at the storage layer.

## 7. Retention

| Data type | Retention | Disposition |
|---|---|---|
| Raw operational data | 7 years | Archive then purge |
| Staging data | 2 years | Archive then purge |
| Analytics marts | 7 years rolling | Older aggregated to annual summary |
| Decision candidates | Indefinite | Linked to audit log; cannot purge while link retained |
| Audit log | 10 years | Archive at 7 years, purge at 10 |
| MOMRAH evidence packs | Indefinite | Required for quarterly report reproducibility |

## 8. Encryption and lineage

Data at rest encrypted with platform-managed keys (KMS). Data in transit TLS 1.3 minimum. Package requires platform to enforce.

Lineage declared in `governance/lineage_detailed.yaml`, computable from `dbt parse` output plus runtime declarations in `contracts/runtimes.yaml`.

## 9. Promotion-blocking governance failures

The platform must refuse to promote this package to first-class status if any of the following are observed:

- Any workspace route returns unmasked Restricted data under a non-admin role
- Audit log is not append-only (deletion observed)
- Any autonomous external action executed without human authorisation
- Any data observed in a non-Saudi cloud region
- Bilingual key parity check fails (every key in en.yaml must have a corresponding entry in ar.yaml)
- Native Arabic speaker review flag is false at production promotion (acceptable at pilot promotion with explicit waiver)

## 10. Compliance with v1.0.8 governance registry

This package consumes the v1.0.8 governance registry conventions:

- `governance/business_trust_map.yaml` — describes the trust relationships between datasets, roles, and decisions
- `governance/governed_datasets.yaml` — declares each dataset's classification, ownership, lineage, and retention
- `governance/opencare_registry_mapping.yaml` — maps this package's local identifiers to the platform-wide governance registry

These three files must be authored and validated. They were structurally introduced in v1.0.8 but not enforced; this package version enforces them via validation/validate_governance_registry.py.
