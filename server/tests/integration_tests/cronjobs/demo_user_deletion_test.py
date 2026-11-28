from uuid import uuid4

from heliclockter import datetime_utc

from project.cronjobs.scheduling import delete_demo_accounts
from project.models.db.account import UserAccountType
from project.sql.users import get_user_by_id
from project.utils.dummy_records import DUMMY_TOURNAMENT
from tests.integration_tests.mocks import get_mock_user
from tests.integration_tests.sql import inserted_tournament, inserted_user


async def test_delete_demo_accounts() -> None:
    expired = get_mock_user().model_copy(update={"account_type": UserAccountType.DEMO})
    current = get_mock_user().model_copy(
        update={"account_type": UserAccountType.DEMO, "created": datetime_utc.now()}
    )
    async with inserted_user(expired) as old_user, inserted_user(current) as new_user:
        async with inserted_tournament(
            DUMMY_TOURNAMENT.model_copy(
                update={
                    "creator_id": old_user.id,
                    "dashboard_endpoint": f"expired-demo-{uuid4()}",
                    "dashboard_preview_token": None,
                }
            )
        ):
            await delete_demo_accounts()
        assert await get_user_by_id(old_user.id) is None
        assert await get_user_by_id(new_user.id) is not None
