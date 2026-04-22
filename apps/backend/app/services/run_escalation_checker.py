from __future__ import annotations

from app.services.decision_service import check_escalations


def main() -> None:
    print(check_escalations())


if __name__ == "__main__":
    main()
