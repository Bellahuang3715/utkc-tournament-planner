from typing import Optional, List

from pydantic import Field

from project.models.db.shared import BaseModelORM
from project.utils.id_types import BracketId, PlayerId, TeamId


# ---- Player cells (scores + advances) ----


class PlayerBracketCell(BaseModelORM):
    id: int
    bracket_id: BracketId
    slot_idx: int
    player_id: Optional[PlayerId] = None
    score: str = ""
    # Enriched on read for rebuilding Expanded players[]
    name: Optional[str] = None
    club: Optional[str] = None
    code: Optional[str] = None


class PlayerBracketCellUpsert(BaseModelORM):
    slot_idx: int
    player_id: Optional[PlayerId] = None
    score: str = Field(default="", max_length=8)


class PlayerBracketCellsReplaceBody(BaseModelORM):
    cells: List[PlayerBracketCellUpsert]


class DivisionPlayerBracketCellsItem(BaseModelORM):
    bracket_id: BracketId
    cells: List[PlayerBracketCellUpsert]


class DivisionPlayerBracketCellsReplaceBody(BaseModelORM):
    """Replace filled-slot state for one or more player brackets in a division."""

    brackets: List[DivisionPlayerBracketCellsItem]


# ---- Team cells (advances only; no per-slot score) ----


class TeamBracketCell(BaseModelORM):
    id: int
    bracket_id: BracketId
    slot_idx: int
    team_id: Optional[TeamId] = None
    # Enriched on read for rebuilding Expanded teams[]
    code: Optional[str] = None
    name: Optional[str] = None
    club: Optional[str] = None


class TeamBracketCellUpsert(BaseModelORM):
    slot_idx: int
    team_id: Optional[TeamId] = None


class TeamBracketCellsReplaceBody(BaseModelORM):
    cells: List[TeamBracketCellUpsert]


class DivisionTeamBracketCellsItem(BaseModelORM):
    bracket_id: BracketId
    cells: List[TeamBracketCellUpsert]


class DivisionTeamBracketCellsReplaceBody(BaseModelORM):
    """Replace filled-slot state for one or more team brackets in a division."""

    brackets: List[DivisionTeamBracketCellsItem]


# Backwards-compatible aliases (player cells were originally named BracketCell).
BracketCell = PlayerBracketCell
BracketCellUpsert = PlayerBracketCellUpsert
BracketCellsReplaceBody = PlayerBracketCellsReplaceBody
DivisionBracketCellsItem = DivisionPlayerBracketCellsItem
DivisionBracketCellsReplaceBody = DivisionPlayerBracketCellsReplaceBody
