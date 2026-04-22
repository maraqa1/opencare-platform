from __future__ import annotations

import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any

from app.config import settings


def send_decision_email(decision: dict[str, Any], recipient_email: str, notification_type: str) -> tuple[str, str | None]:
    """Send an NHS-safe decision email. Returns delivery status and optional error."""
    if not recipient_email:
        return "skipped", "recipient email not configured"
    if not settings.smtp_password:
        return "skipped", "SMTP_PASS not configured"

    ward_name = str(decision.get("entity_name") or "OpenCare")
    ward_label = ward_name.split(" - ")[0].strip()
    priority = str(decision.get("priority") or "recommended").upper()
    decision_type = str(decision.get("decision_type") or "decision").replace("_", " ").title()

    subject = f"[OpenCare] {priority}: Action required - {ward_label}"
    if notification_type == "escalation":
        subject = f"[OpenCare] ESCALATION: Unactioned {priority} decision - {ward_label}"
    elif notification_type == "completion":
        subject = f"[OpenCare] COMPLETED: Decision executed - {ward_label}"

    if notification_type == "completion":
        body = f"""A decision has been executed in OpenCare.

Ward: {ward_label}
Type: {decision_type}
Priority: {priority}
Status: COMPLETED

Expected impact:
- Beds released: {decision.get("expected_beds_released") or 0}
- Occupancy before: {decision.get("expected_occupancy_before") or "n/a"}%
- Occupancy after: {decision.get("expected_occupancy_after") or "n/a"}%
- Risk change: {decision.get("expected_risk_reduction") or "pending"}

OpenCare will measure the outcome against the latest ward snapshot after the configured measurement window.

Review decision:
https://opencare.opendatalake.com/use-cases/bed-pressure/decisions

No patient-identifiable information is included in this notification.
This is an automated message from OpenCare. Do not reply to this email.
"""
    else:
        body = f"""You have a {priority} decision requiring action in OpenCare.

Ward: {ward_label}
Type: {decision_type}
Priority: {priority}

Review and act now:
https://opencare.opendatalake.com/use-cases/bed-pressure/decisions

No patient-identifiable information is included in this notification.
This is an automated message from OpenCare. Do not reply to this email.
"""

    msg = MIMEMultipart()
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from
    msg["To"] = recipient_email
    msg.attach(MIMEText(body, "plain"))

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
            if settings.smtp_use_tls:
                server.starttls(context=context)
            server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)
        return "sent", None
    except Exception as exc:  # pragma: no cover - depends on external SMTP
        return "failed", str(exc)
