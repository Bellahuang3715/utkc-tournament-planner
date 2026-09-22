"""add creator_id to tournaments

Revision ID: h3c4d5e6f7a8
Revises: g2b3c4d5e6f7
Create Date: 2026-09-21 23:10:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "h3c4d5e6f7a8"
down_revision: Union[str, None] = "g2b3c4d5e6f7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "tournaments",
        sa.Column("creator_id", sa.BigInteger(), nullable=True),
    )

    # Backfill existing rows to the earliest user (typically the first organizer).
    op.execute(
        """
        UPDATE tournaments
        SET creator_id = (SELECT id FROM users ORDER BY id ASC LIMIT 1)
        WHERE creator_id IS NULL
        """
    )

    # If there are still nulls (empty users table), drop orphan tournaments.
    op.execute("DELETE FROM tournaments WHERE creator_id IS NULL")

    op.alter_column("tournaments", "creator_id", nullable=False)
    op.create_index("ix_tournaments_creator_id", "tournaments", ["creator_id"])
    op.create_foreign_key(
        "fk_tournaments_creator_id_users",
        "tournaments",
        "users",
        ["creator_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_tournaments_creator_id_users", "tournaments", type_="foreignkey")
    op.drop_index("ix_tournaments_creator_id", table_name="tournaments")
    op.drop_column("tournaments", "creator_id")
