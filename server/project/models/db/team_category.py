from __future__ import annotations

from typing import Annotated

from pydantic import StringConstraints

from project.models.db.shared import BaseModelORM
from project.utils.id_types import TeamCategoryId, TournamentId


class TeamCategoryInsertable(BaseModelORM):
    tournament_id: TournamentId
    name: str
    color: str
    position: int = 0


class TeamCategory(TeamCategoryInsertable):
    id: TeamCategoryId


class TeamCategoryBody(BaseModelORM):
    name: Annotated[str, StringConstraints(min_length=1, max_length=100)]
    color: str
    position: int = 0
