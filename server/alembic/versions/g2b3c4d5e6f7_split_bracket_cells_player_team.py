"""split bracket_cells into player_bracket_cells and team_bracket_cells

Revision ID: g2b3c4d5e6f7
Revises: f1a2b3c4d5e6
Create Date: 2026-09-21 21:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "g2b3c4d5e6f7"
down_revision: Union[str, None] = "f1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Remove the short-lived team_id column from the shared cells table.
    op.drop_index(op.f("ix_bracket_cells_team_id"), table_name="bracket_cells")
    op.drop_constraint(
        "fk_bracket_cells_team_id_teams",
        "bracket_cells",
        type_="foreignkey",
    )
    op.drop_column("bracket_cells", "team_id")

    op.rename_table("bracket_cells", "player_bracket_cells")
    op.execute(
        "ALTER TABLE player_bracket_cells "
        "RENAME CONSTRAINT uq_bracket_cells_bracket_slot "
        "TO uq_player_bracket_cells_bracket_slot"
    )
    op.execute(
        "ALTER INDEX IF EXISTS ix_bracket_cells_bracket_id "
        "RENAME TO ix_player_bracket_cells_bracket_id"
    )
    op.execute(
        "ALTER INDEX IF EXISTS ix_bracket_cells_id "
        "RENAME TO ix_player_bracket_cells_id"
    )

    op.create_table(
        "team_bracket_cells",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("bracket_id", sa.BigInteger(), nullable=False),
        sa.Column("slot_idx", sa.Integer(), nullable=False),
        sa.Column("team_id", sa.BigInteger(), nullable=True),
        sa.ForeignKeyConstraint(["bracket_id"], ["brackets.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "bracket_id", "slot_idx", name="uq_team_bracket_cells_bracket_slot"
        ),
    )
    op.create_index(
        op.f("ix_team_bracket_cells_bracket_id"),
        "team_bracket_cells",
        ["bracket_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_team_bracket_cells_id"),
        "team_bracket_cells",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_team_bracket_cells_team_id"),
        "team_bracket_cells",
        ["team_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_team_bracket_cells_team_id"), table_name="team_bracket_cells")
    op.drop_index(op.f("ix_team_bracket_cells_id"), table_name="team_bracket_cells")
    op.drop_index(
        op.f("ix_team_bracket_cells_bracket_id"), table_name="team_bracket_cells"
    )
    op.drop_table("team_bracket_cells")

    op.execute(
        "ALTER INDEX IF EXISTS ix_player_bracket_cells_id "
        "RENAME TO ix_bracket_cells_id"
    )
    op.execute(
        "ALTER INDEX IF EXISTS ix_player_bracket_cells_bracket_id "
        "RENAME TO ix_bracket_cells_bracket_id"
    )
    op.execute(
        "ALTER TABLE player_bracket_cells "
        "RENAME CONSTRAINT uq_player_bracket_cells_bracket_slot "
        "TO uq_bracket_cells_bracket_slot"
    )
    op.rename_table("player_bracket_cells", "bracket_cells")

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
