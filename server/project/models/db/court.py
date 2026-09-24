from heliclockter import datetime_utc

from project.models.db.shared import BaseModelORM
from project.utils.id_types import CourtId, TournamentId


class CourtInsertable(BaseModelORM):
    name: str
    created: datetime_utc
    tournament_id: TournamentId
    display_order: int = 0


class Court(CourtInsertable):
    id: CourtId


class CourtBody(BaseModelORM):
    name: str


class CourtToInsert(CourtBody):
    created: datetime_utc
    tournament_id: TournamentId
    display_order: int = 0


class CourtReorderBody(BaseModelORM):
    """Full ordered list of court ids for a tournament."""

    court_ids: list[CourtId]
