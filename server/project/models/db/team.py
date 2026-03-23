from __future__ import annotations

# ruff: noqa: TCH001,TCH002
import json
from typing import Annotated

from heliclockter import datetime_utc
from pydantic import BaseModel, Field, StringConstraints, field_validator

from project.models.db.player import Player
from project.models.db.shared import BaseModelORM
from project.utils.id_types import ClubId, PlayerId, TeamCategoryId, TeamId, TournamentId


class TeamInsertable(BaseModelORM):
    code: str
    club_id: ClubId | None = None
    category_id: TeamCategoryId
    created: datetime_utc
    updated: datetime_utc
    tournament_id: TournamentId
    active: bool
    wins: int = 0


class Team(TeamInsertable):
    id: TeamId
    # clubs.name via join on reads
    club: str | None = None
    # teams_category via join on reads (omit when row is raw teams insert)
    category: str | None = None
    category_color: str | None = None


class TeamWithPlayers(BaseModel):
    id: TeamId
    code: str
    club_id: ClubId | None = None
    club: str | None = None
    category_id: TeamCategoryId
    category: str | None = None
    category_color: str | None = None
    active: bool
    wins: int = 0
    players: list[Player] = Field(default_factory=list)

    @property
    def player_ids(self) -> list[PlayerId]:
        return [player.id for player in self.players]

    @field_validator("players", mode="before")
    @classmethod
    def handle_players(cls, values: list[Player] | str) -> list[Player]:  # type: ignore[misc]
        if isinstance(values, str):
            values_json = json.loads(values)
            if values_json == [None]:
                return []
            return values_json

        return values


class FullTeamWithPlayers(TeamWithPlayers, Team):
    pass


class TeamInDivision(BaseModelORM):
    id: TeamId
    code: str
    club: str = ""
    category: str = ""
    category_color: str = ""
    bias: bool = False


class TeamBody(BaseModelORM):
    code: Annotated[str, StringConstraints(min_length=1, max_length=30)]
    club_id: ClubId | None = None
    category_id: TeamCategoryId
    active: bool
    player_ids: list[PlayerId] = Field(default_factory=list)
    positions: dict[str, str] | None = None  # player_id (string) -> position name e.g. "Senpo"
