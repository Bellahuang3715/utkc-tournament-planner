"""drop tournament_members if present

Revision ID: j5e6f7a8b9c0
Revises: i4d5e6f7a8b9
Create Date: 2026-09-22 19:35:00.000000

"""

from typing import Sequence, Union

from alembic import op


revision: str = "j5e6f7a8b9c0"
down_revision: Union[str, None] = "i4d5e6f7a8b9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # No-op if the table was never created (token-only scorekeeper model).
    op.execute("DROP TABLE IF EXISTS tournament_members")
    op.execute("DROP TYPE IF EXISTS tournament_member_role")


def downgrade() -> None:
    # Membership model intentionally removed; no recreate.
    pass
