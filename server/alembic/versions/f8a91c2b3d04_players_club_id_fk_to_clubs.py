"""players club_id FK to clubs (replaces string club column)

Revision ID: f8a91c2b3d04
Revises: e1a2b3c4d5e6
Create Date: 2026-03-22

Existing players.club (string) is replaced by players.club_id -> clubs.id.
All existing rows are assigned club_id = 2 before the old column is dropped.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f8a91c2b3d04"
down_revision: Union[str, None] = "e1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("players", sa.Column("club_id", sa.BigInteger(), nullable=True))
    op.execute(sa.text("UPDATE players SET club_id = 2"))
    op.alter_column("players", "club_id", nullable=False)
    op.drop_index("ix_players_club", table_name="players")
    op.drop_column("players", "club")
    op.create_index("ix_players_club_id", "players", ["club_id"], unique=False)
    op.create_foreign_key(
        "fk_players_club_id_clubs",
        "players",
        "clubs",
        ["club_id"],
        ["id"],
        ondelete="RESTRICT",
    )


def downgrade() -> None:
    op.drop_constraint("fk_players_club_id_clubs", "players", type_="foreignkey")
    op.drop_index("ix_players_club_id", table_name="players")
    op.add_column("players", sa.Column("club", sa.String(), nullable=True))
    op.execute(
        sa.text(
            """
            UPDATE players AS p
            SET club = c.name
            FROM clubs AS c
            WHERE c.id = p.club_id
            """
        )
    )
    op.alter_column("players", "club", nullable=False)
    op.drop_column("players", "club_id")
    op.create_index("ix_players_club", "players", ["club"], unique=False)
