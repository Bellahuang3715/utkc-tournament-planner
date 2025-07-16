from uuid import uuid4

from fastapi import APIRouter, Depends
from heliclockter import datetime_utc

from project.database import database
from project.logic.subscriptions import check_requirement
from project.models.db.team import (
    FullTeamWithPlayers,
    Team,
    TeamBody,
    TeamInsertable,
)
from project.models.db.user import UserPublic
from project.routes.auth import firebase_user_authenticated
from project.routes.models import (
    PaginatedTeams,
    SingleTeamResponse,
    SuccessResponse,
    TeamsWithPlayersResponse,
)
from project.routes.util import team_dependency, team_with_players_dependency
from project.schema import players_x_teams, teams
from project.sql.teams import (
    get_team_by_id,
    get_team_count,
    get_teams_with_members,
    sql_delete_team,
)
from project.sql.validation import check_foreign_keys_belong_to_tournament
from project.utils.db import fetch_one_parsed
from project.utils.errors import ForeignKey, check_foreign_key_violation
from project.utils.id_types import PlayerId, TeamId, TournamentId
from project.utils.types import assert_some

router = APIRouter()


async def update_team_members(
    team_id: TeamId, tournament_id: TournamentId, player_ids: set[PlayerId]
) -> None:
    [team] = await get_teams_with_members(tournament_id, team_id=team_id)

    # Add members to the team
    for player_id in player_ids:
        if player_id not in team.player_ids:
            await database.execute(
                query=players_x_teams.insert(),
                values={"team_id": team_id, "player_id": player_id},
            )

    # Remove old members from the team
    await database.execute(
        query=players_x_teams.delete().where(
            (players_x_teams.c.player_id.not_in(player_ids))  # type: ignore[attr-defined]
            & (players_x_teams.c.team_id == team_id)
        ),
    )


@router.get("/tournaments/{tournament_id}/teams", response_model=TeamsWithPlayersResponse)
async def get_teams(
    tournament_id: TournamentId,
    _: UserPublic = Depends(firebase_user_authenticated),
) -> TeamsWithPlayersResponse:
    return TeamsWithPlayersResponse(
        data=PaginatedTeams(
            teams=await get_teams_with_members(tournament_id),
            count=await get_team_count(tournament_id),
        )
    )


@router.put("/tournaments/{tournament_id}/teams/{team_id}", response_model=SingleTeamResponse)
async def update_team_by_id(
    tournament_id: TournamentId,
    team_body: TeamBody,
    _: UserPublic = Depends(firebase_user_authenticated),
    team: Team = Depends(team_dependency),
) -> SingleTeamResponse:
    await check_foreign_keys_belong_to_tournament(team_body, tournament_id)

    await database.execute(
        query=teams.update().where(
            (teams.c.id == team.id) & (teams.c.tournament_id == tournament_id)
        ),
        values=team_body.model_dump(exclude={"player_ids"}),
    )

    return SingleTeamResponse(
        data=assert_some(
            await fetch_one_parsed(
                database,
                Team,
                teams.select().where(
                    (teams.c.id == team.id) & (teams.c.tournament_id == tournament_id)
                ),
            )
        )
    )


@router.delete("/tournaments/{tournament_id}/teams/{team_id}", response_model=SuccessResponse)
async def delete_team(
    tournament_id: TournamentId,
    _: UserPublic = Depends(firebase_user_authenticated),
    team: FullTeamWithPlayers = Depends(team_with_players_dependency),
) -> SuccessResponse:
    with check_foreign_key_violation(
        {
            ForeignKey.stage_item_inputs_team_id_fkey,
            ForeignKey.matches_stage_item_input1_id_fkey,
            ForeignKey.matches_stage_item_input2_id_fkey,
        }
    ):
        await sql_delete_team(tournament_id, team.id)

    return SuccessResponse()


@router.post("/tournaments/{tournament_id}/teams", response_model=SingleTeamResponse)
async def create_team(
    team_to_insert: TeamBody,
    tournament_id: TournamentId,
    user: UserPublic = Depends(firebase_user_authenticated),
) -> SingleTeamResponse:
    await check_foreign_keys_belong_to_tournament(team_to_insert, tournament_id)

    existing_teams = await get_teams_with_members(tournament_id)
    check_requirement(existing_teams, user, "max_teams")

    last_record_id = await database.execute(
        query=teams.insert(),
        values=TeamInsertable(
            **team_to_insert.model_dump(exclude={"player_ids"}),
            created=datetime_utc.now(),
            tournament_id=tournament_id,
        ).model_dump(),
    )

    team_result = await get_team_by_id(last_record_id, tournament_id)
    assert team_result is not None
    return SingleTeamResponse(data=team_result)
