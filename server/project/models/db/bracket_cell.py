from typing import Optional, List

from project.models.db.shared import BaseModelORM
from project.utils.id_types import BracketId, PlayerId


class BracketCell(BaseModelORM):
    id: int
    bracket_id: BracketId
    slot_idx: int
    player_id: Optional[PlayerId] = None
    score: str = ""
    # Enriched on read for rebuilding the Expanded players[] array
    name: Optional[str] = None
    club: Optional[str] = None
    code: Optional[str] = None


class BracketCellUpsert(BaseModelORM):
    slot_idx: int
    player_id: Optional[PlayerId] = None
    score: str = ""


class BracketCellsReplaceBody(BaseModelORM):
    cells: List[BracketCellUpsert]


class DivisionBracketCellsItem(BaseModelORM):
    bracket_id: BracketId
    cells: List[BracketCellUpsert]


class DivisionBracketCellsReplaceBody(BaseModelORM):
    """Replace filled-slot state for one or more brackets in a division."""

    brackets: List[DivisionBracketCellsItem]
