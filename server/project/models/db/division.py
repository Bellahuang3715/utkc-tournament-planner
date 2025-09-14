from enum import Enum as PyEnum
from typing import Optional

from heliclockter import datetime_utc

from project.models.db.shared import BaseModelORM
from project.utils.id_types import DivisionId, TournamentId


class DivisionType(str, PyEnum):
    INDIVIDUALS = "INDIVIDUALS"
    TEAMS = "TEAMS"


# Row shape as stored (includes server-managed timestamps)
class DivisionInsertable(BaseModelORM):
    name: str
    prefix: Optional[str] = None
    tournament_id: TournamentId
    duration_mins: int
    margin_mins: int
    division_type: DivisionType
    created: datetime_utc


class Division(DivisionInsertable):
    id: DivisionId


# Request bodies
class DivisionCreateBody(BaseModelORM):
    name: str
    prefix: Optional[str] = None
    tournament_id: TournamentId
    duration_mins: int
    margin_mins: int
    division_type: DivisionType


class DivisionUpdateBody(BaseModelORM):
    name: str
    prefix: Optional[str] = None
    duration_mins: int
    margin_mins: int
    division_type: DivisionType

class DivisionPlayersAttachBody(BaseModelORM):
    player_ids: list[int]
    bias_player_ids: list[int] | None = None
