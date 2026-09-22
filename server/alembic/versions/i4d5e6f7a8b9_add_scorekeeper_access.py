"""add scorekeeper_token to tournaments

Revision ID: i4d5e6f7a8b9
Revises: h3c4d5e6f7a8
Create Date: 2026-09-22 19:20:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "i4d5e6f7a8b9"
down_revision: Union[str, None] = "h3c4d5e6f7a8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "tournaments",
        sa.Column("scorekeeper_token", sa.String(), nullable=True),
    )
    op.create_index(
        "ix_tournaments_scorekeeper_token",
        "tournaments",
        ["scorekeeper_token"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_tournaments_scorekeeper_token", table_name="tournaments")
    op.drop_column("tournaments", "scorekeeper_token")
