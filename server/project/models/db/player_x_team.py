from enum import auto

from project.models.db.shared import BaseModelORM
from project.utils.id_types import PlayerId, TeamId
from project.utils.types import EnumAutoStr

class PlayerPositionTypes(EnumAutoStr):
    SENPO = auto()
    JIHOU = auto()
    CHUKEN = auto()
    FUKUSHOU = auto()
    TAISHO = auto()

class PlayerXTeamInsertable(BaseModelORM):
    player_id: PlayerId
    team_id: TeamId
    position: PlayerPositionTypes
