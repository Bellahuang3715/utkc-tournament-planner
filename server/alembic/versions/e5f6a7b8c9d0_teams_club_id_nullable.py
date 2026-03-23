"""teams.club_id nullable

Revision ID: e5f6a7b8c9d0
Revises: c3d4e5f6a7b8
Create Date: 2026-03-22

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("teams", "club_id", existing_type=sa.BigInteger(), nullable=True)


def downgrade() -> None:
    op.alter_column("teams", "club_id", existing_type=sa.BigInteger(), nullable=False)
