from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

import psycopg
from psycopg import sql
from psycopg.rows import dict_row

from app.config import settings


@contextmanager
def connect() -> Iterator[psycopg.Connection]:
    with psycopg.connect(settings.postgres_dsn(), row_factory=dict_row) as conn:
        yield conn


def qualified_table(schema: str, table: str) -> sql.Composed:
    return sql.SQL("{}.{}").format(sql.Identifier(schema), sql.Identifier(table))


def split_table_name(table_name: str) -> tuple[str, str]:
    if "." not in table_name:
        raise ValueError(f"Expected qualified table name, got {table_name!r}")
    schema, table = table_name.split(".", 1)
    return schema, table
