"""add bracket_cells for filled-bracket scores

Revision ID: a1b2c3d4e5f6
Revises: 9d2f6c1a7b10
Create Date: 2026-09-19 17:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "9d2f6c1a7b10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "bracket_cells",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("bracket_id", sa.BigInteger(), nullable=False),
        sa.Column("slot_idx", sa.Integer(), nullable=False),
        sa.Column("player_id", sa.BigInteger(), nullable=True),
        sa.Column("score", sa.String(), server_default="", nullable=False),
        sa.ForeignKeyConstraint(["bracket_id"], ["brackets.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["player_id"], ["players.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("bracket_id", "slot_idx", name="uq_bracket_cells_bracket_slot"),
    )
    op.create_index(op.f("ix_bracket_cells_bracket_id"), "bracket_cells", ["bracket_id"], unique=False)
    op.create_index(op.f("ix_bracket_cells_id"), "bracket_cells", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_bracket_cells_id"), table_name="bracket_cells")
    op.drop_index(op.f("ix_bracket_cells_bracket_id"), table_name="bracket_cells")
    op.drop_table("bracket_cells")
