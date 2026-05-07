from __future__ import annotations

import argparse
import csv
import math
import re
from io import StringIO
from pathlib import Path

import pandas as pd


RAW_SCHEMA = "raw_demo"

SHEET_TABLES = {
    "talemia_opportunities": "talemia_opportunities",
    "talemia_awards": "talemia_awards",
    "talemia_loss_reasons": "talemia_loss_reasons",
    "talemia_opportunity_updates_lon": "talemia_opportunity_updates_long",
    "talemia_clients": "talemia_clients",
    "talemia_client_departments": "talemia_client_departments",
    "talemia_account_managers": "talemia_account_managers",
    "talemia_business_lines": "talemia_business_lines",
    "talemia_opportunity_stage": "talemia_opportunity_stage",
    "talemia_workflow_state": "talemia_workflow_state",
    "talemia_risk_classification": "talemia_risk_classification",
    "talemia_sector_type": "talemia_sector_type",
    "talemia_business_terms": "talemia_business_terms",
    "talemia_dashboard_targets": "talemia_dashboard_targets",
    "talemia_field_mapping_report": "talemia_field_mapping_report",
    "extraction_quality_report": "extraction_quality_report",
    "load_summary": "talemia_load_summary",
}


def sql_identifier(value: str) -> str:
    return '"' + value.replace('"', '""') + '"'


def normalize_column(value: object) -> str:
    text = str(value).strip().lower()
    text = re.sub(r"[^a-z0-9]+", "_", text)
    text = re.sub(r"_+", "_", text).strip("_")
    if not text:
        text = "unnamed_column"
    if text[0].isdigit():
        text = f"col_{text}"
    return text


def normalize_cell(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and math.isnan(value):
        return ""
    if pd.isna(value):
        return ""
    if hasattr(value, "isoformat"):
        return value.isoformat(sep=" ")
    return str(value)


def csv_payload(df: pd.DataFrame) -> str:
    buffer = StringIO()
    writer = csv.writer(buffer, lineterminator="\n")
    writer.writerow(df.columns)
    for row in df.itertuples(index=False, name=None):
        writer.writerow([normalize_cell(value) for value in row])
    return buffer.getvalue()


def render_table_sql(table_name: str, df: pd.DataFrame) -> str:
    columns = [normalize_column(column) for column in df.columns]
    df = df.copy()
    df.columns = columns
    column_sql = ",\n  ".join(f"{sql_identifier(column)} text" for column in columns)
    copy_columns = ", ".join(sql_identifier(column) for column in columns)
    return f"""drop table if exists {RAW_SCHEMA}.{sql_identifier(table_name)} cascade;
create table {RAW_SCHEMA}.{sql_identifier(table_name)} (
  {column_sql}
);

copy {RAW_SCHEMA}.{sql_identifier(table_name)} ({copy_columns}) from stdin with (format csv, header true);
{csv_payload(df)}\\.

"""


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate raw_demo SQL from the TALEMIA V4 workbook.")
    parser.add_argument("--input", required=True, help="Path to talemia_raw_demo_extracted_v4.xlsx")
    parser.add_argument("--output", required=True, help="Path to write a psql-compatible SQL load file")
    args = parser.parse_args()

    workbook_path = Path(args.input)
    output_path = Path(args.output)
    if not workbook_path.is_file():
        raise SystemExit(f"Workbook not found: {workbook_path}")

    xl = pd.ExcelFile(workbook_path)
    chunks = [
        "-- Generated from talemia_raw_demo_extracted_v4.xlsx.",
        "-- Loads TALEMIA V4 source-derived raw tables into raw_demo.",
        "create schema if not exists raw_demo;",
        "grant usage, create on schema raw_demo to opencare;",
        "set search_path to raw_demo, public;",
        "",
    ]

    for sheet_name, table_name in SHEET_TABLES.items():
        if sheet_name not in xl.sheet_names:
            continue
        frame = pd.read_excel(workbook_path, sheet_name=sheet_name, dtype=object)
        chunks.append(render_table_sql(table_name, frame))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(chunks), encoding="utf-8", newline="\n")


if __name__ == "__main__":
    main()
