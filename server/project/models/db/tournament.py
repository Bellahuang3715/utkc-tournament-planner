from enum import Enum as PyEnum
from typing import Literal

from heliclockter import datetime_utc

from project.models.db.shared import BaseModelORM
from project.utils.id_types import TournamentId, UserId
from project.utils.pydantic import EmptyStrToNone

TournamentRole = Literal["organizer", "scorekeeper"]


class TournamentStatus(str, PyEnum):
    ACTIVE = "active"
    ARCHIVED = "archived"


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
    scorekeeper_token: str | None = None
    logo_path: str | None = None
    players_can_be_in_multiple_teams: bool
    auto_assign_courts: bool
    status: TournamentStatus = TournamentStatus.ACTIVE
    creator_id: UserId


class Tournament(TournamentInsertable):
    id: TournamentId
    # Computed for API responses; not a DB column.
    my_role: TournamentRole | None = None


class TournamentPublic(BaseModelORM):
    """Participant-facing tournament payload (never includes preview/scorekeeper tokens)."""

    id: TournamentId
    name: str
    organizer: str
    start_time: datetime_utc
    location: str | None = None
    description: str | None = None
    dashboard_public: bool
    dashboard_endpoint: str | None = None
    logo_path: str | None = None


class TournamentStatusBody(BaseModelORM):
    status: TournamentStatus


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


class ScorekeeperRedeemBody(BaseModelORM):
    token: str


class ScorekeeperRedeemResult(BaseModelORM):
    tournament_id: TournamentId
    name: str
    role: Literal["scorekeeper"] = "scorekeeper"

