from enum import auto

from project.utils.types import EnumAutoStr


class UserAccountType(EnumAutoStr):
    REGULAR = auto()
    ADMIN = auto()
    DEMO = auto()
