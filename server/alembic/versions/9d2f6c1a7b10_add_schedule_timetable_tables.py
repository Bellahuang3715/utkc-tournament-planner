"""add schedule timetable tables

Revision ID: 9d2f6c1a7b10
Revises: f2a3b4c5d6e7
Create Date: 2026-03-23
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9d2f6c1a7b10"
down_revision: Union[str, None] = "f2a3b4c5d6e7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "schedule_timeblocks",
        sa.Column("id", sa.BigInteger(), nullable=False, autoincrement=True),
        sa.Column("tournament_id", sa.BigInteger(), nullable=False),
        sa.Column("court_id", sa.BigInteger(), nullable=True),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_mins", sa.Integer(), nullable=False),
        sa.Column("kind", sa.String(), nullable=False),
        sa.Column("label", sa.Text(), nullable=False),
        sa.Column("division_id", sa.BigInteger(), nullable=True),
        sa.Column("bracket_id", sa.BigInteger(), nullable=True),
        sa.ForeignKeyConstraint(["bracket_id"], ["brackets.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["court_id"], ["courts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["division_id"], ["divisions.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["tournament_id"], ["tournaments.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_schedule_timeblocks_id", "schedule_timeblocks", ["id"], unique=False)
    op.create_index(
        "ix_schedule_timeblocks_tournament_id",
        "schedule_timeblocks",
        ["tournament_id"],
        unique=False,
    )
    op.create_index(
        "ix_schedule_timeblocks_court_id",
        "schedule_timeblocks",
        ["court_id"],
        unique=False,
    )

    op.create_table(
        "schedule_custom_blocks",
        sa.Column("id", sa.BigInteger(), nullable=False, autoincrement=True),
        sa.Column("tournament_id", sa.BigInteger(), nullable=False),
        sa.Column("label", sa.Text(), nullable=False),
        sa.Column("duration_mins", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["tournament_id"], ["tournaments.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_schedule_custom_blocks_id", "schedule_custom_blocks", ["id"], unique=False
    )
    op.create_index(
        "ix_schedule_custom_blocks_tournament_id",
        "schedule_custom_blocks",
        ["tournament_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_schedule_custom_blocks_tournament_id", table_name="schedule_custom_blocks")
    op.drop_index("ix_schedule_custom_blocks_id", table_name="schedule_custom_blocks")
    op.drop_table("schedule_custom_blocks")

    op.drop_index("ix_schedule_timeblocks_court_id", table_name="schedule_timeblocks")
    op.drop_index("ix_schedule_timeblocks_tournament_id", table_name="schedule_timeblocks")
    op.drop_index("ix_schedule_timeblocks_id", table_name="schedule_timeblocks")
    op.drop_table("schedule_timeblocks")
