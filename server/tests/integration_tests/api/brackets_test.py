from contextlib import AsyncExitStack

from project.models.db.division import DivisionType
from project.utils.dummy_records import (
    DUMMY_PLAYER1,
    DUMMY_PLAYER2,
    DUMMY_PLAYER3,
    DUMMY_PLAYER4,
    DUMMY_PLAYER5,
    DUMMY_PLAYER6,
    DUMMY_TEAM1,
    DUMMY_TEAM2,
    DUMMY_TEAM3,
    DUMMY_TEAM4,
)
from project.utils.http import HTTPMethod
from tests.integration_tests.api.shared import (
    SUCCESS_RESPONSE,
    send_request,
    send_request_with_status,
)
from tests.integration_tests.models import AuthContext
from tests.integration_tests.sql import (
    attach_player_to_division,
    inserted_division,
    inserted_player,
    inserted_team,
    inserted_team_category,
)


def _player(auth_context: AuthContext, dummy: object) -> object:
    return dummy.model_copy(  # type: ignore[attr-defined]
        update={
            "tournament_id": auth_context.tournament.id,
            "club_id": auth_context.club.id,
        }
    )


def _five_player_bracket_body(player_ids: list[int]) -> dict:
    assert len(player_ids) == 5
    return {
        "brackets": [
            {
                "index": 1,
                "num_players": 5,
                "title": "Group 1",
                "players": [
                    {"player_id": pid, "bracket_idx": i} for i, pid in enumerate(player_ids)
                ],
            }
        ]
    }


async def test_create_brackets_rejects_under_min_size(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with inserted_division(
        tournament_id=auth_context.tournament.id,
        name="Tiny Div",
        prefix=None,
    ) as division:
        async with inserted_player(_player(auth_context, DUMMY_PLAYER1)) as p1:
            status, response = await send_request_with_status(
                HTTPMethod.POST,
                f"divisions/{division.id}/brackets",
                json={
                    "brackets": [
                        {
                            "index": 1,
                            "num_players": 4,
                            "players": [{"player_id": p1.id, "bracket_idx": i} for i in range(4)],
                        }
                    ]
                },
                headers=auth_context.headers,
            )
            assert status == 400
            assert "at least 5" in str(response.get("detail", "")).lower()


async def test_create_brackets_valid_size(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    dummies = [
        DUMMY_PLAYER1,
        DUMMY_PLAYER2,
        DUMMY_PLAYER3,
        DUMMY_PLAYER4,
        DUMMY_PLAYER5,
    ]
    async with inserted_division(
        tournament_id=auth_context.tournament.id,
        name="Valid Div",
        prefix=None,
    ) as division:
        players = []
        # Nested context managers for 5 players
        async with inserted_player(_player(auth_context, dummies[0])) as p0:
            async with inserted_player(_player(auth_context, dummies[1])) as p1:
                async with inserted_player(_player(auth_context, dummies[2])) as p2:
                    async with inserted_player(_player(auth_context, dummies[3])) as p3:
                        async with inserted_player(_player(auth_context, dummies[4])) as p4:
                            players = [p0, p1, p2, p3, p4]
                            for p in players:
                                await attach_player_to_division(p.id, division.id)

                            response = await send_request(
                                HTTPMethod.POST,
                                f"divisions/{division.id}/brackets",
                                json=_five_player_bracket_body([p.id for p in players]),
                                headers=auth_context.headers,
                            )
                            assert "data" in response
                            assert len(response["data"]) == 1
                            assert response["data"][0]["num_players"] == 5


async def test_division_locks_after_score_and_blocks_attach(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    dummies = [
        DUMMY_PLAYER1,
        DUMMY_PLAYER2,
        DUMMY_PLAYER3,
        DUMMY_PLAYER4,
        DUMMY_PLAYER5,
    ]
    async with inserted_division(
        tournament_id=auth_context.tournament.id,
        name="Lock Div",
        prefix=None,
    ) as division:
        async with inserted_player(_player(auth_context, dummies[0])) as p0:
            async with inserted_player(_player(auth_context, dummies[1])) as p1:
                async with inserted_player(_player(auth_context, dummies[2])) as p2:
                    async with inserted_player(_player(auth_context, dummies[3])) as p3:
                        async with inserted_player(_player(auth_context, dummies[4])) as p4:
                            async with inserted_player(
                                _player(auth_context, DUMMY_PLAYER6)
                            ) as extra:
                                players = [p0, p1, p2, p3, p4]
                                for p in players:
                                    await attach_player_to_division(p.id, division.id)

                                create_res = await send_request(
                                    HTTPMethod.POST,
                                    f"divisions/{division.id}/brackets",
                                    json=_five_player_bracket_body([p.id for p in players]),
                                    headers=auth_context.headers,
                                )
                                bracket_id = create_res["data"][0]["id"]

                                # Enter a score → locks the division.
                                score_res = await send_request(
                                    HTTPMethod.PUT,
                                    f"divisions/{division.id}/bracket-cells",
                                    json={
                                        "brackets": [
                                            {
                                                "bracket_id": bracket_id,
                                                "cells": [
                                                    {
                                                        "slot_idx": 0,
                                                        "player_id": p0.id,
                                                        "score": "3",
                                                    }
                                                ],
                                            }
                                        ]
                                    },
                                    headers=auth_context.headers,
                                )
                                assert score_res == SUCCESS_RESPONSE

                                lock_res = await send_request(
                                    HTTPMethod.GET,
                                    f"divisions/{division.id}/lock",
                                    headers=auth_context.headers,
                                )
                                assert lock_res["data"]["locked"] is True

                                status, response = await send_request_with_status(
                                    HTTPMethod.POST,
                                    f"divisions/{division.id}/players",
                                    json={"player_ids": [extra.id]},
                                    headers=auth_context.headers,
                                )
                                assert status == 409
                                assert (
                                    "scorekeeping has started"
                                    in str(response.get("detail", "")).lower()
                                )

                                # Regenerating brackets while locked is also blocked.
                                regen_status, regen_body = await send_request_with_status(
                                    HTTPMethod.POST,
                                    f"divisions/{division.id}/brackets?replace=true",
                                    json=_five_player_bracket_body([p.id for p in players]),
                                    headers=auth_context.headers,
                                )
                                assert regen_status == 409
                                assert (
                                    "scorekeeping has started"
                                    in str(regen_body.get("detail", "")).lower()
                                )

                                # Clear scores → unlock; attach and regenerate work again.
                                clear_res = await send_request(
                                    HTTPMethod.DELETE,
                                    f"divisions/{division.id}/bracket-cells",
                                    headers=auth_context.headers,
                                )
                                assert clear_res == SUCCESS_RESPONSE

                                unlocked = await send_request(
                                    HTTPMethod.GET,
                                    f"divisions/{division.id}/lock",
                                    headers=auth_context.headers,
                                )
                                assert unlocked["data"]["locked"] is False

                                attach_ok = await send_request(
                                    HTTPMethod.POST,
                                    f"divisions/{division.id}/players",
                                    json={"player_ids": [extra.id]},
                                    headers=auth_context.headers,
                                )
                                assert attach_ok == SUCCESS_RESPONSE

                                regen_ok = await send_request(
                                    HTTPMethod.POST,
                                    f"divisions/{division.id}/brackets?replace=true",
                                    json=_five_player_bracket_body([p.id for p in players]),
                                    headers=auth_context.headers,
                                )
                                assert len(regen_ok["data"]) == 1


async def test_prefixed_brackets_include_player_codes(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    dummies = [
        DUMMY_PLAYER1,
        DUMMY_PLAYER2,
        DUMMY_PLAYER3,
        DUMMY_PLAYER4,
        DUMMY_PLAYER5,
    ]
    async with inserted_division(
        tournament_id=auth_context.tournament.id,
        name="Coded Div",
        prefix="A",
    ) as division:
        async with inserted_player(_player(auth_context, dummies[0])) as p0:
            async with inserted_player(_player(auth_context, dummies[1])) as p1:
                async with inserted_player(_player(auth_context, dummies[2])) as p2:
                    async with inserted_player(_player(auth_context, dummies[3])) as p3:
                        async with inserted_player(_player(auth_context, dummies[4])) as p4:
                            players = [p0, p1, p2, p3, p4]
                            for p in players:
                                await attach_player_to_division(p.id, division.id)

                            codes_body = {
                                "codes": [
                                    {"player_id": p.id, "code": f"A{i + 1:02d}"}
                                    for i, p in enumerate(players)
                                ]
                            }
                            code_res = await send_request(
                                HTTPMethod.PUT,
                                f"tournaments/{auth_context.tournament.id}/players/codes",
                                json=codes_body,
                                headers=auth_context.headers,
                            )
                            assert code_res == SUCCESS_RESPONSE

                            await send_request(
                                HTTPMethod.POST,
                                f"divisions/{division.id}/brackets",
                                json=_five_player_bracket_body([p.id for p in players]),
                                headers=auth_context.headers,
                            )
                            with_players = await send_request(
                                HTTPMethod.GET,
                                f"divisions/{division.id}/brackets/with-players",
                                headers=auth_context.headers,
                            )
                            codes = {
                                slot["code"]
                                for bracket in with_players["data"]
                                for slot in bracket["players"]
                                if slot.get("code")
                            }
                            assert codes == {"A01", "A02", "A03", "A04", "A05"}


async def test_team_bracket_seeding_advances_and_clear(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with (
        inserted_division(
            tournament_id=auth_context.tournament.id,
            name="Team Div",
            prefix=None,
            division_type=DivisionType.TEAMS,
        ) as division,
        inserted_team_category(auth_context.tournament.id) as category,
        AsyncExitStack() as stack,
    ):
        teams = []
        for index, dummy in enumerate(
            [DUMMY_TEAM1, DUMMY_TEAM2, DUMMY_TEAM3, DUMMY_TEAM4, DUMMY_TEAM1], start=1
        ):
            team = await stack.enter_async_context(
                inserted_team(
                    dummy.model_copy(
                        update={
                            "tournament_id": auth_context.tournament.id,
                            "club_id": auth_context.club.id,
                            "category_id": category.id,
                            "code": f"T{index}",
                        }
                    )
                )
            )
            teams.append(team)

        division_path = f"divisions/{division.id}"
        attach = await send_request(
            HTTPMethod.POST,
            f"{division_path}/teams",
            json={"team_ids": [team.id for team in teams]},
            headers=auth_context.headers,
        )
        assert attach == SUCCESS_RESPONSE

        slots = [{"team_id": team.id, "bracket_idx": i} for i, team in enumerate(teams)]
        bracket = {"index": 1, "num_players": len(slots), "title": "Group 1", "teams": slots}
        response = await send_request(
            HTTPMethod.POST,
            f"{division_path}/brackets/teams",
            json={"brackets": [bracket]},
            headers=auth_context.headers,
        )
        assert len(response["data"]) == 1
        assert response["data"][0]["num_players"] == 5
        bracket_id = response["data"][0]["id"]

        status, error = await send_request_with_status(
            HTTPMethod.POST,
            f"{division_path}/brackets/teams?replace=true",
            json={"brackets": [{**bracket, "num_players": 4, "teams": slots[:4]}]},
            headers=auth_context.headers,
        )
        assert status == 400
        assert "at least 5" in str(error["detail"]).lower()

        seeded = await send_request(
            HTTPMethod.GET, f"{division_path}/brackets/with-teams", headers=auth_context.headers
        )
        assert [(team["team_id"], team["bracket_idx"]) for team in seeded["data"][0]["teams"]] == [
            (team.id, i) for i, team in enumerate(teams)
        ]

        bracket_cells = f"brackets/{bracket_id}/team-cells"
        division_cells = f"{division_path}/team-bracket-cells"
        advance = {"slot_idx": 5, "team_id": teams[0].id}
        assert (
            await send_request(
                HTTPMethod.PUT,
                bracket_cells,
                headers=auth_context.headers,
                json={"cells": [advance]},
            )
            == SUCCESS_RESPONSE
        )
        saved = await send_request(HTTPMethod.GET, bracket_cells, headers=auth_context.headers)
        assert len(saved["data"]) == 1
        assert saved["data"][0]["slot_idx"] == 5
        assert saved["data"][0]["team_id"] == teams[0].id
        assert (
            await send_request(HTTPMethod.GET, division_cells, headers=auth_context.headers)
            == saved
        )

        advance = {"slot_idx": 5, "team_id": teams[1].id}
        assert (
            await send_request(
                HTTPMethod.PUT,
                division_cells,
                headers=auth_context.headers,
                json={"brackets": [{"bracket_id": bracket_id, "cells": [advance]}]},
            )
            == SUCCESS_RESPONSE
        )
        public = await send_request(
            HTTPMethod.GET,
            f"public/tournaments/{auth_context.tournament.dashboard_endpoint}/{division_cells}",
        )
        assert len(public["data"]) == 1
        assert public["data"][0]["team_id"] == teams[1].id

        lock = await send_request(
            HTTPMethod.GET, f"{division_path}/lock", headers=auth_context.headers
        )
        assert lock["data"]["locked"] is True
        assert (
            await send_request(HTTPMethod.DELETE, division_cells, headers=auth_context.headers)
            == SUCCESS_RESPONSE
        )
        assert await send_request(HTTPMethod.GET, bracket_cells, headers=auth_context.headers) == {
            "data": []
        }
        unlocked = await send_request(
            HTTPMethod.GET, f"{division_path}/lock", headers=auth_context.headers
        )
        assert unlocked["data"]["locked"] is False
