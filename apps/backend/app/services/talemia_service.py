from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

from psycopg import sql
from psycopg.errors import UndefinedColumn, UndefinedTable

from app.config import settings
from app.db import connect, qualified_table


USE_CASE_ID = "talemia_business_intelligence"

LINEAGE = {
    "executive-summary": [
        "analytics.fct_talemia_kpi_performance",
        "analytics.fct_talemia_pipeline",
        "analytics.fct_talemia_win_loss",
    ],
    "pipeline-business-lines": ["analytics.fct_talemia_business_line_performance"],
    "pipeline-stages": ["analytics.fct_talemia_stage_distribution"],
    "win-loss": ["analytics.fct_talemia_win_loss"],
    "account-managers": ["analytics.fct_talemia_account_manager_performance"],
    "opportunities": ["analytics.fct_talemia_opportunity"],
    "opportunity-detail": [
        "analytics.fct_talemia_opportunity",
        "analytics.fct_talemia_opportunity_updates",
        "analytics.fct_talemia_pipeline_risk",
    ],
    "updates": ["analytics.fct_talemia_opportunity_updates"],
    "kpis": ["dictionary.dict_talemia_metrics", "dictionary.dict_talemia_terms"],
    "governance-reconciliation": [
        "analytics.fct_talemia_dashboard_reconciliation",
        "analytics.fct_talemia_extraction_quality",
    ],
}

LIMITATIONS = [
    "V4 weekly updates contain no validated long-format rows.",
    "Expected award dates are mostly unavailable, so forecast and sales-cycle outputs are partial.",
    "Dashboard reconciliation must pass before values are treated as authoritative.",
]


def _serialize(value: object) -> object:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, datetime):
        return value.isoformat() + "Z"
    if isinstance(value, date):
        return value.isoformat()
    return value


def _row(row: dict[str, Any]) -> dict[str, Any]:
    return {key: _serialize(value) for key, value in dict(row).items()}


def _table(schema: str, table: str) -> sql.Composed:
    return qualified_table(schema, table)


def _empty(endpoint: str, filters: dict[str, str | None], message: str) -> dict[str, Any]:
    return {
        "meta": {
            "use_case": USE_CASE_ID,
            "empty": True,
            "status": "empty",
            "message": message,
            "filters": filters,
            "lineage": LINEAGE.get(endpoint, []),
            "limitations": LIMITATIONS,
        },
        "data": [],
    }


def _ok(endpoint: str, filters: dict[str, str | None], data: Any) -> dict[str, Any]:
    return {
        "meta": {
            "use_case": USE_CASE_ID,
            "empty": False,
            "status": "loaded",
            "filters": filters,
            "lineage": LINEAGE.get(endpoint, []),
            "limitations": LIMITATIONS,
        },
        "data": data,
    }


def _where(filters: dict[str, str | None], mapping: dict[str, str]) -> tuple[sql.SQL, list[str]]:
    clauses: list[sql.Composed] = []
    params: list[str] = []
    for filter_name, column_name in mapping.items():
        value = filters.get(filter_name)
        if value in (None, ""):
            continue
        clauses.append(sql.SQL("{}::text = %s").format(sql.Identifier(column_name)))
        params.append(str(value))
    if not clauses:
        return sql.SQL(""), params
    return sql.SQL(" where ") + sql.SQL(" and ").join(clauses), params


def _fetch(
    endpoint: str,
    schema: str,
    table: str,
    *,
    filters: dict[str, str | None],
    columns: list[str],
    filter_columns: dict[str, str] | None = None,
    order_by: str | None = None,
    limit: int = 200,
) -> dict[str, Any]:
    relation = _table(schema, table)
    where_sql, params = _where(filters, filter_columns or {})
    column_sql = sql.SQL(", ").join(sql.Identifier(column) for column in columns)
    order_sql = sql.SQL(" order by {}").format(sql.Identifier(order_by)) if order_by else sql.SQL("")

    try:
        with connect() as conn:
            count_row = conn.execute(
                sql.SQL("select count(*)::integer as count from {}").format(relation)
            ).fetchone()
            if not count_row or count_row["count"] == 0:
                return _empty(endpoint, filters, f"{schema}.{table} is empty.")

            rows = conn.execute(
                sql.SQL("select {} from {}{}{} limit %s").format(
                    column_sql,
                    relation,
                    where_sql,
                    order_sql,
                ),
                [*params, limit],
            ).fetchall()
    except (UndefinedTable, UndefinedColumn):
        return _empty(endpoint, filters, f"{schema}.{table} is not available yet.")

    if not rows:
        return _empty(endpoint, filters, "No TALEMIA records matched the selected filters.")
    return _ok(endpoint, filters, [_row(row) for row in rows])


PIPELINE_FILTERS = {
    "year": "year",
    "account_manager": "account_manager_name",
    "business_line": "business_line_name",
    "workflow_state": "workflow_state",
    "winning_likelihood": "winning_likelihood",
    "sector_type": "sector_type",
    "expected_award_quarter": "expected_award_quarter",
}


def executive_summary(filters: dict[str, str | None]) -> dict[str, Any]:
    try:
        with connect() as conn:
            kpis = conn.execute(
                sql.SQL(
                    """
                    select kpi_name, kpi_value, unit, dashboard_name, as_of_timestamp
                    from {}
                    order by kpi_name
                    """
                ).format(_table(settings.analytics_schema, "fct_talemia_kpi_performance"))
            ).fetchall()
            if not kpis:
                return _empty("executive-summary", filters, "TALEMIA KPI mart is empty.")

            business_lines = conn.execute(
                sql.SQL(
                    """
                    select business_line_name, opportunity_count, pipeline_value, qualified_pipeline_value, awarded_value, lost_value, win_rate
                    from {}
                    order by pipeline_value desc nulls last
                    limit 10
                    """
                ).format(_table(settings.analytics_schema, "fct_talemia_business_line_performance"))
            ).fetchall()
            stages = conn.execute(
                sql.SQL(
                    """
                    select opportunity_stage, workflow_state, opportunity_count, pipeline_value
                    from {}
                    order by opportunity_count desc
                    """
                ).format(_table(settings.analytics_schema, "fct_talemia_stage_distribution"))
            ).fetchall()
    except (UndefinedTable, UndefinedColumn):
        return _empty("executive-summary", filters, "TALEMIA analytics marts are not available yet.")

    return _ok(
        "executive-summary",
        filters,
        {
            "kpis": [_row(row) for row in kpis],
            "business_lines": [_row(row) for row in business_lines],
            "stages": [_row(row) for row in stages],
        },
    )


def pipeline_business_lines(filters: dict[str, str | None]) -> dict[str, Any]:
    return _fetch(
        "pipeline-business-lines",
        settings.analytics_schema,
        "fct_talemia_business_line_performance",
        filters=filters,
        columns=[
            "business_line_name",
            "year",
            "opportunity_count",
            "pipeline_value",
            "qualified_pipeline_value",
            "awarded_value",
            "lost_value",
            "won_count",
            "lost_count",
            "win_rate",
        ],
        filter_columns={"year": "year", "business_line": "business_line_name"},
        order_by="pipeline_value",
    )


def pipeline_stages(filters: dict[str, str | None]) -> dict[str, Any]:
    return _fetch(
        "pipeline-stages",
        settings.analytics_schema,
        "fct_talemia_stage_distribution",
        filters=filters,
        columns=["opportunity_stage", "workflow_state", "opportunity_count", "pipeline_value"],
        filter_columns={"workflow_state": "workflow_state"},
        order_by="opportunity_count",
    )


def win_loss(filters: dict[str, str | None]) -> dict[str, Any]:
    return _fetch(
        "win-loss",
        settings.analytics_schema,
        "fct_talemia_win_loss",
        filters=filters,
        columns=[
            "opportunity_id",
            "client_name",
            "account_manager_name",
            "business_line_name",
            "sector_type",
            "workflow_state",
            "contract_value",
            "qualified_sales",
            "converted_value_2026",
            "awarded_value",
            "is_won",
            "is_lost",
            "loss_reason",
            "competitor",
        ],
        filter_columns=PIPELINE_FILTERS,
        order_by="contract_value",
    )


def account_managers(filters: dict[str, str | None]) -> dict[str, Any]:
    return _fetch(
        "account-managers",
        settings.analytics_schema,
        "fct_talemia_account_manager_performance",
        filters=filters,
        columns=[
            "account_manager_name",
            "year",
            "managed_opportunities",
            "total_clients_managed",
            "qualified_value",
            "awarded_value",
            "managed_pipeline_value",
            "won_count",
            "lost_count",
            "winning_pct",
        ],
        filter_columns={"year": "year", "account_manager": "account_manager_name"},
        order_by="managed_pipeline_value",
    )


def opportunities(filters: dict[str, str | None]) -> dict[str, Any]:
    opportunity_filters = {
        "year": "submission_year",
        "account_manager": "account_manager_name",
        "business_line": "business_line_name",
        "workflow_state": "workflow_state",
        "winning_likelihood": "winning_likelihood",
        "sector_type": "sector_type",
        "expected_award_quarter": "expected_award_quarter",
        "opportunity_id": "opportunity_id",
        "client": "client_name",
        "client_department": "client_department",
    }
    return _fetch(
        "opportunities",
        settings.analytics_schema,
        "fct_talemia_opportunity",
        filters=filters,
        columns=[
            "opportunity_id",
            "opportunity_name_en",
            "opportunity_name_ar",
            "client_name",
            "client_department",
            "account_manager_name",
            "business_line_name",
            "sector_type",
            "opportunity_stage",
            "workflow_state",
            "winning_likelihood",
            "deal_type",
            "contract_value",
            "qualified_sales",
            "converted_value_2026",
            "awarded_value",
            "submission_year",
            "expected_award_quarter",
            "loss_reason",
            "parser_warning",
        ],
        filter_columns=opportunity_filters,
        order_by="contract_value",
    )


def opportunity_detail(opportunity_id: str) -> dict[str, Any]:
    filters = {"opportunity_id": opportunity_id}
    response = opportunities(filters)
    if response["meta"]["empty"]:
        return response
    rows = response["data"]
    return _ok("opportunity-detail", filters, rows[0] if rows else None)


def updates(filters: dict[str, str | None]) -> dict[str, Any]:
    return _fetch(
        "updates",
        settings.analytics_schema,
        "fct_talemia_opportunity_updates",
        filters=filters,
        columns=[
            "update_id",
            "opportunity_id",
            "opportunity_name_en",
            "client_name",
            "week_label",
            "update_date",
            "update_text",
            "operational_signal",
            "risk_flag",
            "parser_warning",
        ],
        filter_columns={"opportunity_id": "opportunity_id"},
        order_by="update_date",
    )


def kpis(filters: dict[str, str | None]) -> dict[str, Any]:
    try:
        with connect() as conn:
            metrics = conn.execute(
                sql.SQL("select * from {} order by kpi_name").format(
                    _table(settings.dictionary_schema, "dict_talemia_metrics")
                )
            ).fetchall()
            terms = conn.execute(
                sql.SQL("select * from {} order by term_name limit 200").format(
                    _table(settings.dictionary_schema, "dict_talemia_terms")
                )
            ).fetchall()
    except (UndefinedTable, UndefinedColumn):
        return _empty("kpis", filters, "TALEMIA dictionary tables are not available yet.")
    return _ok("kpis", filters, {"metrics": [_row(row) for row in metrics], "terms": [_row(row) for row in terms]})


def governance_reconciliation(filters: dict[str, str | None]) -> dict[str, Any]:
    try:
        with connect() as conn:
            reconciliation = conn.execute(
                sql.SQL("select * from {} order by dashboard_name, kpi_name").format(
                    _table(settings.analytics_schema, "fct_talemia_dashboard_reconciliation")
                )
            ).fetchall()
            quality = conn.execute(
                sql.SQL("select * from {} order by quality_status, check_name").format(
                    _table(settings.analytics_schema, "fct_talemia_extraction_quality")
                )
            ).fetchall()
    except (UndefinedTable, UndefinedColumn):
        return _empty("governance-reconciliation", filters, "TALEMIA governance marts are not available yet.")
    return _ok(
        "governance-reconciliation",
        filters,
        {"reconciliation": [_row(row) for row in reconciliation], "extraction_quality": [_row(row) for row in quality]},
    )
