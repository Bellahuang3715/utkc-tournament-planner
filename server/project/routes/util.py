from fastapi import HTTPException
from starlette import status

from project.models.db.team import FullTeamWithPlayers, Team
from project.sql.teams import get_team_by_id, get_teams_with_members
from project.utils.id_types import TeamId, TournamentId


async def team_dependency(tournament_id: TournamentId, team_id: TeamId) -> Team:
    team = await get_team_by_id(team_id, tournament_id)

    if team is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Could not find team with id {team_id}",
        )

    return team


async def team_with_players_dependency(
    tournament_id: TournamentId, team_id: TeamId
) -> FullTeamWithPlayers:
    teams_with_members = await get_teams_with_members(tournament_id, team_id=team_id)

    if len(teams_with_members) < 1:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Could not find team with id {team_id}",
        )

    return teams_with_members[0]
