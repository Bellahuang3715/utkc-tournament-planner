"""players code unique per tournament

Revision ID: e1a2b3c4d5e6
Revises: 64ce80e74e22
Create Date: 2026-03-07

Player code is unique per tournament (not globally), so the same code (e.g. A01)
can exist in different tournaments.
"""
from typing import Sequence, Union

from alembic import op


revision: str = "e1a2b3c4d5e6"
down_revision: Union[str, None] = "64ce80e74e22"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop global unique index on code
    op.drop_index("ix_players_code", table_name="players")
    # Add non-unique index on code for lookups
    op.create_index("ix_players_code", "players", ["code"], unique=False)
    # Unique per (tournament_id, code)
    op.create_unique_constraint(
        "uq_players_tournament_code",
        "players",
        ["tournament_id", "code"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_players_tournament_code", "players", type_="unique")
    op.drop_index("ix_players_code", table_name="players")
    op.create_index("ix_players_code", "players", ["code"], unique=True)
