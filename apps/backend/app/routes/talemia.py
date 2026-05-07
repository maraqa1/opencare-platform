from __future__ import annotations

from fastapi import APIRouter

import app.services.talemia_service as talemia_service

router = APIRouter(prefix="/api/v1/talemia", tags=["talemia"])

FilterParam = str | None


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


@router.get("/executive-summary")
def executive_summary(
    year: FilterParam = None,
    account_manager: FilterParam = None,
    business_line: FilterParam = None,
    workflow_state: FilterParam = None,
    winning_likelihood: FilterParam = None,
    sector_type: FilterParam = None,
) -> dict[str, object]:
    return talemia_service.executive_summary(
        _filters(
            year=year,
            account_manager=account_manager,
            business_line=business_line,
            workflow_state=workflow_state,
            winning_likelihood=winning_likelihood,
            sector_type=sector_type,
        )
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
    return talemia_service.pipeline_business_lines(
        _filters(
            year=year,
            account_manager=account_manager,
            business_line=business_line,
            workflow_state=workflow_state,
            winning_likelihood=winning_likelihood,
            sector_type=sector_type,
        )
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
    return talemia_service.pipeline_stages(
        _filters(
            year=year,
            account_manager=account_manager,
            business_line=business_line,
            workflow_state=workflow_state,
            winning_likelihood=winning_likelihood,
            sector_type=sector_type,
        )
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
    return talemia_service.win_loss(
        _filters(
            year=year,
            account_manager=account_manager,
            business_line=business_line,
            workflow_state=workflow_state,
            winning_likelihood=winning_likelihood,
            sector_type=sector_type,
        )
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
    return talemia_service.account_managers(
        _filters(
            year=year,
            account_manager=account_manager,
            business_line=business_line,
            workflow_state=workflow_state,
            winning_likelihood=winning_likelihood,
            sector_type=sector_type,
        )
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
    return talemia_service.opportunities(
        _filters(
            opportunity_id=opportunity_id,
            client=client,
            client_department=client_department,
            account_manager=account_manager,
            business_line=business_line,
            workflow_state=workflow_state,
            winning_likelihood=winning_likelihood,
            sector_type=sector_type,
        )
    )


@router.get("/opportunities/{opportunity_id}")
def opportunity_detail(opportunity_id: str) -> dict[str, object]:
    return talemia_service.opportunity_detail(opportunity_id)


@router.get("/updates")
def updates(
    opportunity_id: FilterParam = None,
    account_manager: FilterParam = None,
    business_line: FilterParam = None,
    workflow_state: FilterParam = None,
    winning_likelihood: FilterParam = None,
    sector_type: FilterParam = None,
) -> dict[str, object]:
    return talemia_service.updates(
        _filters(
            opportunity_id=opportunity_id,
            account_manager=account_manager,
            business_line=business_line,
            workflow_state=workflow_state,
            winning_likelihood=winning_likelihood,
            sector_type=sector_type,
        )
    )


@router.get("/kpis")
def kpis(
    dashboard_name: FilterParam = None,
    kpi_name: FilterParam = None,
    source_table: FilterParam = None,
    metric_category: FilterParam = None,
    quality_status: FilterParam = None,
) -> dict[str, object]:
    return talemia_service.kpis(
        _filters(
            dashboard_name=dashboard_name,
            kpi_name=kpi_name,
            source_table=source_table,
            metric_category=metric_category,
            quality_status=quality_status,
        )
    )


@router.get("/governance/reconciliation")
def governance_reconciliation(
    dashboard_name: FilterParam = None,
    kpi_name: FilterParam = None,
    source_table: FilterParam = None,
    metric_category: FilterParam = None,
    quality_status: FilterParam = None,
) -> dict[str, object]:
    return talemia_service.governance_reconciliation(
        _filters(
            dashboard_name=dashboard_name,
            kpi_name=kpi_name,
            source_table=source_table,
            metric_category=metric_category,
            quality_status=quality_status,
        )
    )
