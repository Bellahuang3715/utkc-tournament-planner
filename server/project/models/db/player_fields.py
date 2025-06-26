from __future__ import annotations
from enum import auto

from project.models.db.shared import BaseModelORM
from project.utils.types import EnumAutoStr

class PlayerFieldTypes(EnumAutoStr):
    TEXT = auto()
    BOOLEAN = auto()
    NUMBER = auto()
    DROPDOWN = auto()

class FieldInsertable(BaseModelORM):
    key:      str
    label:    str
    include:  bool
    type:     PlayerFieldTypes
    options:  list[str] = []
    position: int

class SaveFieldsInsertable(BaseModelORM):
    fields: list[FieldInsertable]
