from uuid import uuid4
from zoneinfo import ZoneInfo

from heliclockter import datetime_utc, timedelta

from project.models.db.account import UserAccountType
from project.models.db.user import UserInsertable

MOCK_NOW = datetime_utc(
    year=2200, month=1, day=1, hour=0, minute=0, microsecond=0, second=0, tzinfo=ZoneInfo("UTC")
)


def generate_email() -> str:
    return f"donald_duck-{uuid4()}"


def get_mock_user() -> UserInsertable:
    return UserInsertable(
        email=generate_email(),
        name="Donald Duck",
        # hash of 'mypassword'
        password_hash="$2b$12$.LcTJuoOtwU4CfK8UgEtIu5BRmTdvZv6IH.6IvGshDCgwJsvOMLeu",
        created=datetime_utc(year=2000, month=1, day=1, tzinfo=ZoneInfo("UTC")),
        account_type=UserAccountType.REGULAR,
    )
