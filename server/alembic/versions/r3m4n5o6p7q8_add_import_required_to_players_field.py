"""add import_required to players_field

Revision ID: r3m4n5o6p7q8
Revises: q2l3m4n5o6p7
Create Date: 2026-10-31 16:40:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "r3m4n5o6p7q8"
down_revision: Union[str, None] = "q2l3m4n5o6p7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "players_field",
        sa.Column(
            "import_required",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )


def downgrade() -> None:
    op.drop_column("players_field", "import_required")
