from heliclockter import datetime_utc
from pydantic import Field

from project.models.db.shared import BaseModelORM
from project.utils.id_types import TournamentId
from project.utils.pydantic import EmptyStrToNone


class TournamentInsertable(BaseModelORM):
    name: str
    organizer: str
    created: datetime_utc
    start_time: datetime_utc
    duration_minutes: int = Field(..., ge=1)
    margin_minutes: int = Field(..., ge=0)
    dashboard_public: bool
    dashboard_endpoint: str | None = None
    logo_path: str | None = None
    players_can_be_in_multiple_teams: bool
    auto_assign_courts: bool


class Tournament(TournamentInsertable):
    id: TournamentId


class TournamentUpdateBody(BaseModelORM):
    name: str
    start_time: datetime_utc
    dashboard_public: bool
    dashboard_endpoint: EmptyStrToNone | str = None
    players_can_be_in_multiple_teams: bool
    auto_assign_courts: bool
    duration_minutes: int = Field(..., ge=1)
    margin_minutes: int = Field(..., ge=0)


class TournamentBody(TournamentUpdateBody):
    organizer: str
