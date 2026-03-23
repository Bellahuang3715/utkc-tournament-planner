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

    @field_validator("players", mode="before")
    @classmethod
    def ensure_players_list(cls, v):
        if v is None:
            return []
        if isinstance(v, list):
            # Coerce each item to a dict and drop non-dicts (e.g. null)
            out = []
            for i, x in enumerate(v):
                if isinstance(x, dict):
                    # Coerce player_id and bracket_idx to int for validation
                    slot = dict(x)
                    if "player_id" in slot and slot["player_id"] is not None:
                        try:
                            slot["player_id"] = int(slot["player_id"])
                        except (TypeError, ValueError):
                            continue
                    if "bracket_idx" in slot and slot["bracket_idx"] is not None:
                        try:
                            slot["bracket_idx"] = int(slot["bracket_idx"])
                        except (TypeError, ValueError):
                            slot["bracket_idx"] = i
                    out.append(slot)
            return out
        return v

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
    participant_number: str | None = None  # from players.data.participant_number

class BracketWithPlayers(Bracket):
    players: List[PlayerSlot]
    
    @field_validator("players", mode="before")
    @classmethod
    def parse_players(cls, v):
        if isinstance(v, str):
            v = json.loads(v)
        if isinstance(v, list):
            # Filter out null/invalid slots (e.g. from JSONB_AGG when player was deleted)
            v = [x for x in v if isinstance(x, dict)]
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
