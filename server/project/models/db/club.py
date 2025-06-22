from heliclockter import datetime_utc

from project.models.db.shared import BaseModelORM
from project.utils.id_types import ClubId


class ClubInsertable(BaseModelORM):
    name: str
    abbreviation: str
    tournament_id: int
    team_count: int = 0
    created: datetime_utc


class Club(ClubInsertable):
    id: ClubId


class ClubCreateBody(BaseModelORM):
    name: str
    abbreviation: str
    tournament_id: int
    team_count: int = 0


class ClubUpdateBody(BaseModelORM):
    name: str
    abbreviation: str
