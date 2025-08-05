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
    category: str
    created: datetime_utc
    tournament_id: TournamentId
    active: bool
    wins: int = 0


class Team(TeamInsertable):
    id: TeamId


class TeamWithPlayers(BaseModel):
    id: TeamId
    players: list[Player]
    wins: int = 0
    name: str

    @property
    def player_ids(self) -> list[PlayerId]:
        return [player.id for player in self.players]

    @field_validator("players", mode="before")
    def handle_players(values: list[Player]) -> list[Player]:  # type: ignore[misc]
        if isinstance(values, str):
            values_json = json.loads(values)
            if values_json == [None]:
                return []
            return values_json

        return values


class FullTeamWithPlayers(TeamWithPlayers, Team):
    pass


class TeamBody(BaseModelORM):
    name: Annotated[str, StringConstraints(min_length=1, max_length=30)]
    active: bool
