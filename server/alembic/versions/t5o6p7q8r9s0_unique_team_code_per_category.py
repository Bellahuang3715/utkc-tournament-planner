"""unique team code per category within tournament

Revision ID: t5o6p7q8r9s0
Revises: s4n5o6p7q8r9
Create Date: 2026-11-14

Team names (code) must be unique within a category for a tournament.
The same name may still appear in different categories (e.g. UOT A in Mixed
and UOT A in Womens).

Existing duplicates are renamed before the constraint is applied so startup
does not fail on databases that already have them.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "t5o6p7q8r9s0"
down_revision: Union[str, None] = "s4n5o6p7q8r9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _dedupe_team_codes() -> None:
    """Keep the lowest-id team; rename later duplicates within the same category."""
    conn = op.get_bind()
    duplicates = conn.execute(
        sa.text(
            """
            SELECT tournament_id, category_id, code
            FROM teams
            GROUP BY tournament_id, category_id, code
            HAVING COUNT(*) > 1
            """
        )
    ).fetchall()

    for tournament_id, category_id, code in duplicates:
        rows = conn.execute(
            sa.text(
                """
                SELECT id
                FROM teams
                WHERE tournament_id = :tournament_id
                  AND category_id = :category_id
                  AND code = :code
                ORDER BY id
                """
            ),
            {
                "tournament_id": tournament_id,
                "category_id": category_id,
                "code": code,
            },
        ).fetchall()

        # Keep the first row; rename the rest to free codes in this category.
        for offset, (team_id,) in enumerate(rows[1:], start=2):
            new_code = f"{code} ({offset})"
            suffix = offset
            while True:
                exists = conn.execute(
                    sa.text(
                        """
                        SELECT 1
                        FROM teams
                        WHERE tournament_id = :tournament_id
                          AND category_id = :category_id
                          AND code = :code
                        LIMIT 1
                        """
                    ),
                    {
                        "tournament_id": tournament_id,
                        "category_id": category_id,
                        "code": new_code,
                    },
                ).fetchone()
                if exists is None:
                    break
                suffix += 1
                new_code = f"{code} ({suffix})"

            conn.execute(
                sa.text("UPDATE teams SET code = :new_code WHERE id = :team_id"),
                {"new_code": new_code, "team_id": team_id},
            )


def upgrade() -> None:
    _dedupe_team_codes()
    op.create_unique_constraint(
        "uq_teams_tournament_category_code",
        "teams",
        ["tournament_id", "category_id", "code"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_teams_tournament_category_code",
        "teams",
        type_="unique",
    )
