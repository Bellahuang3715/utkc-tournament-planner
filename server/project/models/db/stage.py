from typing import Literal

from heliclockter import datetime_utc

from project.models.db.shared import BaseModelORM
from project.utils.id_types import StageId, TournamentId


class StageInsertable(BaseModelORM):
    tournament_id: TournamentId
    name: str
    created: datetime_utc
    is_active: bool


class Stage(StageInsertable):
    id: StageId


class StageUpdateBody(BaseModelORM):
    name: str


class StageActivateBody(BaseModelORM):
    direction: Literal["next", "previous"] = "next"
