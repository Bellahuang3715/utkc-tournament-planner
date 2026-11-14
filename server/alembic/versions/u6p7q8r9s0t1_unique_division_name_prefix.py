"""unique division name and prefix per tournament

Revision ID: u6p7q8r9s0t1
Revises: t5o6p7q8r9s0
Create Date: 2026-11-14

Division names must be unique within a tournament. Prefixes must also be
unique within a tournament when set (NULL/empty prefixes remain allowed on
multiple divisions).

Existing duplicates are renamed before the constraints are applied.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "u6p7q8r9s0t1"
down_revision: Union[str, None] = "t5o6p7q8r9s0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _normalize_empty_prefixes() -> None:
    """Treat blank prefixes as NULL so multiple empty prefixes stay allowed."""
    op.execute(
        sa.text(
            """
            UPDATE divisions
            SET prefix = NULL
            WHERE prefix IS NOT NULL AND btrim(prefix) = ''
            """
        )
    )


def _dedupe_column(column: str) -> None:
    """Keep the lowest-id row; rename later duplicates within the same tournament."""
    conn = op.get_bind()
    duplicates = conn.execute(
        sa.text(
            f"""
            SELECT tournament_id, {column}
            FROM divisions
            WHERE {column} IS NOT NULL
            GROUP BY tournament_id, {column}
            HAVING COUNT(*) > 1
            """
        )
    ).fetchall()

    for tournament_id, value in duplicates:
        rows = conn.execute(
            sa.text(
                f"""
                SELECT id
                FROM divisions
                WHERE tournament_id = :tournament_id
                  AND {column} = :value
                ORDER BY id
                """
            ),
            {"tournament_id": tournament_id, "value": value},
        ).fetchall()

        for offset, (division_id,) in enumerate(rows[1:], start=2):
            new_value = f"{value} ({offset})"
            suffix = offset
            while True:
                exists = conn.execute(
                    sa.text(
                        f"""
                        SELECT 1
                        FROM divisions
                        WHERE tournament_id = :tournament_id
                          AND {column} = :value
                        LIMIT 1
                        """
                    ),
                    {"tournament_id": tournament_id, "value": new_value},
                ).fetchone()
                if exists is None:
                    break
                suffix += 1
                new_value = f"{value} ({suffix})"

            conn.execute(
                sa.text(f"UPDATE divisions SET {column} = :new_value WHERE id = :division_id"),
                {"new_value": new_value, "division_id": division_id},
            )


def upgrade() -> None:
    _normalize_empty_prefixes()
    _dedupe_column("name")
    _dedupe_column("prefix")
    op.create_unique_constraint(
        "uq_divisions_tournament_name",
        "divisions",
        ["tournament_id", "name"],
    )
    op.create_unique_constraint(
        "uq_divisions_tournament_prefix",
        "divisions",
        ["tournament_id", "prefix"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_divisions_tournament_prefix",
        "divisions",
        type_="unique",
    )
    op.drop_constraint(
        "uq_divisions_tournament_name",
        "divisions",
        type_="unique",
    )
