from project.database import database
from project.models.db.team import Team
from project.schema import teams
from project.utils.db import fetch_one_parsed_certain
from project.utils.dummy_records import DUMMY_MOCK_TIME, DUMMY_PLAYER1, DUMMY_PLAYER2, DUMMY_TEAM1
from project.utils.http import HTTPMethod
from tests.integration_tests.api.shared import (
    SUCCESS_RESPONSE,
    send_request_with_status,
    send_tournament_request,
)
from tests.integration_tests.models import AuthContext
from tests.integration_tests.sql import (
    assert_row_count_and_clear,
    inserted_player,
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
                            "category": "Mixed",
                            "category_color": "#d0ebff",
                            "category_id": cat_mix.id,
                            "club": auth_context.club.name,
                            "club_id": auth_context.club.id,
                            "club_ids": [auth_context.club.id],
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
            "player_ids": [],
        }
        response = await send_tournament_request(HTTPMethod.POST, "teams", auth_context, None, body)
        assert response["data"]["code"] == body["code"]
        await assert_row_count_and_clear(teams, 1)


async def test_create_team_rejects_duplicate_name_in_category(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with inserted_team_category(auth_context.tournament.id) as cat_mix:
        async with inserted_team(
            DUMMY_TEAM1.model_copy(
                update={
                    "tournament_id": auth_context.tournament.id,
                    "club_id": auth_context.club.id,
                    "category_id": cat_mix.id,
                    "code": "UOT A",
                }
            )
        ):
            body = {
                "code": "uot a",
                "club_id": auth_context.club.id,
                "category_id": cat_mix.id,
                "player_ids": [],
            }
            response = await send_tournament_request(
                HTTPMethod.POST, "teams", auth_context, None, body
            )
            assert response["detail"] == (
                "A team with this name already exists in this category. "
                "Team names must be unique within each category."
            )
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


def _player_body(auth_context: AuthContext, dummy: object) -> object:
    return dummy.model_copy(  # type: ignore[attr-defined]
        update={
            "tournament_id": auth_context.tournament.id,
            "club_id": auth_context.club.id,
        }
    )


async def test_create_team_dedupes_duplicate_player_ids(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with (
        inserted_team_category(auth_context.tournament.id) as cat_mix,
        inserted_player(_player_body(auth_context, DUMMY_PLAYER1)) as player,
    ):
        body = {
            "code": "DEDUP",
            "club_id": auth_context.club.id,
            "category_id": cat_mix.id,
            "player_ids": [player.id, player.id],
        }
        status, response = await send_request_with_status(
            HTTPMethod.POST,
            f"tournaments/{auth_context.tournament.id}/teams",
            json=body,
            headers=auth_context.headers,
        )
        assert status == 200, response
        assert response["data"]["code"] == "DEDUP"

        listed = await send_tournament_request(HTTPMethod.GET, "teams", auth_context, {})
        created = next(t for t in listed["data"]["teams"] if t["code"] == "DEDUP")
        assert [p["id"] for p in created["players"]] == [player.id]
        await assert_row_count_and_clear(teams, 1)


async def test_create_team_rejects_duplicate_positions(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with (
        inserted_team_category(auth_context.tournament.id) as cat_mix,
        inserted_player(_player_body(auth_context, DUMMY_PLAYER1)) as p1,
        inserted_player(_player_body(auth_context, DUMMY_PLAYER2)) as p2,
    ):
        body = {
            "code": "POS",
            "club_id": auth_context.club.id,
            "category_id": cat_mix.id,
            "player_ids": [p1.id, p2.id],
            "positions": {str(p1.id): "Senpo", str(p2.id): "Senpo"},
        }
        status, response = await send_request_with_status(
            HTTPMethod.POST,
            f"tournaments/{auth_context.tournament.id}/teams",
            json=body,
            headers=auth_context.headers,
        )
        assert status == 409, response
        assert "position" in str(response.get("detail", "")).lower()
