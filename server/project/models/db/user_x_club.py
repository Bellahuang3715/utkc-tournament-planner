from enum import auto

from project.models.db.shared import BaseModelORM
from project.utils.id_types import ClubId, UserId, UserXClubId
from project.utils.types import EnumAutoStr


class UserXClubRelation(EnumAutoStr):
    OWNER = auto()
    COLLABORATOR = auto()


class UserXClubInsertable(BaseModelORM):
    user_id: UserId
    club_id: ClubId
    relation: UserXClubRelation


class UserXClub(UserXClubInsertable):
    id: UserXClubId
