"""add dashboard_preview_token to tournaments

Revision ID: e9f0a1b2c3d4
Revises: d8e9f0a1b2c3
Create Date: 2026-09-20 23:40:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e9f0a1b2c3d4"
down_revision: Union[str, None] = "d8e9f0a1b2c3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "tournaments",
        sa.Column("dashboard_preview_token", sa.String(), nullable=True),
    )
    op.create_index(
        "ix_tournaments_dashboard_preview_token",
        "tournaments",
        ["dashboard_preview_token"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_tournaments_dashboard_preview_token", table_name="tournaments")
    op.drop_column("tournaments", "dashboard_preview_token")
