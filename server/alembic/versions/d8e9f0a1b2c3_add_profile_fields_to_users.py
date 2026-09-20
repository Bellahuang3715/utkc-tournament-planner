"""add profile fields to users

Revision ID: d8e9f0a1b2c3
Revises: c7d8e9f0a1b2
Create Date: 2026-09-19 22:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d8e9f0a1b2c3"
down_revision: Union[str, None] = "c7d8e9f0a1b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("phone", sa.String(), nullable=True))
    op.add_column("users", sa.Column("organization", sa.String(), nullable=True))
    op.add_column("users", sa.Column("title", sa.String(), nullable=True))
    op.add_column("users", sa.Column("city", sa.String(), nullable=True))
    op.add_column("users", sa.Column("country", sa.String(), nullable=True, server_default="Canada"))
    op.add_column("users", sa.Column("bio", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "bio")
    op.drop_column("users", "country")
    op.drop_column("users", "city")
    op.drop_column("users", "title")
    op.drop_column("users", "organization")
    op.drop_column("users", "phone")
