from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/talemia", tags=["talemia"])

FilterParam = str | None

MARTS_BY_ENDPOINT: dict[str, list[str]] = {
    "executive-summary": [
        "analytics.fct_talemia_kpi_performance",
        "analytics.fct_talemia_pipeline",
        "analytics.fct_talemia_win_loss",
    ],
    "pipeline-business-lines": [
        "analytics.fct_talemia_business_line_performance",
    ],
    "pipeline-stages": [
        "analytics.fct_talemia_stage_distribution",
        "analytics.fct_talemia_pipeline",
    ],
    "win-loss": [
        "analytics.fct_talemia_win_loss",
    ],
    "account-managers": [
        "analytics.fct_talemia_account_manager_performance",
        "analytics.fct_talemia_client_cohort",
    ],
    "opportunities": [
        "analytics.fct_talemia_opportunity",
    ],
    "opportunity-detail": [
        "analytics.fct_talemia_opportunity",
        "analytics.fct_talemia_opportunity_updates",
        "analytics.fct_talemia_pipeline_risk",
    ],
    "updates": [
        "analytics.fct_talemia_opportunity_updates",
    ],
    "kpis": [
        "dictionary.dict_talemia_metrics",
        "dictionary.dict_talemia_terms",
    ],
    "governance-reconciliation": [
        "analytics.fct_talemia_dashboard_reconciliation",
        "analytics.fct_talemia_extraction_quality",
    ],
}


def _filters(
    *,
    year: str | None = None,
    account_manager: str | None = None,
    business_line: str | None = None,
    workflow_state: str | None = None,
    winning_likelihood: str | None = None,
    sector_type: str | None = None,
    expected_award_quarter: str | None = None,
    opportunity_id: str | None = None,
    client: str | None = None,
    client_department: str | None = None,
    dashboard_name: str | None = None,
    kpi_name: str | None = None,
    source_table: str | None = None,
    metric_category: str | None = None,
    quality_status: str | None = None,
) -> dict[str, str | None]:
    return {
        "year": year,
        "account_manager": account_manager,
        "business_line": business_line,
        "workflow_state": workflow_state,
        "winning_likelihood": winning_likelihood,
        "sector_type": sector_type,
        "expected_award_quarter": expected_award_quarter,
        "opportunity_id": opportunity_id,
        "client": client,
        "client_department": client_department,
        "dashboard_name": dashboard_name,
        "kpi_name": kpi_name,
        "source_table": source_table,
        "metric_category": metric_category,
        "quality_status": quality_status,
    }


def _empty_response(
    endpoint: str,
    *,
    filters: dict[str, str | None],
    data: object | None = None,
    message: str | None = None,
) -> dict[str, object]:
    return {
        "meta": {
            "empty": True,
            "message": message or "TALEMIA marts are not available yet.",
            "status": "contract_scaffold",
            "filters": filters,
            "lineage": MARTS_BY_ENDPOINT.get(endpoint, []),
            "limitations": [
                "V4 raw extract is the accepted baseline but has not been loaded into Postgres yet.",
                "dbt TALEMIA marts have not been materialized yet.",
                "Dashboard values are not authoritative until reconciliation passes.",
            ],
        },
        "data": data if data is not None else [],
    }


@router.get("/executive-summary")
def executive_summary(
    year: FilterParam = None,
    account_manager: FilterParam = None,
    business_line: FilterParam = None,
    workflow_state: FilterParam = None,
    winning_likelihood: FilterParam = None,
    sector_type: FilterParam = None,
) -> dict[str, object]:
    return _empty_response(
        "executive-summary",
        filters=_filters(
            year=year,
            account_manager=account_manager,
            business_line=business_line,
            workflow_state=workflow_state,
            winning_likelihood=winning_likelihood,
            sector_type=sector_type,
        ),
        data={"kpis": [], "signals": [], "reconciliation": []},
    )


@router.get("/pipeline/business-lines")
def pipeline_business_lines(
    year: FilterParam = None,
    account_manager: FilterParam = None,
    business_line: FilterParam = None,
    workflow_state: FilterParam = None,
    winning_likelihood: FilterParam = None,
    sector_type: FilterParam = None,
) -> dict[str, object]:
    return _empty_response(
        "pipeline-business-lines",
        filters=_filters(
            year=year,
            account_manager=account_manager,
            business_line=business_line,
            workflow_state=workflow_state,
            winning_likelihood=winning_likelihood,
            sector_type=sector_type,
        ),
    )


@router.get("/pipeline/stages")
def pipeline_stages(
    year: FilterParam = None,
    account_manager: FilterParam = None,
    business_line: FilterParam = None,
    workflow_state: FilterParam = None,
    winning_likelihood: FilterParam = None,
    sector_type: FilterParam = None,
) -> dict[str, object]:
    return _empty_response(
        "pipeline-stages",
        filters=_filters(
            year=year,
            account_manager=account_manager,
            business_line=business_line,
            workflow_state=workflow_state,
            winning_likelihood=winning_likelihood,
            sector_type=sector_type,
        ),
        message="TALEMIA stage distribution is pending raw load and dbt materialization.",
    )


@router.get("/win-loss")
def win_loss(
    year: FilterParam = None,
    account_manager: FilterParam = None,
    business_line: FilterParam = None,
    workflow_state: FilterParam = None,
    winning_likelihood: FilterParam = None,
    sector_type: FilterParam = None,
) -> dict[str, object]:
    return _empty_response(
        "win-loss",
        filters=_filters(
            year=year,
            account_manager=account_manager,
            business_line=business_line,
            workflow_state=workflow_state,
            winning_likelihood=winning_likelihood,
            sector_type=sector_type,
        ),
    )


@router.get("/account-managers")
def account_managers(
    year: FilterParam = None,
    account_manager: FilterParam = None,
    business_line: FilterParam = None,
    workflow_state: FilterParam = None,
    winning_likelihood: FilterParam = None,
    sector_type: FilterParam = None,
) -> dict[str, object]:
    return _empty_response(
        "account-managers",
        filters=_filters(
            year=year,
            account_manager=account_manager,
            business_line=business_line,
            workflow_state=workflow_state,
            winning_likelihood=winning_likelihood,
            sector_type=sector_type,
        ),
    )


@router.get("/opportunities")
def opportunities(
    opportunity_id: FilterParam = None,
    client: FilterParam = None,
    client_department: FilterParam = None,
    account_manager: FilterParam = None,
    business_line: FilterParam = None,
    workflow_state: FilterParam = None,
    winning_likelihood: FilterParam = None,
    sector_type: FilterParam = None,
) -> dict[str, object]:
    return _empty_response(
        "opportunities",
        filters=_filters(
            opportunity_id=opportunity_id,
            client=client,
            client_department=client_department,
            account_manager=account_manager,
            business_line=business_line,
            workflow_state=workflow_state,
            winning_likelihood=winning_likelihood,
            sector_type=sector_type,
        ),
    )


@router.get("/opportunities/{opportunity_id}")
def opportunity_detail(opportunity_id: str) -> dict[str, object]:
    return _empty_response(
        "opportunity-detail",
        filters=_filters(opportunity_id=opportunity_id),
        data=None,
        message=f"TALEMIA opportunity {opportunity_id} is not available because marts are not loaded yet.",
    )


@router.get("/updates")
def updates(
    opportunity_id: FilterParam = None,
    account_manager: FilterParam = None,
    business_line: FilterParam = None,
    workflow_state: FilterParam = None,
    winning_likelihood: FilterParam = None,
    sector_type: FilterParam = None,
) -> dict[str, object]:
    return _empty_response(
        "updates",
        filters=_filters(
            opportunity_id=opportunity_id,
            account_manager=account_manager,
            business_line=business_line,
            workflow_state=workflow_state,
            winning_likelihood=winning_likelihood,
            sector_type=sector_type,
        ),
        message="TALEMIA weekly updates are pending parser validation and mart materialization.",
    )


@router.get("/kpis")
def kpis(
    dashboard_name: FilterParam = None,
    kpi_name: FilterParam = None,
    source_table: FilterParam = None,
    metric_category: FilterParam = None,
    quality_status: FilterParam = None,
) -> dict[str, object]:
    return _empty_response(
        "kpis",
        filters=_filters(
            dashboard_name=dashboard_name,
            kpi_name=kpi_name,
            source_table=source_table,
            metric_category=metric_category,
            quality_status=quality_status,
        ),
        data={"metrics": [], "terms": []},
        message="TALEMIA dictionary marts have not been materialized yet.",
    )


@router.get("/governance/reconciliation")
def governance_reconciliation(
    dashboard_name: FilterParam = None,
    kpi_name: FilterParam = None,
    source_table: FilterParam = None,
    metric_category: FilterParam = None,
    quality_status: FilterParam = None,
) -> dict[str, object]:
    return _empty_response(
        "governance-reconciliation",
        filters=_filters(
            dashboard_name=dashboard_name,
            kpi_name=kpi_name,
            source_table=source_table,
            metric_category=metric_category,
            quality_status=quality_status,
        ),
        data={"reconciliation": [], "extraction_quality": [], "dbt_tests": []},
        message="TALEMIA reconciliation is pending raw load, dbt run, and dashboard target comparison.",
    )
