from decimal import Decimal
from typing import Any, Dict

from heliclockter import datetime_utc
from pydantic import Field

from project.models.db.shared import BaseModelORM
from project.utils.id_types import PlayerId, TournamentId


class PlayerInsertable(BaseModelORM):
    active: bool
    tournament_id: TournamentId
    created: datetime_utc
    elo_score: Decimal = Decimal("0.0")
    swiss_score: Decimal = Decimal("0.0")
    wins: int = 0
    draws: int = 0
    losses: int = 0
    data: Dict[str, Any]


class Player(PlayerInsertable):
    id: PlayerId

    def __hash__(self) -> int:
        return self.id


class PlayerBody(BaseModelORM):
    data: Dict[str, Any]
    active: bool


class PlayerMultiBody(BaseModelORM):
    names: str = Field(..., min_length=1)
    active: bool


class PlayerToInsert(PlayerBody):
    created: datetime_utc
    tournament_id: TournamentId
    elo_score: Decimal = Decimal("1200.0")
    swiss_score: Decimal
    wins: int = 0
    draws: int = 0
    losses: int = 0
