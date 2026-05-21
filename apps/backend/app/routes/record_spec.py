from __future__ import annotations

from fastapi import APIRouter, HTTPException
from psycopg import sql
from psycopg.errors import UndefinedTable

from app.config import load_record_spec_map
from app.db import connect, qualified_table, split_table_name

router = APIRouter(prefix="/api/v1/record-spec", tags=["record-spec"])


def _table_freshness_column(columns: list[str]) -> str | None:
    for candidate in ("run_timestamp", "snapshot_date", "date_day", "forecast_date", "anomaly_date", "event_timestamp"):
        if candidate in columns:
            return candidate
    return None


@router.get("/{table_name:path}")
def get_record_spec(table_name: str) -> dict[str, object]:
    registry = load_record_spec_map()
    spec = registry.get(table_name)
    if spec is None:
        raise HTTPException(status_code=404, detail="Record spec not registered")

    schema, table = split_table_name(table_name)
    table_identifier = qualified_table(schema, table)

    columns_query = """
        select
            column_name,
            data_type
        from information_schema.columns
        where table_schema = %(schema)s
          and table_name = %(table)s
        order by ordinal_position
    """

    try:
        with connect() as conn:
            columns = conn.execute(columns_query, {"schema": schema, "table": table}).fetchall()
    except UndefinedTable as exc:
        raise HTTPException(status_code=404, detail="Table not found") from exc

    if not columns:
        raise HTTPException(status_code=404, detail="Table not found")

    column_names = [row["column_name"] for row in columns]
    freshness_column = _table_freshness_column(column_names)
    count_query = sql.SQL("select count(*) as row_count from {table}").format(table=table_identifier)

    if freshness_column is not None:
        freshness_query = sql.SQL("select max({column}) as last_updated from {table}").format(
            column=sql.Identifier(freshness_column),
            table=table_identifier,
        )
        sample_query = sql.SQL("select * from {table} order by {column} desc limit 3").format(
            table=table_identifier,
            column=sql.Identifier(freshness_column),
        )
    else:
        freshness_query = sql.SQL("select null::timestamp as last_updated")
        sample_query = sql.SQL("select * from {table} limit 3").format(table=table_identifier)

    with connect() as conn:
        row_count = conn.execute(count_query).fetchone()["row_count"]
        last_updated = conn.execute(freshness_query).fetchone()["last_updated"]
        preview_rows = conn.execute(sample_query).fetchall()

    return {
        "name": table_name,
        "sourceTable": table_name,
        "grain": spec.get("grain"),
        "lastUpdated": last_updated.isoformat() + "Z" if last_updated else None,
        "rowCount": row_count,
        "columns": [
            {
                "name": row["column_name"],
                "type": row["data_type"],
                "description": f"{row['column_name'].replace('_', ' ')} column from {table_name}.",
            }
            for row in columns
        ],
        "previewRows": [
            {
                key: value.isoformat() if hasattr(value, "isoformat") else value
                for key, value in row.items()
            }
            for row in preview_rows
        ],
    }
