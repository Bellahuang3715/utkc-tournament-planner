"""drop players_can_be_in_multiple_teams from tournaments

Revision ID: s4n5o6p7q8r9
Revises: r3m4n5o6p7q8
Create Date: 2026-10-31 18:20:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "s4n5o6p7q8r9"
down_revision: Union[str, None] = "r3m4n5o6p7q8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("tournaments", "players_can_be_in_multiple_teams")


def downgrade() -> None:
    op.add_column(
        "tournaments",
        sa.Column(
            "players_can_be_in_multiple_teams",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )
