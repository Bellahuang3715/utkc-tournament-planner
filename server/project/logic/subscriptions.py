from __future__ import annotations

from typing import TYPE_CHECKING, Any

from fastapi import HTTPException
from heliclockter import datetime_utc
from pydantic import BaseModel

from project.models.db.account import UserAccountType
from project.models.db.tournament import TournamentBody
from project.logic.dashboard_access import new_dashboard_preview_token
from project.sql.tournaments import sql_create_tournament
from project.utils.id_types import UserId

if TYPE_CHECKING:
    from project.models.db.user import UserBase


class Subscription(BaseModel):
    max_teams: int
    max_players: int
    max_clubs: int
    max_tournaments: int
    max_courts: int


demo_subscription = Subscription(
    max_teams=8,
    max_players=16,
    max_clubs=1,
    max_tournaments=2,
    max_courts=4,
)


regular_subscription = Subscription(
    max_teams=128,
    max_players=256,
    max_clubs=32,
    max_tournaments=64,
    max_courts=32,
)

subscription_lookup = {
    UserAccountType.DEMO: demo_subscription,
    UserAccountType.REGULAR: regular_subscription,
}


def check_requirement(array: list[Any], user: UserBase, attribute: str, additions: int = 1) -> None:
    subscription = subscription_lookup[user.account_type]
    constraint: int = getattr(subscription, attribute)
    if len(array) + additions > constraint:
        raise HTTPException(
            400,
            f'Your `{user.account_type.value}` subscription allows a maximum of '
            f'{constraint} {attribute.replace("max_", "")}.',
        )


async def setup_demo_account(user_id: UserId) -> None:
    tournament = TournamentBody(
        name="Demo Tournament",
        organizer="UofT",
        start_time=datetime_utc.future(hours=1),
        dashboard_public=False,
        dashboard_endpoint="demo-tournament",
        players_can_be_in_multiple_teams=False,
        auto_assign_courts=True,
    )
    await sql_create_tournament(
        tournament,
        creator_id=user_id,
        dashboard_preview_token=new_dashboard_preview_token(),
    )
