from typing import Generic, TypeVar

from pydantic import BaseModel

from project.logic.scheduling.handle_stage_activation import StageItemInputUpdate
from project.models.db.club import Club
from project.models.db.division import Division
from project.models.db.court import Court
from project.models.db.match import Match, SuggestedMatch
from project.models.db.player import Player, PlayerInDivision
from project.models.db.bracket import Bracket, BracketWithPlayers, BracketWithTeams
from project.models.db.ranking import Ranking
from project.models.db.stage_item_inputs import (
    StageItemInputOptionFinal,
    StageItemInputOptionTentative,
)
from project.models.db.team import FullTeamWithPlayers, Team, TeamInDivision
from project.models.db.tournament import Tournament
from project.models.db.user import UserPublic
from project.models.db.util import StageWithStageItems
from project.utils.id_types import StageId, StageItemId

DataT = TypeVar("DataT")


class SuccessResponse(BaseModel):
    success: bool = True


class DataResponse(BaseModel, Generic[DataT]):
    data: DataT


class ClubsResponse(DataResponse[list[Club]]):
    pass


class ClubResponse(DataResponse[Club | None]):
    pass


class TournamentResponse(DataResponse[Tournament]):
    pass


class TournamentsResponse(DataResponse[list[Tournament]]):
    pass


class DivisionsResponse(DataResponse[list[Division]]):
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


class StagesWithStageItemsResponse(DataResponse[list[StageWithStageItems]]):
    pass


class UpcomingMatchesResponse(DataResponse[list[SuggestedMatch]]):
    pass


class SingleMatchResponse(DataResponse[Match]):
    pass


class PaginatedTeams(BaseModel):
    count: int
    teams: list[FullTeamWithPlayers]


class TeamsWithPlayersResponse(DataResponse[PaginatedTeams]):
    pass


class SingleTeamResponse(DataResponse[Team]):
    pass


class UserPublicResponse(DataResponse[UserPublic]):
    pass


class CourtsResponse(DataResponse[list[Court]]):
    pass


class SingleCourtResponse(DataResponse[Court]):
    pass


class RankingsResponse(DataResponse[list[Ranking]]):
    pass


class StageItemInputOptionsResponse(
    DataResponse[dict[StageId, list[StageItemInputOptionTentative | StageItemInputOptionFinal]]]
):
    pass


class StageRankingResponse(DataResponse[dict[StageItemId, list[StageItemInputUpdate]]]):
    pass
