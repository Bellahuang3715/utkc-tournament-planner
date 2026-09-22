from heliclockter import datetime_utc

from project.models.db.shared import BaseModelORM
from project.utils.id_types import TournamentId, UserId
from project.utils.pydantic import EmptyStrToNone


class TournamentInsertable(BaseModelORM):
    name: str
    organizer: str
    created: datetime_utc
    start_time: datetime_utc
    location: str | None = None
    description: str | None = None
    dashboard_public: bool
    dashboard_endpoint: str | None = None
    dashboard_preview_token: str | None = None
    logo_path: str | None = None
    players_can_be_in_multiple_teams: bool
    auto_assign_courts: bool
    creator_id: UserId


class Tournament(TournamentInsertable):
    id: TournamentId


class TournamentPublic(BaseModelORM):
    """Participant-facing tournament payload (never includes preview token)."""

    id: TournamentId
    name: str
    organizer: str
    start_time: datetime_utc
    location: str | None = None
    description: str | None = None
    dashboard_public: bool
    dashboard_endpoint: str | None = None
    logo_path: str | None = None


class TournamentUpdateBody(BaseModelORM):
    name: str
    start_time: datetime_utc
    dashboard_public: bool
    dashboard_endpoint: EmptyStrToNone | str = None
    players_can_be_in_multiple_teams: bool
    auto_assign_courts: bool


class TournamentBody(TournamentUpdateBody):
    organizer: str
    location: str | None = None
    description: str | None = None
