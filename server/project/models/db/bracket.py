# project/models/db/bracket.py
import json
from pydantic import field_validator
from typing import Optional, List
from project.models.db.shared import BaseModelORM
from project.utils.id_types import BracketId, DivisionId, PlayerId, TeamId

class BracketInsertable(BaseModelORM):
    index: int
    division_id: DivisionId
    num_players: int
    title: Optional[str] = None

class Bracket(BracketInsertable):
    id: BracketId

# --- Payloads for create ---
class PlayerSlotCreate(BaseModelORM):
    player_id: PlayerId
    bracket_idx: int

class BracketWithPlayersCreate(BaseModelORM):
    index: int
    num_players: int
    title: Optional[str] = None
    players: List[PlayerSlotCreate]

class DivisionBracketsCreateBody(BaseModelORM):
    brackets: List[BracketWithPlayersCreate]


class TeamSlotCreate(BaseModelORM):
    team_id: TeamId
    bracket_idx: int


class BracketWithTeamsCreate(BaseModelORM):
    index: int
    num_players: int
    title: Optional[str] = None
    teams: List[TeamSlotCreate]


class DivisionTeamBracketsCreateBody(BaseModelORM):
    brackets: List[BracketWithTeamsCreate]


class PlayerSlot(BaseModelORM):
    player_id: PlayerId
    bracket_idx: int
    name: str | None = None
    club: str | None = None
    code: str | None = None

class BracketWithPlayers(Bracket):
    players: List[PlayerSlot]
    
    @field_validator("players", mode="before")
    @classmethod
    def parse_players(cls, v):
        if isinstance(v, str):
            return json.loads(v)
        return v

class TeamSlot(BaseModelORM):
    team_id: TeamId
    bracket_idx: int
    name: str | None = None


class BracketWithTeams(Bracket):
    teams: List[TeamSlot]

    @field_validator("teams", mode="before")
    @classmethod
    def parse_teams(cls, v):
        if isinstance(v, str):
            return json.loads(v)
        return v


class BracketTitleUpdateBody(BaseModelORM):
    title: Optional[str] = None
