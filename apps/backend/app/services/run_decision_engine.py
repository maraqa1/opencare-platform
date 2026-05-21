from __future__ import annotations

from app.services.decision_service import generate_decisions


def main() -> None:
    print(generate_decisions())


if __name__ == "__main__":
    main()
