"""merge alembic heads

Revision ID: 41f7234fea4b
Revises: 3fb87b7c4ffd, abcd1234add
Create Date: 2026-03-04 22:05:47.033533

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '41f7234fea4b'
down_revision: Union[str, None] = ('3fb87b7c4ffd', 'abcd1234add')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
