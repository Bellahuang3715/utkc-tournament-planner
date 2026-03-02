from __future__ import annotations

# ruff: noqa: TCH001,TCH002
import json
from decimal import Decimal
from typing import Annotated

from heliclockter import datetime_utc
from pydantic import BaseModel, Field, StringConstraints, field_validator

from project.logic.ranking.statistics import START_ELO
from project.models.db.player import Player
from project.models.db.shared import BaseModelORM
from project.utils.id_types import PlayerId, TeamId, TournamentId


class TeamInsertable(BaseModelORM):
    code: str
    name: str
    club: str = ""
    category: str
    created: datetime_utc
    tournament_id: TournamentId
    active: bool
    wins: int = 0

    @field_validator("club", mode="before")
    @classmethod
    def coerce_club(cls, v: str | None) -> str:
        return v if (v is not None and v != "") else ""


class Team(TeamInsertable):
    id: TeamId


class TeamWithPlayers(BaseModel):
    id: TeamId
    code: str
    name: str
    club: str = ""
    category: str
    active: bool
    wins: int = 0
    players: list[Player] = Field(default_factory=list)

    @field_validator("club", mode="before")
    @classmethod
    def coerce_club(cls, v: str | None) -> str:
        return v if (v is not None and v != "") else ""

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
    name: str
    club: str = ""
    category: str = ""
    bias: bool = False


class TeamBody(BaseModelORM):
    code: Annotated[str, StringConstraints(min_length=1, max_length=30)]
    name: Annotated[str, StringConstraints(min_length=1, max_length=30)]
    club: Annotated[str, StringConstraints(max_length=100)] = ""
    category: Annotated[str, StringConstraints(min_length=1, max_length=30)]
    active: bool
    player_ids: list[PlayerId] = Field(default_factory=list)
    positions: dict[str, str] | None = None  # player_id (string) -> position name e.g. "Senpo"