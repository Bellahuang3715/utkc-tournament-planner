from heliclockter import datetime_utc
from typing import Optional

from project.models.db.shared import BaseModelORM
from project.utils.id_types import UserId, ClubId


class ClubInsertable(BaseModelORM):
    name: str
    abbreviation: str
    representative: Optional[str] = None
    contact_email: Optional[str] = None
    created: datetime_utc
    updated: datetime_utc
    creator_id: UserId


class Club(ClubInsertable):
    id: ClubId


class ClubCreateBody(BaseModelORM):
    name: str
    abbreviation: str
    representative: Optional[str] = None
    contact_email: Optional[str] = None


class ClubUpdateBody(BaseModelORM):
    name: str
    abbreviation: str
    updated: datetime_utc
