from project.cronjobs.scheduling import delete_demo_accounts
from project.models.db.account import UserAccountType
from project.sql.users import get_user_by_id, update_user_account_type
from tests.integration_tests.sql import inserted_auth_context


async def test_delete_demo_accounts() -> None:
    async with inserted_auth_context() as auth_context:
        user_id = auth_context.user.id
        await update_user_account_type(user_id, UserAccountType.DEMO)

        assert await get_user_by_id(user_id) is not None
        await delete_demo_accounts()
        assert await get_user_by_id(user_id) is None
