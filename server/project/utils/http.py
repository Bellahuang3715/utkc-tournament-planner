from enum import auto

from project.utils.types import EnumAutoStr


class HTTPMethod(EnumAutoStr):
    GET = auto()
    HEAD = auto()
    POST = auto()
    PUT = auto()
    DELETE = auto()
    CONNECT = auto()
    OPTIONS = auto()
    TRACE = auto()
    PATCH = auto()
