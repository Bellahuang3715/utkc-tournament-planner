from typing import Generic, TypeVar

from pydantic import BaseModel

from project.models.db.club import Club
from project.models.db.division import Division, PlayerMatchAssignment, PlayerMatchDirectoryEntry
from project.models.db.court import Court
from project.models.db.player import Player, PlayerInDivision
from project.models.db.bracket import Bracket, BracketWithPlayers, BracketWithTeams
from project.models.db.bracket_cell import BracketCell, TeamBracketCell
from project.models.db.bracket_edit_lock import BracketEditLock
from project.models.db.team import FullTeamWithPlayers, Team, TeamInDivision
from project.models.db.team_category import TeamCategory
from project.models.db.tournament import Tournament, TournamentPublic, ScorekeeperRedeemResult
from project.models.db.user import UserPublic
from project.models.db.schedule_timetable import TournamentScheduleBody

DataT = TypeVar("DataT")


class SuccessResponse(BaseModel):
    success: bool = True


class CreatePlayerResponse(BaseModel):
    success: bool = True
    id: int


class DataResponse(BaseModel, Generic[DataT]):
    data: DataT


class ClubsResponse(DataResponse[list[Club]]):
    pass


class ClubResponse(DataResponse[Club | None]):
    pass


class TournamentResponse(DataResponse[Tournament]):
    pass


class TournamentPublicResponse(DataResponse[TournamentPublic]):
    pass


class TournamentsResponse(DataResponse[list[Tournament]]):
    pass


class DashboardPreviewTokenResponse(BaseModel):
    success: bool = True
    dashboard_preview_token: str


class ScorekeeperTokenResponse(BaseModel):
    success: bool = True
    scorekeeper_token: str | None = None


class ScorekeeperRedeemResponse(DataResponse[ScorekeeperRedeemResult]):
    pass


class DivisionsResponse(DataResponse[list[Division]]):
    pass


class PlayerMatchAssignmentsResponse(DataResponse[list[PlayerMatchAssignment]]):
    pass


class PlayerMatchDirectoryResponse(DataResponse[list[PlayerMatchDirectoryEntry]]):
    pass


class DivisionResponse(DataResponse[Division | None]):
    pass


class DivisionPlayersResponse(BaseModel):
    players: list[PlayerInDivision]


class DivisionTeamsResponse(BaseModel):
    teams: list[TeamInDivision]


class PaginatedPlayers(BaseModel):
    count: int
    players: list[Player]


class PlayersResponse(DataResponse[PaginatedPlayers]):
    pass


class SinglePlayerResponse(DataResponse[Player]):
    pass


class BracketResponse(BaseModel):
    data: Bracket


class BracketsResponse(BaseModel):
    data: list[Bracket]


class BracketsWithPlayersResponse(BaseModel):
    data: list[BracketWithPlayers]


class BracketsWithTeamsResponse(BaseModel):
    data: list[BracketWithTeams]


class DivisionLockStatus(BaseModel):
    locked: bool


class DivisionLockResponse(DataResponse[DivisionLockStatus]):
    pass


class BracketCellsResponse(BaseModel):
    data: list[BracketCell]


class TeamBracketCellsResponse(BaseModel):
    data: list[TeamBracketCell]


class BracketEditLockResponse(DataResponse[BracketEditLock]):
    pass


class BracketEditLocksResponse(DataResponse[list[BracketEditLock]]):
    pass


class PaginatedTeams(BaseModel):
    count: int
    teams: list[FullTeamWithPlayers]


class TeamsWithPlayersResponse(DataResponse[PaginatedTeams]):
    pass


class SingleTeamResponse(DataResponse[Team]):
    pass


class TeamCategoriesResponse(DataResponse[list[TeamCategory]]):
    pass


class SingleTeamCategoryResponse(DataResponse[TeamCategory]):
    pass


class UserPublicResponse(DataResponse[UserPublic]):
    pass


class CourtsResponse(DataResponse[list[Court]]):
    pass


class SingleCourtResponse(DataResponse[Court]):
    pass


class TournamentScheduleResponse(DataResponse[TournamentScheduleBody]):
    pass
