from project.database import database
from project.models.db.team import Team
from project.schema import teams
from project.utils.db import fetch_one_parsed_certain
from project.utils.dummy_records import DUMMY_MOCK_TIME, DUMMY_TEAM1
from project.utils.http import HTTPMethod
from tests.integration_tests.api.shared import SUCCESS_RESPONSE, send_tournament_request
from tests.integration_tests.models import AuthContext
from tests.integration_tests.sql import (
    assert_row_count_and_clear,
    inserted_team,
    inserted_team_category,
)


async def test_teams_endpoint(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with inserted_team_category(auth_context.tournament.id) as cat_mix:
        async with inserted_team(
            DUMMY_TEAM1.model_copy(
                update={
                    "tournament_id": auth_context.tournament.id,
                    "club_id": auth_context.club.id,
                    "category_id": cat_mix.id,
                }
            )
        ) as team_inserted:
            assert await send_tournament_request(HTTPMethod.GET, "teams", auth_context, {}) == {
                "data": {
                    "teams": [
                        {
                            "active": True,
                            "category": "Mixed",
                            "category_color": "#d0ebff",
                            "category_id": cat_mix.id,
                            "club": auth_context.club.name,
                            "club_id": auth_context.club.id,
                            "code": "UOT A",
                            "created": DUMMY_MOCK_TIME.isoformat().replace("+00:00", "Z"),
                            "id": team_inserted.id,
                            "players": [],
                            "tournament_id": team_inserted.tournament_id,
                            "updated": DUMMY_MOCK_TIME.isoformat().replace("+00:00", "Z"),
                            "wins": 0,
                        }
                    ],
                    "count": 1,
                },
            }


async def test_create_team(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with inserted_team_category(auth_context.tournament.id) as cat_mix:
        body = {
            "code": "NEW",
            "club_id": auth_context.club.id,
            "category_id": cat_mix.id,
            "active": True,
            "player_ids": [],
        }
        response = await send_tournament_request(HTTPMethod.POST, "teams", auth_context, None, body)
        assert response["data"]["code"] == body["code"]
        await assert_row_count_and_clear(teams, 1)


async def test_delete_team(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with inserted_team_category(auth_context.tournament.id) as cat_mix:
        async with inserted_team(
            DUMMY_TEAM1.model_copy(
                update={
                    "tournament_id": auth_context.tournament.id,
                    "club_id": auth_context.club.id,
                    "category_id": cat_mix.id,
                }
            )
        ) as team_inserted:
            assert (
                await send_tournament_request(
                    HTTPMethod.DELETE, f"teams/{team_inserted.id}", auth_context, {}
                )
                == SUCCESS_RESPONSE
            )
            await assert_row_count_and_clear(teams, 0)


async def test_update_team(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with inserted_team_category(auth_context.tournament.id) as cat_mix:
        body = {
            "code": "NEW",
            "club_id": auth_context.club.id,
            "category_id": cat_mix.id,
            "active": True,
            "player_ids": [],
        }
        async with inserted_team(
            DUMMY_TEAM1.model_copy(
                update={
                    "tournament_id": auth_context.tournament.id,
                    "club_id": auth_context.club.id,
                    "category_id": cat_mix.id,
                }
            )
        ) as team_inserted:
            response = await send_tournament_request(
                HTTPMethod.PUT, f"teams/{team_inserted.id}", auth_context, None, body
            )
            updated_team = await fetch_one_parsed_certain(
                database, Team, query=teams.select().where(teams.c.id == team_inserted.id)
            )
            assert updated_team.code == body["code"]
            assert response["data"]["code"] == body["code"]

            await assert_row_count_and_clear(teams, 1)


async def test_update_team_invalid_players(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with inserted_team_category(auth_context.tournament.id) as cat_mix:
        body = {
            "code": "NEW",
            "club_id": auth_context.club.id,
            "category_id": cat_mix.id,
            "active": True,
            "player_ids": [-1],
        }
        async with inserted_team(
            DUMMY_TEAM1.model_copy(
                update={
                    "tournament_id": auth_context.tournament.id,
                    "club_id": auth_context.club.id,
                    "category_id": cat_mix.id,
                }
            )
        ) as team_inserted:
            response = await send_tournament_request(
                HTTPMethod.PUT, f"teams/{team_inserted.id}", auth_context, None, body
            )
            assert response == {"detail": "Could not find Player(s) with ID {-1}"}
