"""drop teams.name column (use teams.code only)

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-03-22

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_index(op.f("ix_teams_name"), table_name="teams")
    op.drop_column("teams", "name")


def downgrade() -> None:
    op.add_column(
        "teams",
        sa.Column("name", sa.String(), nullable=False, server_default=""),
    )
    op.create_index(op.f("ix_teams_name"), "teams", ["name"], unique=False)
    op.alter_column("teams", "name", server_default=None)
