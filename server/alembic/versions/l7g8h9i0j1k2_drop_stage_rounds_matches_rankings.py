"""drop stages, stage_items, stage_item_inputs, rounds, matches, rankings

Revision ID: l7g8h9i0j1k2
Revises: k6f7a8b9c0d1
Create Date: 2026-09-22 21:10:00.000000

"""

from typing import Sequence, Union

from alembic import op


revision: str = "l7g8h9i0j1k2"
down_revision: Union[str, None] = "k6f7a8b9c0d1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_table("matches")
    op.drop_table("rounds")
    op.drop_table("stage_item_inputs")
    op.drop_table("stage_items")
    op.drop_table("stages")
    op.drop_table("rankings")
    op.execute("DROP TYPE IF EXISTS stage_type")


def downgrade() -> None:
    raise NotImplementedError("Irreversible migration: stage/rounds/matches/rankings removed")
