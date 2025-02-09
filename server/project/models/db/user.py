from __future__ import annotations

from typing import TYPE_CHECKING

from heliclockter import datetime_utc
from pydantic import BaseModel, constr

from project.models.db.account import UserAccountType
from project.models.db.shared import BaseModelORM
from project.utils.id_types import UserId

if TYPE_CHECKING:
    from project.logic.subscriptions import Subscription


class UserBase(BaseModelORM):
    email: str
    name: str
    created: datetime_utc
    account_type: UserAccountType

    @property
    def subscription(self) -> Subscription:
        from project.logic.subscriptions import subscription_lookup

        return subscription_lookup[self.account_type]


class UserInsertable(UserBase):
    password_hash: str | None = None


class User(UserInsertable):
    id: UserId


class UserPublic(UserBase):
    id: UserId


class UserToUpdate(BaseModel):
    email: str
    name: str


class UserPasswordToUpdate(BaseModel):
    password: constr(min_length=8, max_length=48)  # type: ignore[valid-type]


class DemoUserToRegister(BaseModelORM):
    captcha_token: str


class UserToRegister(BaseModelORM):
    email: str
    name: str
    password: str
    captcha_token: str


class UserInDB(User):
    id: UserId
    password_hash: str
