"""teams can belong to more than one club

Revision ID: q2l3m4n5o6p7
Revises: p1k2l3m4n5o6
Create Date: 2026-09-27 10:45:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "q2l3m4n5o6p7"
down_revision: Union[str, None] = "p1k2l3m4n5o6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "teams_x_clubs",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("team_id", sa.BigInteger(), nullable=False),
        sa.Column("club_id", sa.BigInteger(), nullable=False),
        sa.ForeignKeyConstraint(["club_id"], ["clubs.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("team_id", "club_id", name="uq_teams_x_clubs_team_club"),
    )
    op.create_index("ix_teams_x_clubs_id", "teams_x_clubs", ["id"], unique=False)
    op.create_index("ix_teams_x_clubs_club_id", "teams_x_clubs", ["club_id"], unique=False)
    op.execute(
        """
        INSERT INTO teams_x_clubs (team_id, club_id)
        SELECT id, club_id FROM teams WHERE club_id IS NOT NULL
        """
    )


def downgrade() -> None:
    op.drop_index("ix_teams_x_clubs_club_id", table_name="teams_x_clubs")
    op.drop_index("ix_teams_x_clubs_id", table_name="teams_x_clubs")
    op.drop_table("teams_x_clubs")
