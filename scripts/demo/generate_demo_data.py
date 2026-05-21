#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
import random
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from pathlib import Path


@dataclass(frozen=True)
class WardBlueprint:
    ward_id: str
    ward_code: str
    ward_name: str
    service_line: str
    licensed_beds: int
    staffed_beds_baseline: int
    base_occupancy_ratio: float


WARD_BLUEPRINTS = [
    WardBlueprint("WARD-01", "GEN-MED-A", "General Medicine A", "General Medicine", 32, 28, 0.74),
    WardBlueprint("WARD-02", "GEN-MED-B", "General Medicine B", "General Medicine", 30, 26, 0.72),
    WardBlueprint("WARD-03", "RESP-01", "Respiratory Care", "Respiratory", 24, 20, 0.81),
    WardBlueprint("WARD-04", "CARD-01", "Cardiology", "Cardiology", 22, 19, 0.77),
    WardBlueprint("WARD-05", "SURG-01", "Surgical Recovery", "Surgery", 28, 24, 0.69),
    WardBlueprint("WARD-06", "SURG-02", "Elective Surgery", "Surgery", 26, 22, 0.66),
    WardBlueprint("WARD-07", "ED-OBS", "Emergency Observation", "Emergency Care", 18, 16, 0.84),
    WardBlueprint("WARD-08", "ICU-01", "Intensive Care Unit", "Critical Care", 16, 14, 0.86),
    WardBlueprint("WARD-09", "MAT-01", "Maternity", "Women and Children", 20, 18, 0.63),
    WardBlueprint("WARD-10", "PAED-01", "Paediatrics", "Women and Children", 18, 16, 0.61),
    WardBlueprint("WARD-11", "ORTH-01", "Orthopaedics", "Musculoskeletal", 24, 20, 0.67),
    WardBlueprint("WARD-12", "STROKE", "Stroke Unit", "Neurosciences", 20, 17, 0.79),
]

EVENT_TYPES = ("midnight_census", "admission", "discharge", "transfer_in", "transfer_out")
SEXES = ("F", "M")
POSTCODES = ("OC1 1AA", "OC1 2DE", "OC2 3FG", "OC3 4HJ", "OC4 5KL", "OC5 6MN")
PAYERS = (
    {"payer_id": "PAYER-A", "contract_rate": 0.92},
    {"payer_id": "PAYER-B", "contract_rate": 0.88},
    {"payer_id": "PAYER-C", "contract_rate": 0.84},
    {"payer_id": "PAYER-D", "contract_rate": 0.80},
)
ACQUISITION_CHANNELS = ("consultant_referral", "gp_network", "digital_campaign", "community_outreach")
REFERRAL_SOURCES = ("primary_care", "consultant_network", "employer_contract", "self_referral")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate deterministic synthetic MySQL demo data for the OpenCare bed occupancy use case."
    )
    parser.add_argument(
        "--output-dir",
        default="seed/mysql",
        help="Directory to write the generated MySQL SQL and validation files into.",
    )
    parser.add_argument(
        "--as-of-date",
        default="2026-03-31",
        help="Inclusive end date for the 18-month history window in YYYY-MM-DD format.",
    )
    parser.add_argument(
        "--patient-count",
        type=int,
        default=2400,
        help="Number of synthetic patients to generate.",
    )
    return parser.parse_args()


def add_months(anchor: date, months: int) -> date:
    month_index = anchor.month - 1 + months
    year = anchor.year + month_index // 12
    month = month_index % 12 + 1
    month_lengths = [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    day = min(anchor.day, month_lengths[month - 1])
    return date(year, month, day)


def sql_quote(value: object | None) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, float)):
        return str(value)
    escaped = str(value).replace("\\", "\\\\").replace("'", "''")
    return f"'{escaped}'"


def build_patients(patient_count: int) -> list[dict[str, object]]:
    patients: list[dict[str, object]] = []
    for index in range(1, patient_count + 1):
        year = 1940 + (index % 65)
        month = (index % 12) + 1
        day = ((index * 3) % 28) + 1
        patients.append(
            {
                "patient_id": f"PAT-{index:05d}",
                "medical_record_number": f"MRN-{100000 + index}",
                "date_of_birth": date(year, month, day).isoformat(),
                "sex_at_birth": SEXES[index % len(SEXES)],
                "home_postcode": POSTCODES[index % len(POSTCODES)],
            }
        )
    return patients


def scenario_for(ward: WardBlueprint, event_day: date, end_day: date) -> tuple[int, float, str | None]:
    staff_delta = 0
    occupancy_delta = 0.0
    scenario = None
    days_to_end = (end_day - event_day).days

    if ward.ward_id in {"WARD-03", "WARD-07"} and (
        (event_day.year == 2025 and event_day.month in {11, 12})
        or (event_day.year == 2026 and event_day.month in {1, 2})
    ):
        occupancy_delta += 0.12
        scenario = "winter_respiratory_surge"

    if ward.ward_id in {"WARD-05", "WARD-06"} and (
        (event_day.year == 2025 and event_day.month in {4, 5, 6})
        or (event_day.year == 2026 and event_day.month == 3)
    ):
        occupancy_delta += 0.08
        scenario = "elective_backlog_pressure"

    if ward.ward_id == "WARD-08" and (
        (event_day.year == 2025 and event_day.month in {8, 9})
        or (event_day.year == 2026 and event_day.month == 2)
    ):
        staff_delta -= 3
        occupancy_delta += 0.09
        scenario = "critical_care_staffing_squeeze"

    if ward.ward_id == "WARD-08" and days_to_end in {0, 1}:
        staff_delta -= 2
        occupancy_delta += 0.19
        scenario = "phase2_pressure_signal"

    if ward.ward_id == "WARD-07" and days_to_end == 2:
        occupancy_delta += 0.18
        scenario = "phase2_pressure_signal"

    return staff_delta, occupancy_delta, scenario


def build_bed_events(start_day: date, end_day: date, patients: list[dict[str, object]]) -> list[dict[str, object]]:
    random.seed(42)
    events: list[dict[str, object]] = []
    patient_count = len(patients)
    current_day = start_day
    patient_cursor = 0

    while current_day <= end_day:
        ordinal = (current_day - start_day).days
        seasonal = math.sin((2 * math.pi * ordinal) / 365.25) * 0.06
        weekly = math.cos((2 * math.pi * ordinal) / 7.0) * 0.03

        for ward_index, ward in enumerate(WARD_BLUEPRINTS):
            staff_delta, occupancy_delta, scenario = scenario_for(ward, current_day, end_day)
            staffed_beds = max(ward.staffed_beds_baseline + staff_delta, 8)
            licensed_beds = ward.licensed_beds
            jitter = (((ordinal + 1) * (ward_index + 3)) % 5 - 2) * 0.0125
            occupancy_ratio = min(max(ward.base_occupancy_ratio + seasonal + weekly + occupancy_delta + jitter, 0.35), 0.98)
            occupied_beds = min(max(int(round(staffed_beds * occupancy_ratio)), 1), staffed_beds)

            events.append(
                {
                    "event_id": f"{ward.ward_id}-{current_day.isoformat()}-CENSUS",
                    "event_timestamp": datetime.combine(current_day, time(23, 55)).strftime("%Y-%m-%d %H:%M:%S"),
                    "ward_id": ward.ward_id,
                    "patient_id": None,
                    "event_type": "midnight_census",
                    "occupied_beds": occupied_beds,
                    "licensed_beds": licensed_beds,
                    "staffed_beds": staffed_beds,
                    "scenario_tag": scenario,
                }
            )

            if ordinal % 2 == ward_index % 2:
                patient_id = patients[patient_cursor % patient_count]["patient_id"]
                patient_cursor += 1
                events.append(
                    {
                        "event_id": f"{ward.ward_id}-{current_day.isoformat()}-ADM",
                        "event_timestamp": datetime.combine(current_day, time(8, 30)).strftime("%Y-%m-%d %H:%M:%S"),
                        "ward_id": ward.ward_id,
                        "patient_id": patient_id,
                        "event_type": "admission",
                        "occupied_beds": min(occupied_beds + 1, licensed_beds),
                        "licensed_beds": licensed_beds,
                        "staffed_beds": staffed_beds,
                        "scenario_tag": scenario,
                    }
                )

            if ordinal % 3 == ward_index % 3:
                patient_id = patients[patient_cursor % patient_count]["patient_id"]
                patient_cursor += 1
                events.append(
                    {
                        "event_id": f"{ward.ward_id}-{current_day.isoformat()}-DIS",
                        "event_timestamp": datetime.combine(current_day, time(14, 15)).strftime("%Y-%m-%d %H:%M:%S"),
                        "ward_id": ward.ward_id,
                        "patient_id": patient_id,
                        "event_type": "discharge",
                        "occupied_beds": max(occupied_beds - 1, 0),
                        "licensed_beds": licensed_beds,
                        "staffed_beds": staffed_beds,
                        "scenario_tag": scenario,
                    }
                )

            if ward_index % 3 == 0 and ordinal % 11 == 0:
                patient_id = patients[patient_cursor % patient_count]["patient_id"]
                patient_cursor += 1
                events.append(
                    {
                        "event_id": f"{ward.ward_id}-{current_day.isoformat()}-TIN",
                        "event_timestamp": datetime.combine(current_day, time(10, 20)).strftime("%Y-%m-%d %H:%M:%S"),
                        "ward_id": ward.ward_id,
                        "patient_id": patient_id,
                        "event_type": "transfer_in",
                        "occupied_beds": min(occupied_beds + 1, licensed_beds),
                        "licensed_beds": licensed_beds,
                        "staffed_beds": staffed_beds,
                        "scenario_tag": scenario,
                    }
                )

            if ward_index % 4 == 0 and ordinal % 13 == 0:
                patient_id = patients[patient_cursor % patient_count]["patient_id"]
                patient_cursor += 1
                events.append(
                    {
                        "event_id": f"{ward.ward_id}-{current_day.isoformat()}-TOUT",
                        "event_timestamp": datetime.combine(current_day, time(16, 40)).strftime("%Y-%m-%d %H:%M:%S"),
                        "ward_id": ward.ward_id,
                        "patient_id": patient_id,
                        "event_type": "transfer_out",
                        "occupied_beds": max(occupied_beds - 1, 0),
                        "licensed_beds": licensed_beds,
                        "staffed_beds": staffed_beds,
                        "scenario_tag": scenario,
                    }
                )

        current_day += timedelta(days=1)

    return events


def build_rcm_claims(end_day: date, patients: list[dict[str, object]]) -> list[dict[str, object]]:
    claims: list[dict[str, object]] = []
    claim_total = len(WARD_BLUEPRINTS) * 18
    status_cycle = (
        "open",
        "submitted",
        "denied",
        "appealed",
        "paid",
        "closed",
        "paid",
        "writeoff",
        "submitted",
        "paid",
        "denied",
        "paid",
    )

    for index in range(1, claim_total + 1):
        ward = WARD_BLUEPRINTS[(index - 1) % len(WARD_BLUEPRINTS)]
        patient = patients[(index * 7) % len(patients)]
        payer = PAYERS[index % len(PAYERS)]
        claim_date = end_day - timedelta(days=(index * 2) % 180)
        submission_lag = index % 9
        claim_status = status_cycle[index % len(status_cycle)]
        submission_date = None if index % 11 == 0 else claim_date + timedelta(days=submission_lag)

        gross_billed_amount = round(2200 + (index % 9) * 650 + ward.licensed_beds * 15, 2)
        contracted_amount = round(gross_billed_amount * payer["contract_rate"], 2)
        paid_amount = 0.0
        payment_date = None

        if claim_status in {"paid", "closed"}:
            if index % 5 == 0:
                paid_amount = round(contracted_amount * 0.90, 2)
            elif index % 17 == 0:
                paid_amount = round(contracted_amount * 1.02, 2)
            else:
                paid_amount = contracted_amount
            payment_date = claim_date + timedelta(days=20 + (index % 30))
            if submission_date is None:
                submission_date = claim_date + timedelta(days=2)
        elif claim_status == "appealed":
            paid_amount = round(contracted_amount * 0.35, 2)
            payment_date = claim_date + timedelta(days=45 + (index % 20))
            if submission_date is None:
                submission_date = claim_date + timedelta(days=4)
        elif claim_status == "writeoff":
            paid_amount = round(contracted_amount * 0.10, 2)
            payment_date = claim_date + timedelta(days=50 + (index % 15))
            if submission_date is None:
                submission_date = claim_date + timedelta(days=3)

        updated_at = datetime.combine(min(end_day, claim_date + timedelta(days=10)), time(9, 0)).strftime(
            "%Y-%m-%d %H:%M:%S"
        )

        claims.append(
            {
                "claim_id": f"CLM-{index:05d}",
                "encounter_id": f"ENC-{index:05d}",
                "patient_id": patient["patient_id"],
                "payer_id": payer["payer_id"],
                "department_id": ward.ward_id,
                "claim_date": claim_date.isoformat(),
                "submission_date": submission_date.isoformat() if submission_date else None,
                "payment_date": payment_date.isoformat() if payment_date else None,
                "claim_status": claim_status,
                "gross_billed_amount": gross_billed_amount,
                "contracted_amount": contracted_amount,
                "paid_amount": paid_amount,
                "overpayment_flag": paid_amount > contracted_amount,
                "source_system": "his_erp_demo",
                "updated_at": updated_at,
            }
        )

    return claims


def build_rcm_financial_postings(claims: list[dict[str, object]]) -> list[dict[str, object]]:
    postings: list[dict[str, object]] = []
    for index, claim in enumerate(claims, start=1):
        if not claim["paid_amount"]:
            continue
        postings.append(
            {
                "posting_id": f"POST-{index:05d}",
                "claim_id": claim["claim_id"],
                "encounter_id": claim["encounter_id"],
                "gl_account": "4110-PATIENT-CASH",
                "posting_date": claim["payment_date"] or claim["claim_date"],
                "posting_type": "cash_receipt",
                "posting_amount": claim["paid_amount"],
                "source_system": "erp_gl_demo",
            }
        )
    return postings


def build_rcm_referrals(claims: list[dict[str, object]]) -> list[dict[str, object]]:
    referrals: list[dict[str, object]] = []
    for index, claim in enumerate(claims, start=1):
        claim_date = date.fromisoformat(str(claim["claim_date"]))
        referrals.append(
            {
                "referral_id": f"REF-{index:05d}",
                "encounter_id": claim["encounter_id"],
                "acquisition_channel": ACQUISITION_CHANNELS[index % len(ACQUISITION_CHANNELS)],
                "referral_source": REFERRAL_SOURCES[index % len(REFERRAL_SOURCES)],
                "referral_date": (claim_date - timedelta(days=(index % 14))).isoformat(),
            }
        )
    return referrals


def insert_block(table_name: str, columns: list[str], rows: list[dict[str, object]]) -> str:
    lines = [f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES"]
    rendered_rows = []
    for row in rows:
        rendered_rows.append("(" + ", ".join(sql_quote(row[column]) for column in columns) + ")")
    lines.append(",\n".join(rendered_rows) + ";")
    return "\n".join(lines)


def build_sql(
    wards: list[WardBlueprint],
    patients: list[dict[str, object]],
    bed_events: list[dict[str, object]],
    rcm_claims: list[dict[str, object]],
    rcm_financial_postings: list[dict[str, object]],
    rcm_referrals: list[dict[str, object]],
) -> str:
    ward_rows = [
        {
            "ward_id": ward.ward_id,
            "ward_code": ward.ward_code,
            "ward_name": ward.ward_name,
            "service_line": ward.service_line,
            "licensed_beds": ward.licensed_beds,
            "staffed_beds_baseline": ward.staffed_beds_baseline,
        }
        for ward in wards
    ]

    parts = [
        "-- OpenCare synthetic demo source data for MySQL",
        "SET FOREIGN_KEY_CHECKS = 0;",
        "DROP TABLE IF EXISTS rcm_referrals;",
        "DROP TABLE IF EXISTS rcm_financial_postings;",
        "DROP TABLE IF EXISTS rcm_claims;",
        "DROP TABLE IF EXISTS bed_events;",
        "DROP TABLE IF EXISTS patients;",
        "DROP TABLE IF EXISTS wards;",
        """
CREATE TABLE wards (
  ward_id VARCHAR(32) PRIMARY KEY,
  ward_code VARCHAR(32) NOT NULL,
  ward_name VARCHAR(128) NOT NULL,
  service_line VARCHAR(128),
  licensed_beds INT NOT NULL,
  staffed_beds_baseline INT NOT NULL
);
""".strip(),
        """
CREATE TABLE patients (
  patient_id VARCHAR(32) PRIMARY KEY,
  medical_record_number VARCHAR(32) NOT NULL,
  date_of_birth DATE,
  sex_at_birth VARCHAR(8),
  home_postcode VARCHAR(16)
);
""".strip(),
        """
CREATE TABLE bed_events (
  event_id VARCHAR(96) PRIMARY KEY,
  event_timestamp DATETIME NOT NULL,
  ward_id VARCHAR(32) NOT NULL,
  patient_id VARCHAR(32) NULL,
  event_type VARCHAR(32) NOT NULL,
  occupied_beds INT NOT NULL,
  licensed_beds INT NOT NULL,
  staffed_beds INT NOT NULL,
  scenario_tag VARCHAR(64) NULL
);
""".strip(),
        """
CREATE TABLE rcm_claims (
  claim_id VARCHAR(32) PRIMARY KEY,
  encounter_id VARCHAR(32) NOT NULL,
  patient_id VARCHAR(32) NOT NULL,
  payer_id VARCHAR(32) NOT NULL,
  department_id VARCHAR(32) NOT NULL,
  claim_date DATE NOT NULL,
  submission_date DATE NULL,
  payment_date DATE NULL,
  claim_status VARCHAR(32) NOT NULL,
  gross_billed_amount DECIMAL(14,2) NOT NULL,
  contracted_amount DECIMAL(14,2) NOT NULL,
  paid_amount DECIMAL(14,2) NOT NULL,
  overpayment_flag BOOLEAN NOT NULL DEFAULT 0,
  source_system VARCHAR(64) NOT NULL,
  updated_at DATETIME NOT NULL
);
""".strip(),
        """
CREATE TABLE rcm_financial_postings (
  posting_id VARCHAR(32) PRIMARY KEY,
  claim_id VARCHAR(32) NOT NULL,
  encounter_id VARCHAR(32) NOT NULL,
  gl_account VARCHAR(64) NOT NULL,
  posting_date DATE NOT NULL,
  posting_type VARCHAR(32) NOT NULL,
  posting_amount DECIMAL(14,2) NOT NULL,
  source_system VARCHAR(64) NOT NULL
);
""".strip(),
        """
CREATE TABLE rcm_referrals (
  referral_id VARCHAR(32) PRIMARY KEY,
  encounter_id VARCHAR(32) NOT NULL,
  acquisition_channel VARCHAR(64) NOT NULL,
  referral_source VARCHAR(64) NOT NULL,
  referral_date DATE NOT NULL
);
""".strip(),
        insert_block(
            "wards",
            ["ward_id", "ward_code", "ward_name", "service_line", "licensed_beds", "staffed_beds_baseline"],
            ward_rows,
        ),
        insert_block(
            "patients",
            ["patient_id", "medical_record_number", "date_of_birth", "sex_at_birth", "home_postcode"],
            patients,
        ),
        insert_block(
            "bed_events",
            ["event_id", "event_timestamp", "ward_id", "patient_id", "event_type", "occupied_beds", "licensed_beds", "staffed_beds", "scenario_tag"],
            bed_events,
        ),
        insert_block(
            "rcm_claims",
            [
                "claim_id",
                "encounter_id",
                "patient_id",
                "payer_id",
                "department_id",
                "claim_date",
                "submission_date",
                "payment_date",
                "claim_status",
                "gross_billed_amount",
                "contracted_amount",
                "paid_amount",
                "overpayment_flag",
                "source_system",
                "updated_at",
            ],
            rcm_claims,
        ),
        insert_block(
            "rcm_financial_postings",
            ["posting_id", "claim_id", "encounter_id", "gl_account", "posting_date", "posting_type", "posting_amount", "source_system"],
            rcm_financial_postings,
        ),
        insert_block(
            "rcm_referrals",
            ["referral_id", "encounter_id", "acquisition_channel", "referral_source", "referral_date"],
            rcm_referrals,
        ),
        "SET FOREIGN_KEY_CHECKS = 1;",
    ]

    return "\n\n".join(parts) + "\n"


def build_validation_sql() -> str:
    return """-- OpenCare synthetic MySQL validation checks
SELECT 'wards_row_count' AS check_name, COUNT(*) AS result FROM wards;
SELECT 'patients_row_count' AS check_name, COUNT(*) AS result FROM patients;
SELECT 'bed_events_row_count' AS check_name, COUNT(*) AS result FROM bed_events;
SELECT 'bed_event_date_range' AS check_name, MIN(DATE(event_timestamp)) AS min_event_date, MAX(DATE(event_timestamp)) AS max_event_date FROM bed_events;
SELECT 'null_ward_id_rows' AS check_name, COUNT(*) AS result FROM bed_events WHERE ward_id IS NULL;
SELECT event_type, COUNT(*) AS event_count FROM bed_events GROUP BY event_type ORDER BY event_type;
SELECT scenario_tag, COUNT(*) AS event_count FROM bed_events WHERE scenario_tag IS NOT NULL GROUP BY scenario_tag ORDER BY scenario_tag;
SELECT 'phase2_pressure_signal_rows' AS check_name, COUNT(*) AS result FROM bed_events WHERE scenario_tag = 'phase2_pressure_signal';
SELECT 'rcm_claims_row_count' AS check_name, COUNT(*) AS result FROM rcm_claims;
SELECT 'rcm_financial_postings_row_count' AS check_name, COUNT(*) AS result FROM rcm_financial_postings;
SELECT 'rcm_referrals_row_count' AS check_name, COUNT(*) AS result FROM rcm_referrals;
SELECT claim_status, COUNT(*) AS claim_count FROM rcm_claims GROUP BY claim_status ORDER BY claim_status;
SELECT payer_id, COUNT(*) AS claim_count FROM rcm_claims GROUP BY payer_id ORDER BY payer_id;
"""


def build_summary(
    wards: list[WardBlueprint],
    patients: list[dict[str, object]],
    bed_events: list[dict[str, object]],
    rcm_claims: list[dict[str, object]],
    rcm_financial_postings: list[dict[str, object]],
    rcm_referrals: list[dict[str, object]],
    start_day: date,
    end_day: date,
) -> dict[str, object]:
    event_type_counts: dict[str, int] = {event_type: 0 for event_type in EVENT_TYPES}
    scenario_counts: dict[str, int] = {}
    for event in bed_events:
        event_type_counts[str(event["event_type"])] += 1
        scenario = event.get("scenario_tag")
        if scenario:
            scenario_counts[str(scenario)] = scenario_counts.get(str(scenario), 0) + 1

    return {
        "wards_row_count": len(wards),
        "patients_row_count": len(patients),
        "bed_events_row_count": len(bed_events),
        "min_event_date": start_day.isoformat(),
        "max_event_date": end_day.isoformat(),
        "null_ward_id_rows": sum(1 for event in bed_events if event["ward_id"] is None),
        "event_type_distribution": event_type_counts,
        "scenario_event_distribution": scenario_counts,
        "phase2_expected_alert_wards": ["WARD-07", "WARD-08"],
        "phase2_expected_alert_range": {"min": 2, "max": 3},
        "rcm_claims_row_count": len(rcm_claims),
        "rcm_financial_postings_row_count": len(rcm_financial_postings),
        "rcm_referrals_row_count": len(rcm_referrals),
    }


def main() -> None:
    args = parse_args()
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    end_day = date.fromisoformat(args.as_of_date)
    start_day = add_months(end_day.replace(day=1), -17)

    patients = build_patients(args.patient_count)
    bed_events = build_bed_events(start_day, end_day, patients)
    rcm_claims = build_rcm_claims(end_day, patients)
    rcm_financial_postings = build_rcm_financial_postings(rcm_claims)
    rcm_referrals = build_rcm_referrals(rcm_claims)
    summary = build_summary(
        WARD_BLUEPRINTS,
        patients,
        bed_events,
        rcm_claims,
        rcm_financial_postings,
        rcm_referrals,
        start_day,
        end_day,
    )

    sql_path = output_dir / "opencare_demo_mysql.sql"
    validation_path = output_dir / "opencare_demo_validation.sql"
    summary_path = output_dir / "opencare_demo_summary.json"

    sql_path.write_text(
        build_sql(
            WARD_BLUEPRINTS,
            patients,
            bed_events,
            rcm_claims,
            rcm_financial_postings,
            rcm_referrals,
        ),
        encoding="utf-8",
    )
    validation_path.write_text(build_validation_sql(), encoding="utf-8")
    summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")

    print(f"Wrote {sql_path}")
    print(f"Wrote {validation_path}")
    print(f"Wrote {summary_path}")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
