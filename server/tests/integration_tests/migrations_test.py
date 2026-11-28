from uuid import uuid4

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.schema import CreateSchema

from alembic import command
from project.database import engine
from project.utils.alembic import get_alembic_config

PREVIOUS_REVISION = "u6p7q8r9s0t1"
TEAM_ROSTER_REVISION = "v7q8r9s0t1u2"


def test_team_roster_upgrade_preserves_data_and_enforces_uniqueness() -> None:
    # PostgreSQL rolls back the fixture schema and version table when this connection closes.
    with engine.connect() as connection:
        schema = f"migration_test_{uuid4().hex}"
        connection.execute(CreateSchema(schema))
        connection.execute(text(f"SET LOCAL search_path TO {schema}"))
        connection.execute(text("CREATE TYPE player_position_type AS ENUM ('SENPO', 'TAISHO')"))
        # Minimal pre-upgrade schema for the table touched by this migration.
        connection.execute(
            text(
                """
                CREATE TABLE players_x_teams (
                    id BIGSERIAL PRIMARY KEY,
                    player_id BIGINT NOT NULL,
                    team_id BIGINT NOT NULL,
                    position player_position_type
                )
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO players_x_teams (player_id, team_id, position)
                VALUES (1, 1, 'SENPO'), (1, 1, 'TAISHO'), (2, 1, 'SENPO'),
                       (3, 1, 'SENPO'), (1, 2, 'SENPO')
                """
            )
        )

        config = get_alembic_config()
        config.attributes["connection"] = connection
        command.stamp(config, PREVIOUS_REVISION)
        command.upgrade(config, TEAM_ROSTER_REVISION)

        assert connection.scalar(text("SELECT version_num FROM alembic_version")) == (
            TEAM_ROSTER_REVISION
        )
        assert connection.execute(
            text("SELECT id, player_id, team_id, position FROM players_x_teams ORDER BY id")
        ).all() == [
            (1, 1, 1, "SENPO"),
            (3, 2, 1, None),
            (4, 3, 1, None),
            (5, 1, 2, "SENPO"),
        ]

        for values, constraint in [
            ("(1, 1, NULL)", "uq_players_x_teams_player_team"),
            ("(4, 1, 'SENPO')", "uq_players_x_teams_team_position"),
        ]:
            with pytest.raises(IntegrityError, match=constraint), connection.begin_nested():
                connection.execute(
                    text(
                        f"INSERT INTO players_x_teams (player_id, team_id, position) VALUES {values}"
                    )
                )
