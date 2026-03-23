"""teams club_id FK to clubs

Revision ID: b2c3d4e5f6a7
Revises: f8a91c2b3d04
Create Date: 2026-03-22

Existing teams get club_id = 2 before NOT NULL and FK.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "f8a91c2b3d04"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("teams", sa.Column("club_id", sa.BigInteger(), nullable=True))
    op.execute(sa.text("UPDATE teams SET club_id = 2"))
    op.alter_column("teams", "club_id", nullable=False)
    op.create_index("ix_teams_club_id", "teams", ["club_id"], unique=False)
    op.create_foreign_key(
        "fk_teams_club_id_clubs",
        "teams",
        "clubs",
        ["club_id"],
        ["id"],
        ondelete="RESTRICT",
    )


def downgrade() -> None:
    op.drop_constraint("fk_teams_club_id_clubs", "teams", type_="foreignkey")
    op.drop_index("ix_teams_club_id", table_name="teams")
    op.drop_column("teams", "club_id")
