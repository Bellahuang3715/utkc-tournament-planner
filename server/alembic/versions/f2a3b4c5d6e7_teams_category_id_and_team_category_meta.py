"""teams.category -> category_id FK; teams_category.position + unique

Revision ID: f2a3b4c5d6e7
Revises: e5f6a7b8c9d0
Create Date: 2026-03-22

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f2a3b4c5d6e7"
down_revision: Union[str, None] = "e5f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "teams_category",
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
    )
    op.alter_column("teams_category", "position", server_default=None)

    op.execute(
        """
        DELETE FROM teams_category a USING teams_category b
        WHERE a.id > b.id AND a.tournament_id = b.tournament_id AND a.name = b.name
        """
    )
    op.create_unique_constraint(
        "uq_teams_category_tournament_name",
        "teams_category",
        ["tournament_id", "name"],
    )

    op.add_column("teams", sa.Column("category_id", sa.BigInteger(), nullable=True))
    op.create_foreign_key(
        "teams_category_id_fkey",
        "teams",
        "teams_category",
        ["category_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_index("ix_teams_team_category_id", "teams", ["category_id"], unique=False)

    op.execute(
        """
        INSERT INTO teams_category (tournament_id, name, color, position)
        SELECT t.id, v.name, v.color, v.pos
        FROM tournaments t
        CROSS JOIN (
            VALUES ('Mixed', '#d0ebff', 0), ('Womens', '#ffdeeb', 1)
        ) AS v(name, color, pos)
        ON CONFLICT ON CONSTRAINT uq_teams_category_tournament_name DO NOTHING
        """
    )

    op.execute(
        """
        INSERT INTO teams_category (tournament_id, name, color, position)
        SELECT DISTINCT t.tournament_id, t.category,
            CASE
                WHEN lower(t.category) = 'mixed' THEN '#d0ebff'
                WHEN lower(t.category) = 'womens' THEN '#ffdeeb'
                ELSE '#e9ecef'
            END,
            2
        FROM teams t
        WHERE NOT EXISTS (
            SELECT 1 FROM teams_category tc
            WHERE tc.tournament_id = t.tournament_id
            AND lower(tc.name) = lower(t.category)
        )
        ON CONFLICT ON CONSTRAINT uq_teams_category_tournament_name DO NOTHING
        """
    )

    op.execute(
        """
        UPDATE teams t
        SET category_id = tc.id
        FROM teams_category tc
        WHERE tc.tournament_id = t.tournament_id
        AND lower(tc.name) = lower(t.category)
        """
    )

    op.execute(
        """
        UPDATE teams t
        SET category_id = (
            SELECT tc.id FROM teams_category tc
            WHERE tc.tournament_id = t.tournament_id AND tc.name = 'Mixed'
            LIMIT 1
        )
        WHERE t.category_id IS NULL
        """
    )

    op.drop_index(op.f("ix_teams_category"), table_name="teams")
    op.drop_column("teams", "category")

    op.alter_column("teams", "category_id", existing_type=sa.BigInteger(), nullable=False)


def downgrade() -> None:
    op.add_column(
        "teams",
        sa.Column("category", sa.String(), nullable=True),
    )
    op.execute(
        """
        UPDATE teams t
        SET category = tc.name
        FROM teams_category tc
        WHERE tc.id = t.category_id
        """
    )
    op.alter_column("teams", "category", nullable=False, server_default="Mixed")
    op.alter_column("teams", "category", server_default=None)

    op.create_index(op.f("ix_teams_category"), "teams", ["category"], unique=False)

    op.drop_constraint("teams_category_id_fkey", "teams", type_="foreignkey")
    op.drop_index("ix_teams_team_category_id", table_name="teams")
    op.drop_column("teams", "category_id")

    op.drop_constraint("uq_teams_category_tournament_name", "teams_category", type_="unique")
    op.drop_column("teams_category", "position")
