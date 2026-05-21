from __future__ import annotations

from app.services.decision_service import measure_outcomes


def main() -> None:
    print(measure_outcomes())


if __name__ == "__main__":
    main()
