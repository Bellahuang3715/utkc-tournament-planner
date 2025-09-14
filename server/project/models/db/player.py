from decimal import Decimal
from typing import Optional, Any, Dict

from heliclockter import datetime_utc
from pydantic import Field

from project.models.db.shared import BaseModelORM
from project.utils.id_types import PlayerId, TournamentId


class PlayerInsertable(BaseModelORM):
    tournament_id: TournamentId
    name: str
    club: str
    code: Optional[str] = None
    created: datetime_utc
    wins: int = 0
    data: Dict[str, Any]


class Player(PlayerInsertable):
    id: PlayerId

    def __hash__(self) -> int:
        return self.id


class PlayerBody(BaseModelORM):
    name: str
    club: str
    data: Dict[str, Any]


class PlayerToInsert(PlayerBody):
    created: datetime_utc
    tournament_id: TournamentId
    wins: int = 0


class PlayerInDivision(BaseModelORM):
    name: str
    club: str
    code: str | None = None
    bias: bool = False
