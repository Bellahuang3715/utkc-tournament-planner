"""add bracket_edit_locks

Revision ID: k6f7a8b9c0d1
Revises: j5e6f7a8b9c0
Create Date: 2026-09-22 19:50:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "k6f7a8b9c0d1"
down_revision: Union[str, None] = "j5e6f7a8b9c0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "bracket_edit_locks",
        sa.Column(
            "bracket_id",
            sa.BigInteger(),
            sa.ForeignKey("brackets.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("holder_session_id", sa.String(), nullable=False),
        sa.Column("holder_name", sa.String(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_bracket_edit_locks_updated_at",
        "bracket_edit_locks",
        ["updated_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_bracket_edit_locks_updated_at", table_name="bracket_edit_locks")
    op.drop_table("bracket_edit_locks")
