from typing import cast

from project.database import database
from project.logic.ranking.statistics import TeamStatistics
from project.models.db.team import FullTeamWithPlayers, Team
from project.utils.id_types import StageItemInputId, TeamId, TournamentId
from project.utils.types import dict_without_none


async def get_teams_by_id(team_ids: set[TeamId], tournament_id: TournamentId) -> list[Team]:
    if len(team_ids) < 1:
        return []

    query = """
        SELECT
            t.id,
            t.code,
            t.club_id,
            t.category_id,
            tc.name AS category,
            tc.color AS category_color,
            t.created,
            t.updated,
            t.tournament_id,
            t.active,
            t.wins,
            c.name AS club
        FROM teams t
        LEFT JOIN clubs c ON c.id = t.club_id
        LEFT JOIN teams_category tc ON tc.id = t.category_id
        WHERE t.id = ANY(:team_ids)
        AND t.tournament_id = :tournament_id
    """
    result = await database.fetch_all(
        query=query, values={"team_ids": list(team_ids), "tournament_id": tournament_id}
    )
    return [Team.model_validate(team) for team in result]


async def get_team_by_id(team_id: TeamId, tournament_id: TournamentId) -> Team | None:
    result = await get_teams_by_id({team_id}, tournament_id)
    return result[0] if len(result) > 0 else None


async def get_latest_team_for_tournament(tournament_id: TournamentId) -> Team | None:
    """Return the most recently inserted team (by id) for the tournament."""
    query = """
        SELECT
            t.id,
            t.code,
            t.club_id,
            t.category_id,
            tc.name AS category,
            tc.color AS category_color,
            t.created,
            t.updated,
            t.tournament_id,
            t.active,
            t.wins,
            c.name AS club
        FROM teams t
        LEFT JOIN clubs c ON c.id = t.club_id
        LEFT JOIN teams_category tc ON tc.id = t.category_id
        WHERE t.tournament_id = :tournament_id
        ORDER BY t.id DESC
        LIMIT 1
    """
    row = await database.fetch_one(query=query, values={"tournament_id": tournament_id})
    return Team.model_validate(row) if row else None


async def get_teams_with_members(
    tournament_id: TournamentId,
    *,
    only_active_teams: bool = False,
    team_id: TeamId | None = None,
) -> list[FullTeamWithPlayers]:
    active_team_filter = "AND teams.active IS TRUE" if only_active_teams else ""
    team_id_filter = "AND teams.id = :team_id" if team_id is not None else ""
    query = f"""
        SELECT
            teams.id,
            teams.code,
            teams.club_id,
            teams.category_id,
            MAX(tc.name) AS category,
            MAX(tc.color) AS category_color,
            teams.created,
            teams.updated,
            teams.tournament_id,
            teams.active,
            teams.wins,
            MAX(c.name) AS club,
            to_json(array_agg(p.*)) AS players
        FROM teams
        LEFT JOIN clubs c ON c.id = teams.club_id
        LEFT JOIN teams_category tc ON tc.id = teams.category_id
        LEFT JOIN players_x_teams pt on pt.team_id = teams.id
        LEFT JOIN players p on pt.player_id = p.id
        WHERE teams.tournament_id = :tournament_id
        {active_team_filter}
        {team_id_filter}
        GROUP BY teams.id
        """
    values = dict_without_none(
        {
            "tournament_id": tournament_id,
            "team_id": team_id,
        }
    )
    result = await database.fetch_all(query=query, values=values)
    return [FullTeamWithPlayers.model_validate(x) for x in result]


async def get_team_count(
    tournament_id: TournamentId,
    *,
    only_active_teams: bool = False,
) -> int:
    active_team_filter = "AND teams.active IS TRUE" if only_active_teams else ""
    query = f"""
        SELECT count(*)
        FROM teams
        WHERE teams.tournament_id = :tournament_id
        {active_team_filter}
        """
    values = dict_without_none({"tournament_id": tournament_id})
    return cast(int, await database.fetch_val(query=query, values=values))


async def update_team_stats(
    tournament_id: TournamentId,
    stage_item_input_id: StageItemInputId,
    team_statistics: TeamStatistics,
) -> None:
    query = """
        UPDATE stage_item_inputs
        SET
            wins = :wins,
            draws = :draws,
            losses = :losses,
            points = :points
        WHERE stage_item_inputs.tournament_id = :tournament_id
        AND stage_item_inputs.id = :stage_item_input_id
        """
    await database.execute(
        query=query,
        values={
            "tournament_id": tournament_id,
            "stage_item_input_id": stage_item_input_id,
            "wins": team_statistics.wins,
            "draws": team_statistics.draws,
            "losses": team_statistics.losses,
            "points": float(team_statistics.points),
        },
    )


async def sql_delete_team(tournament_id: TournamentId, team_id: TeamId) -> None:
    query = "DELETE FROM teams WHERE id = :team_id AND tournament_id = :tournament_id"
    await database.fetch_one(
        query=query, values={"team_id": team_id, "tournament_id": tournament_id}
    )


async def sql_delete_teams_of_tournament(tournament_id: TournamentId) -> None:
    query = "DELETE FROM teams WHERE tournament_id = :tournament_id"
    await database.fetch_one(query=query, values={"tournament_id": tournament_id})
