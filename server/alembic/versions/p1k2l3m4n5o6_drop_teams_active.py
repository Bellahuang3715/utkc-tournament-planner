"""drop active from teams

Revision ID: p1k2l3m4n5o6
Revises: o0j1k2l3m4n5
Create Date: 2026-09-26 16:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "p1k2l3m4n5o6"
down_revision: Union[str, None] = "o0j1k2l3m4n5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_index("ix_teams_active", table_name="teams")
    op.drop_column("teams", "active")


def downgrade() -> None:
    op.add_column(
        "teams",
        sa.Column(
            "active",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
    )
    op.create_index("ix_teams_active", "teams", ["active"], unique=False)
