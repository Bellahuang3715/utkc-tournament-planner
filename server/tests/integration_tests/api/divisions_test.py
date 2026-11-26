from project.utils.dummy_records import DUMMY_PLAYER1, DUMMY_PLAYER2
from project.utils.http import HTTPMethod
from tests.integration_tests.api.shared import (
    SUCCESS_RESPONSE,
    send_auth_request,
    send_request,
    send_request_with_status,
)
from tests.integration_tests.models import AuthContext
from tests.integration_tests.sql import (
    attach_player_to_division,
    inserted_division,
    inserted_player,
)


def _player_body(auth_context: AuthContext, dummy: object) -> object:
    return dummy.model_copy(  # type: ignore[attr-defined]
        update={
            "tournament_id": auth_context.tournament.id,
            "club_id": auth_context.club.id,
        }
    )


async def test_individuals_memberships_endpoint(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with inserted_division(
        tournament_id=auth_context.tournament.id,
        name="Coded A",
        prefix="A",
    ) as division:
        async with inserted_player(_player_body(auth_context, DUMMY_PLAYER1)) as player:
            await attach_player_to_division(player.id, division.id)

            response = await send_auth_request(
                HTTPMethod.GET,
                f"tournaments/{auth_context.tournament.id}/individuals-memberships",
                auth_context,
            )
            assert "data" in response
            assert any(
                row["player_id"] == player.id
                and row["division_id"] == division.id
                and row["prefix"] == "A"
                for row in response["data"]
            )


async def test_attach_to_prefixed_division_blocked_when_already_in_other(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with (
        inserted_division(
            tournament_id=auth_context.tournament.id,
            name="Coded A",
            prefix="A",
        ) as division_a,
        inserted_division(
            tournament_id=auth_context.tournament.id,
            name="Coded B",
            prefix="B",
        ) as division_b,
        inserted_player(_player_body(auth_context, DUMMY_PLAYER1)) as player,
    ):
        await attach_player_to_division(player.id, division_a.id)

        status, response = await send_request_with_status(
            HTTPMethod.POST,
            f"divisions/{division_b.id}/players",
            json={"player_ids": [player.id]},
            headers=auth_context.headers,
        )
        assert status == 409
        assert "already in another individuals division" in str(response.get("detail", ""))


async def test_attach_to_noprefix_allowed_across_noprefix_divisions(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with (
        inserted_division(
            tournament_id=auth_context.tournament.id,
            name="Open 1",
            prefix=None,
        ) as division_1,
        inserted_division(
            tournament_id=auth_context.tournament.id,
            name="Open 2",
            prefix=None,
        ) as division_2,
        inserted_player(_player_body(auth_context, DUMMY_PLAYER1)) as player,
    ):
        await attach_player_to_division(player.id, division_1.id)

        response = await send_request(
            HTTPMethod.POST,
            f"divisions/{division_2.id}/players",
            json={"player_ids": [player.id]},
            headers=auth_context.headers,
        )
        assert response == SUCCESS_RESPONSE


async def test_attach_mix_coded_and_uncoded_blocked(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with (
        inserted_division(
            tournament_id=auth_context.tournament.id,
            name="Coded A",
            prefix="A",
        ) as coded,
        inserted_division(
            tournament_id=auth_context.tournament.id,
            name="Open 1",
            prefix=None,
        ) as open_div,
        inserted_player(_player_body(auth_context, DUMMY_PLAYER1)) as player_a,
        inserted_player(_player_body(auth_context, DUMMY_PLAYER2)) as player_b,
    ):
        await attach_player_to_division(player_a.id, coded.id)
        await attach_player_to_division(player_b.id, open_div.id)

        # Coded player cannot join no-prefix division.
        status_a, response_a = await send_request_with_status(
            HTTPMethod.POST,
            f"divisions/{open_div.id}/players",
            json={"player_ids": [player_a.id]},
            headers=auth_context.headers,
        )
        assert status_a == 409
        assert "already in another individuals division" in str(response_a.get("detail", ""))

        # No-prefix player cannot join prefixed division.
        status_b, response_b = await send_request_with_status(
            HTTPMethod.POST,
            f"divisions/{coded.id}/players",
            json={"player_ids": [player_b.id]},
            headers=auth_context.headers,
        )
        assert status_b == 409
        assert "already in another individuals division" in str(response_b.get("detail", ""))


async def test_create_division_rejects_duplicate_prefix(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with inserted_division(
        tournament_id=auth_context.tournament.id,
        name="Coded A",
        prefix="A",
    ):
        status, response = await send_request_with_status(
            HTTPMethod.POST,
            "divisions",
            json={
                "name": "Coded A2",
                "prefix": "A",
                "tournament_id": auth_context.tournament.id,
                "duration_mins": 5,
                "margin_mins": 1,
                "division_type": "INDIVIDUALS",
            },
            headers=auth_context.headers,
        )
        assert status == 409
        assert "prefix already exists" in str(response.get("detail", "")).lower()


async def test_create_division_rejects_non_letter_prefix(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    for bad in ("1", "#", "AB"):
        status, response = await send_request_with_status(
            HTTPMethod.POST,
            "divisions",
            json={
                "name": f"Bad {bad}",
                "prefix": bad,
                "tournament_id": auth_context.tournament.id,
                "duration_mins": 5,
                "margin_mins": 1,
                "division_type": "INDIVIDUALS",
            },
            headers=auth_context.headers,
        )
        assert status == 422, bad
        detail = str(response.get("detail", "")).lower()
        assert "prefix" in detail or "letter" in detail or "character" in detail, response


async def test_create_division_normalizes_prefix_to_uppercase(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    response = await send_request(
        HTTPMethod.POST,
        "divisions",
        json={
            "name": "Lower Prefix",
            "prefix": "b",
            "tournament_id": auth_context.tournament.id,
            "duration_mins": 5,
            "margin_mins": 1,
            "division_type": "INDIVIDUALS",
        },
        headers=auth_context.headers,
    )
    assert response["data"]["prefix"] == "B"


async def test_attach_same_player_twice_is_idempotent(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with (
        inserted_division(
            tournament_id=auth_context.tournament.id,
            name="Open",
            prefix=None,
        ) as division,
        inserted_player(_player_body(auth_context, DUMMY_PLAYER1)) as player,
    ):
        first = await send_request(
            HTTPMethod.POST,
            f"divisions/{division.id}/players",
            json={"player_ids": [player.id]},
            headers=auth_context.headers,
        )
        assert first == SUCCESS_RESPONSE

        second = await send_request(
            HTTPMethod.POST,
            f"divisions/{division.id}/players",
            json={"player_ids": [player.id, player.id]},
            headers=auth_context.headers,
        )
        assert second == SUCCESS_RESPONSE

        memberships = await send_auth_request(
            HTTPMethod.GET,
            f"tournaments/{auth_context.tournament.id}/individuals-memberships",
            auth_context,
        )
        rows = [
            r
            for r in memberships["data"]
            if r["player_id"] == player.id and r["division_id"] == division.id
        ]
        assert len(rows) == 1
