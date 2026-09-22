"""add team_id to bracket_cells for team advances

Revision ID: f1a2b3c4d5e6
Revises: e9f0a1b2c3d4
Create Date: 2026-09-21 21:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, None] = "e9f0a1b2c3d4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "bracket_cells",
        sa.Column("team_id", sa.BigInteger(), nullable=True),
    )
    op.create_foreign_key(
        "fk_bracket_cells_team_id_teams",
        "bracket_cells",
        "teams",
        ["team_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        op.f("ix_bracket_cells_team_id"),
        "bracket_cells",
        ["team_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_bracket_cells_team_id"), table_name="bracket_cells")
    op.drop_constraint(
        "fk_bracket_cells_team_id_teams",
        "bracket_cells",
        type_="foreignkey",
    )
    op.drop_column("bracket_cells", "team_id")
