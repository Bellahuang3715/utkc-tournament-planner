from heliclockter import datetime_utc

from project.models.db.shared import BaseModelORM
from project.utils.id_types import BracketId, CourtId, DivisionId, TournamentId


class ScheduleTimeblock(BaseModelORM):
    id: int
    tournament_id: TournamentId
    court_id: CourtId | None
    start_time: datetime_utc
    duration_mins: int
    kind: str
    label: str
    division_id: DivisionId | None = None
    bracket_id: BracketId | None = None
    color: str | None = None


class ScheduleTimeblockBody(BaseModelORM):
    id: str
    court_id: CourtId | None
    start_time: datetime_utc
    duration_mins: int
    kind: str
    label: str
    division_id: DivisionId | None = None
    bracket_id: BracketId | None = None
    color: str | None = None


class ScheduleCustomBlock(BaseModelORM):
    id: int
    tournament_id: TournamentId
    label: str
    duration_mins: int


class ScheduleCustomBlockBody(BaseModelORM):
    id: str
    label: str
    duration_mins: int


class TournamentScheduleBody(BaseModelORM):
    placements: list[ScheduleTimeblockBody]
    custom_blocks: list[ScheduleCustomBlockBody]
