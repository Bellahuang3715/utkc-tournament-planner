"""add display_order to courts

Revision ID: m8h9i0j1k2l3
Revises: l7g8h9i0j1k2
Create Date: 2026-09-23 17:50:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "m8h9i0j1k2l3"
down_revision: Union[str, None] = "l7g8h9i0j1k2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "courts",
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
    )
    # Backfill per tournament by current name order
    op.execute(
        """
        WITH ranked AS (
          SELECT id,
                 ROW_NUMBER() OVER (
                   PARTITION BY tournament_id
                   ORDER BY name ASC, id ASC
                 ) - 1 AS rn
          FROM courts
        )
        UPDATE courts
        SET display_order = ranked.rn
        FROM ranked
        WHERE courts.id = ranked.id
        """
    )
    op.alter_column("courts", "display_order", server_default=None)


def downgrade() -> None:
    op.drop_column("courts", "display_order")
