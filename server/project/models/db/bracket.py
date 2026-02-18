# project/models/db/bracket.py
from typing import Optional, List
from project.models.db.shared import BaseModelORM
from project.utils.id_types import BracketId, DivisionId, PlayerId

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

# --- Read model (optional: with players) ---
class PlayerSlot(BaseModelORM):
    player_id: PlayerId
    bracket_idx: int

class BracketWithPlayers(Bracket):
    players: List[PlayerSlot]
