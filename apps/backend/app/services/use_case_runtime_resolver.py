from __future__ import annotations

from copy import deepcopy
from typing import Any

from app.services.use_case_template_storage import UseCaseTemplateStorage, utc_now_iso


class UseCaseRuntimeResolver:
    def __init__(self, storage: UseCaseTemplateStorage) -> None:
        self.storage = storage

    def _resolve_record(self, slug: str) -> dict[str, Any]:
        record = self.storage.get_active_package_by_slug(slug)
        if record is None:
            raise KeyError(slug)
        return record

    def get_workspace_definition(self, slug: str) -> dict[str, Any]:
        record = self._resolve_record(slug)
        if record.get("materialization_status") != "materialized":
            raise ValueError("Use case workspace is not materialized.")
        if record.get("activation_status") not in {"active", "live_verified"}:
            raise ValueError("Use case workspace is not active.")

        runtime_definition = deepcopy(record.get("runtime_definition", {}))
        runtime_definition["state"] = {
            "package_id": record.get("package_id"),
            "version": record.get("version"),
            "materialization_status": record.get("materialization_status"),
            "activation_status": record.get("activation_status"),
            "live_verification_status": record.get("live_verification_status"),
        }
        runtime_definition["smoke_tests"] = deepcopy(record.get("runtime_definition", {}).get("smoke_tests", {}))
        return runtime_definition

    @staticmethod
    def _freshness_meta() -> dict[str, Any]:
        return {
            "sla_status": "pass",
            "last_loaded_at": utc_now_iso(),
            "max_expected_age_hours": 24,
        }

    def _sample_overview_payload(self, slug: str) -> dict[str, Any]:
        return {
            "data": {
                "use_case_slug": slug,
                "episode_count": 1842,
                "average_length_of_stay": 4.6,
                "average_readmission_risk": 0.31,
                "readmission_30d_rate": 8.7,
                "complication_rate": 3.2,
                "unplanned_return_to_theatre_rate": 1.4,
                "proms_improvement": 12.8,
                "threshold_status": "watch",
            },
            "meta": {
                "empty": False,
                "data_freshness": self._freshness_meta(),
            },
        }

    @staticmethod
    def _sample_trend_payload() -> dict[str, Any]:
        return {
            "data": [
                {
                    "admission_month": month,
                    "episode_count": count,
                    "readmission_30d_rate": readmission,
                    "complication_rate": complication,
                    "return_to_theatre_rate": theatre,
                    "average_length_of_stay": los,
                    "average_proms_improvement": proms,
                }
                for month, count, readmission, complication, theatre, los, proms in [
                    ("2026-01", 142, 9.8, 3.7, 1.7, 5.1, 10.4),
                    ("2026-02", 148, 9.4, 3.5, 1.5, 4.9, 10.9),
                    ("2026-03", 151, 9.1, 3.4, 1.6, 4.8, 11.3),
                    ("2026-04", 153, 8.9, 3.3, 1.5, 4.7, 11.8),
                    ("2026-05", 157, 8.7, 3.2, 1.4, 4.6, 12.4),
                    ("2026-06", 161, 8.5, 3.0, 1.3, 4.5, 12.9),
                ]
            ],
            "meta": {
                "empty": False,
                "data_freshness": self._freshness_meta(),
            },
        }

    @staticmethod
    def _sample_variation_payload() -> dict[str, Any]:
        return {
            "data": [
                {
                    "consultant_id": consultant,
                    "procedure_group": procedure,
                    "payer_id": payer,
                    "episode_count": count,
                    "readmission_30d_rate": readmission,
                    "complication_rate": complication,
                    "return_to_theatre_rate": theatre,
                    "average_readmission_risk_score": risk,
                    "average_proms_improvement": proms,
                }
                for consultant, procedure, payer, count, readmission, complication, theatre, risk, proms in [
                    ("CONS-104", "Orthopaedics", "PAYER-A", 182, 8.1, 2.9, 1.2, 0.27, 13.5),
                    ("CONS-207", "Cardiology", "PAYER-B", 164, 9.4, 3.7, 1.6, 0.33, 11.8),
                    ("CONS-319", "General Surgery", "PAYER-C", 143, 8.8, 3.2, 1.5, 0.29, 12.1),
                    ("CONS-411", "Urology", "PAYER-A", 127, 7.9, 2.7, 1.1, 0.24, 14.0),
                ]
            ],
            "meta": {
                "empty": False,
                "data_freshness": self._freshness_meta(),
            },
        }

    @staticmethod
    def _sample_governance_payload(slug: str) -> dict[str, Any]:
        return {
            "data": {
                "use_case_slug": slug,
                "use_case_name": "Patient Outcomes",
                "governance_profile": "Monthly governance review with named accountable owner and data steward.",
                "highest_classification": "restricted",
                "default_patient_identifier": "masked_patient_id",
                "full_identifier_access_policy": "phi_authorized role with audited reveal flow",
                "phi_masking_required": True,
                "patient_level_audit_required": True,
                "governance_evidence_required": True,
                "lineage_expected_path": "source -> raw -> staging -> analytics -> output -> api -> portal",
                "dashboard_governance_status": "pass",
                "evidence_domains_required": "asset_inventory, metric_dictionary, classification_register, lineage_summary",
            },
            "meta": {
                "empty": False,
                "data_freshness": self._freshness_meta(),
            },
        }

    @staticmethod
    def _sample_filters_payload() -> dict[str, Any]:
        return {
            "data": [
                {"filter_id": "specialty", "value": "Orthopaedics", "record_count": 428},
                {"filter_id": "specialty", "value": "Cardiology", "record_count": 366},
                {"filter_id": "payer", "value": "PAYER-A", "record_count": 512},
                {"filter_id": "risk_band", "value": "high", "record_count": 138},
            ],
            "meta": {
                "empty": False,
                "data_freshness": self._freshness_meta(),
            },
        }

    @staticmethod
    def _sample_kpis_payload() -> dict[str, Any]:
        return {
            "data": [
                {
                    "metric_id": "readmission_30d_rate",
                    "metric_name": "30-Day Readmission Rate",
                    "definition": "Episodes readmitted within 30 days of discharge.",
                    "formula": "SUM(readmitted_30d_flag) / COUNT(episode_id)",
                    "unit": "percentage",
                    "source_table": "analytics.fct_patient_outcomes",
                    "owner": "Clinical Governance Lead",
                },
                {
                    "metric_id": "complication_rate",
                    "metric_name": "Complication Rate",
                    "definition": "Episodes with at least one recorded clinical complication.",
                    "formula": "SUM(complication_flag) / COUNT(episode_id)",
                    "unit": "percentage",
                    "source_table": "analytics.fct_patient_outcomes",
                    "owner": "Medical Director",
                },
                {
                    "metric_id": "average_length_of_stay",
                    "metric_name": "Average Length of Stay",
                    "definition": "Average inpatient days for completed episodes.",
                    "formula": "AVG(length_of_stay_days)",
                    "unit": "days",
                    "source_table": "analytics.fct_patient_outcomes",
                    "owner": "Operations Leadership",
                },
            ],
            "meta": {
                "empty": False,
                "data_freshness": self._freshness_meta(),
            },
        }

    @staticmethod
    def _sample_queue_payload(queue_name: str) -> dict[str, Any]:
        prefix = queue_name.upper().replace("-", "")[:4] or "CASE"
        base_rows = []
        for index, specialty, consultant, payer, procedure, risk in [
            (1, "Orthopaedics", "CONS-104", "PAYER-A", "Joint Replacement", 0.82),
            (2, "Cardiology", "CONS-207", "PAYER-B", "Valve Procedure", 0.78),
            (3, "General Surgery", "CONS-319", "PAYER-C", "Abdominal", 0.74),
            (4, "Urology", "CONS-411", "PAYER-A", "Endoscopy", 0.71),
        ]:
            base_rows.append(
                {
                    "episode_id": f"{prefix}-EPI-{index:04d}",
                    "masked_patient_id": f"PX-{index:04d}",
                    "specialty": specialty,
                    "consultant_id": consultant,
                    "payer_id": payer,
                    "diagnosis_group": "Outcome review",
                    "procedure_group": procedure,
                    "discharge_date": f"2026-05-{10 + index:02d}",
                    "readmission_risk_score": risk,
                    "risk_band": "high" if risk >= 0.75 else "watch",
                    "governance_evidence_link": "/governance/use-cases/patient-outcomes",
                }
            )
        return {
            "data": base_rows,
            "meta": {
                "empty": False,
                "data_freshness": self._freshness_meta(),
            },
        }

    def _sample_endpoint_payload(self, slug: str, endpoint: str) -> dict[str, Any]:
        if endpoint == "/overview":
            return self._sample_overview_payload(slug)
        if endpoint == "/kpis":
            return self._sample_kpis_payload()
        if endpoint == "/filters":
            return self._sample_filters_payload()
        if endpoint == "/trends":
            return self._sample_trend_payload()
        if endpoint == "/variation":
            return self._sample_variation_payload()
        if endpoint == "/governance":
            return self._sample_governance_payload(slug)
        if endpoint.startswith("/queues/"):
            return self._sample_queue_payload(endpoint.rsplit("/", 1)[-1])
        if endpoint == "/drilldown":
            return self._sample_queue_payload("drilldown")
        return {
            "data": [],
            "meta": {
                "empty": True,
                "data_freshness": None,
            },
        }

    def resolve_endpoint(
        self,
        slug: str,
        endpoint: str,
        *,
        filters: dict[str, Any] | None = None,
        actor: str = "anonymous",
        allow_preview: bool = False,
    ) -> dict[str, Any]:
        record = self._resolve_record(slug)
        if record.get("materialization_status") != "materialized" and not allow_preview:
            raise ValueError("Use case endpoints are not materialized.")
        if record.get("activation_status") not in {"active", "live_verified"} and not allow_preview:
            raise ValueError("Use case is not active.")

        runtime_definition = record.get("runtime_definition", {})
        bindings = runtime_definition.get("backend_endpoint_bindings", {})
        endpoints = bindings.get("endpoints", [])
        normalized_endpoint = endpoint if endpoint.startswith("/") else f"/{endpoint}"
        match = next(
            (
                candidate
                for candidate in endpoints
                if isinstance(candidate, dict) and candidate.get("path") == normalized_endpoint
            ),
            None,
        )
        if match is None:
            raise KeyError(f"Endpoint not found: {normalized_endpoint}")

        applied_filters = filters or {}
        allowed_filters = bindings.get("filters", [])
        if isinstance(allowed_filters, list):
            unsupported_filters = sorted(
                key for key in applied_filters.keys() if key not in allowed_filters
            )
            if unsupported_filters:
                raise ValueError(
                    f"Unsupported filters for {normalized_endpoint}: {', '.join(unsupported_filters)}"
                )
        payload = self._sample_endpoint_payload(slug, normalized_endpoint)
        data = payload.get("data", [])
        meta = {
            **(payload.get("meta", {}) if isinstance(payload.get("meta"), dict) else {}),
            "empty": bool(payload.get("meta", {}).get("empty", False)) if isinstance(payload.get("meta"), dict) else False,
            "as_of": utc_now_iso(),
            "use_case_slug": slug,
            "endpoint": normalized_endpoint,
            "filters_applied": applied_filters,
            "materialization_status": record.get("materialization_status"),
            "data_freshness": (
                payload.get("meta", {}).get("data_freshness")
                if isinstance(payload.get("meta"), dict)
                else None
            ),
        }

        phi_handling = match.get("phi_handling")
        if phi_handling:
            self.storage.record_action(
                package_id=record["package_id"],
                slug=record["slug"],
                version=record["version"],
                actor=actor,
                action="patient-level drilldown access" if "drilldown" in normalized_endpoint else "restricted PHI attribute access",
                status=record.get("status", "active"),
                validation_result=record.get("package_validation_status"),
                log=f"Runtime endpoint {normalized_endpoint} accessed with PHI policy {phi_handling}.",
            )

        return {
            "data": data,
            "meta": meta,
            "errors": [],
            "warnings": [],
        }
