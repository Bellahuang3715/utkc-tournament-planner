from heliclockter import datetime_utc

from project.models.db.shared import BaseModelORM
from project.utils.id_types import BracketId


class BracketEditLock(BaseModelORM):
    bracket_id: BracketId
    holder_session_id: str
    holder_name: str
    updated_at: datetime_utc


class BracketEditLockClaimBody(BaseModelORM):
    holder_name: str
    session_id: str


class BracketEditLockReleaseBody(BaseModelORM):
    session_id: str
