"""add location and description columns to tournaments

Revision ID: abcd1234add
Revises: d24b3bdbf897
Create Date: 2026-03-04 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "abcd1234add"
down_revision: Union[str, None] = "d24b3bdbf897"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tournaments", sa.Column("location", sa.String(), nullable=True))
    op.add_column("tournaments", sa.Column("description", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("tournaments", "description")
    op.drop_column("tournaments", "location")

