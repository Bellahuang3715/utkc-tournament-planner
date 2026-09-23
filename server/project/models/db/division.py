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


class DivisionPlayersDetachBody(BaseModelORM):
    player_ids: list[int]


class DivisionTeamsAttachBody(BaseModelORM):
    team_ids: list[int]
    bias_team_ids: list[int] | None = None


class DivisionTeamsDetachBody(BaseModelORM):
    team_ids: list[int]


class PlayerMatchAssignment(BaseModelORM):
    """One division/group placement for a participant (court TBD)."""

    division_id: DivisionId
    division_name: str
    bracket_id: int | None = None
    bracket_index: int | None = None
    bracket_title: str | None = None
    court_id: int | None = None


class PlayerMatchDirectoryEntry(BaseModelORM):
    """Searchable participant match row for the public /matches page."""

    player_id: int
    name: str
    code: str | None = None
    club: str | None = None
    division_id: DivisionId | None = None
    division_name: str | None = None
    bracket_id: int | None = None
    bracket_index: int | None = None
    bracket_title: str | None = None
    court_id: int | None = None
