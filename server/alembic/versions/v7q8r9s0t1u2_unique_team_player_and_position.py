"""unique player per team and unique filled position per team

Revision ID: v7q8r9s0t1u2
Revises: u6p7q8r9s0t1
Create Date: 2026-11-25

- A player may appear at most once on a given team.
- Within a team, each non-null position (SENPO, …) may be assigned to at most
  one player. Multiple NULL positions remain allowed.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "v7q8r9s0t1u2"
down_revision: Union[str, None] = "u6p7q8r9s0t1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _dedupe_player_team() -> None:
    """Keep the lowest-id row for each (player_id, team_id) pair."""
    op.execute(
        sa.text(
            """
            DELETE FROM players_x_teams a
            USING players_x_teams b
            WHERE a.player_id = b.player_id
              AND a.team_id = b.team_id
              AND a.id > b.id
            """
        )
    )


def _clear_duplicate_positions() -> None:
    """Keep the lowest-id row for each (team_id, position); null out the rest."""
    op.execute(
        sa.text(
            """
            UPDATE players_x_teams AS a
            SET position = NULL
            FROM players_x_teams AS b
            WHERE a.team_id = b.team_id
              AND a.position IS NOT NULL
              AND b.position IS NOT NULL
              AND a.position = b.position
              AND a.id > b.id
            """
        )
    )


def upgrade() -> None:
    _dedupe_player_team()
    _clear_duplicate_positions()
    op.create_unique_constraint(
        "uq_players_x_teams_player_team",
        "players_x_teams",
        ["player_id", "team_id"],
    )
    op.create_index(
        "uq_players_x_teams_team_position",
        "players_x_teams",
        ["team_id", "position"],
        unique=True,
        postgresql_where=sa.text("position IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_players_x_teams_team_position",
        table_name="players_x_teams",
    )
    op.drop_constraint(
        "uq_players_x_teams_player_team",
        "players_x_teams",
        type_="unique",
    )
