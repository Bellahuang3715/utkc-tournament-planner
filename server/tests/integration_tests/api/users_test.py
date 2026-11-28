from unittest.mock import patch
from uuid import uuid4

from project.models.db.account import UserAccountType
from project.sql.tournaments import sql_get_tournaments
from project.sql.users import delete_user_and_owned_clubs, get_user
from project.utils.http import HTTPMethod
from tests.integration_tests.api.shared import SUCCESS_RESPONSE, send_request_with_status
from tests.integration_tests.mocks import get_mock_user
from tests.integration_tests.sql import inserted_user


async def test_google_registration_creates_one_firebase_linked_profile(
    startup_and_shutdown_uvicorn_server: None,
) -> None:
    email = f"google-{uuid4()}@example.org"
    headers = {"Authorization": f"Bearer test:{email}"}
    try:
        status, error = await send_request_with_status(HTTPMethod.GET, "users/me", headers=headers)
        assert (status, error) == (401, {"detail": "User not found"})

        for _ in range(2):
            assert await send_request_with_status(
                HTTPMethod.POST,
                "users/register_google",
                headers=headers,
                json={"country": "Canada"},
            ) == (200, SUCCESS_RESPONSE)
        status, profile = await send_request_with_status(
            HTTPMethod.GET, "users/me", headers=headers
        )
        assert status == 200
        assert profile["data"]["email"] == email
        assert profile["data"]["name"] == email.split("@")[0]
        assert profile["data"]["country"] == "Canada"
        assert profile["data"]["account_type"] == UserAccountType.REGULAR.value
        assert "password_hash" not in profile["data"]
    finally:
        user = await get_user(email)
        if user is not None:
            await delete_user_and_owned_clubs(user.id)


async def test_update_own_profile_and_reject_update_by_another_user(
    startup_and_shutdown_uvicorn_server: None,
) -> None:
    async with inserted_user(get_mock_user()) as user, inserted_user(get_mock_user()) as other:
        endpoint = f"users/{user.id}"
        profile = {"name": "New name", "email": user.email, "country": "Canada", "city": "Toronto"}
        assert (
            await send_request_with_status(
                HTTPMethod.PUT,
                endpoint,
                headers={"Authorization": f"Bearer test:{other.email}"},
                json=profile,
            )
        )[0] == 401

        headers = {"Authorization": f"Bearer test:{user.email}"}
        status, updated = await send_request_with_status(
            HTTPMethod.PUT, endpoint, headers=headers, json=profile
        )
        assert status == 200
        for key, value in profile.items():
            assert updated["data"][key] == value
        assert await send_request_with_status(HTTPMethod.GET, endpoint, headers=headers) == (
            200,
            updated,
        )
        assert await send_request_with_status(HTTPMethod.GET, "users/me", headers=headers) == (
            200,
            updated,
        )


async def test_register_password_account_returns_success_and_creates_profile(
    startup_and_shutdown_uvicorn_server: None,
) -> None:
    email = f"registration-{uuid4()}@example.org"
    body = {
        "name": "New organizer",
        "email": email,
        "password": "my test pass",
        "captcha_token": "test captcha",
        "country": "Canada",
    }
    try:
        assert await send_request_with_status(HTTPMethod.POST, "users/register", json=body) == (
            200,
            SUCCESS_RESPONSE,
        )
        status, profile = await send_request_with_status(
            HTTPMethod.GET, "users/me", headers={"Authorization": f"Bearer test:{email}"}
        )
        assert status == 200
        assert profile["data"]["name"] == body["name"]
        assert profile["data"]["email"] == email
        assert "password_hash" not in profile["data"]
    finally:
        user = await get_user(email)
        if user is not None:
            await delete_user_and_owned_clubs(user.id)


async def test_register_demo_user_creates_demo_tournament(
    startup_and_shutdown_uvicorn_server: None,
) -> None:
    account_id = uuid4()
    email = f"demo-{account_id}@example.org"
    try:
        with patch("project.routes.users.uuid4", return_value=account_id):
            assert await send_request_with_status(
                HTTPMethod.POST, "users/register_demo", json={"captcha_token": "test captcha"}
            ) == (200, SUCCESS_RESPONSE)
        user = await get_user(email)
        assert user is not None
        assert user.account_type is UserAccountType.DEMO
        tournaments = await sql_get_tournaments(creator_id=user.id)
        assert [tournament.name for tournament in tournaments] == ["Demo Tournament"]
    finally:
        user = await get_user(email)
        if user is not None:
            await delete_user_and_owned_clubs(user.id)
