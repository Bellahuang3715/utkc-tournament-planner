"""add country column to clubs

Revision ID: c7d8e9f0a1b2
Revises: a1b2c3d4e5f6
Create Date: 2026-09-19 22:16:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c7d8e9f0a1b2"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "clubs",
        sa.Column("country", sa.String(), nullable=False, server_default="Canada"),
    )
    op.create_index(op.f("ix_clubs_country"), "clubs", ["country"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_clubs_country"), table_name="clubs")
    op.drop_column("clubs", "country")
