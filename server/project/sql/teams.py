from typing import cast

from project.database import database
from project.models.db.team import FullTeamWithPlayers, Team
from project.utils.id_types import TeamId, TournamentId
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
            t.wins,
            COALESCE(
                (
                    SELECT string_agg(clubs.name, ', ' ORDER BY clubs.name)
                    FROM teams_x_clubs txc
                    JOIN clubs ON clubs.id = txc.club_id
                    WHERE txc.team_id = t.id
                ),
                c.name
            ) AS club
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
            t.wins,
            COALESCE(
                (
                    SELECT string_agg(clubs.name, ', ' ORDER BY clubs.name)
                    FROM teams_x_clubs txc
                    JOIN clubs ON clubs.id = txc.club_id
                    WHERE txc.team_id = t.id
                ),
                c.name
            ) AS club
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
    team_id: TeamId | None = None,
) -> list[FullTeamWithPlayers]:
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
            teams.wins,
            COALESCE(
                (
                    SELECT string_agg(clubs.name, ', ' ORDER BY clubs.name)
                    FROM teams_x_clubs txc
                    JOIN clubs ON clubs.id = txc.club_id
                    WHERE txc.team_id = teams.id
                ),
                MAX(c.name)
            ) AS club,
            COALESCE(
                (
                    SELECT array_agg(txc.club_id ORDER BY txc.club_id)
                    FROM teams_x_clubs txc
                    WHERE txc.team_id = teams.id
                ),
                CASE
                    WHEN teams.club_id IS NULL THEN ARRAY[]::bigint[]
                    ELSE ARRAY[teams.club_id]
                END
            ) AS club_ids,
            to_json(array_agg(p.*)) AS players
        FROM teams
        LEFT JOIN clubs c ON c.id = teams.club_id
        LEFT JOIN teams_category tc ON tc.id = teams.category_id
        LEFT JOIN players_x_teams pt on pt.team_id = teams.id
        LEFT JOIN players p on pt.player_id = p.id
        WHERE teams.tournament_id = :tournament_id
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


async def get_team_count(tournament_id: TournamentId) -> int:
    query = """
        SELECT count(*)
        FROM teams
        WHERE teams.tournament_id = :tournament_id
        """
    values = dict_without_none({"tournament_id": tournament_id})
    return cast(int, await database.fetch_val(query=query, values=values))


async def sql_delete_team(tournament_id: TournamentId, team_id: TeamId) -> None:
    query = "DELETE FROM teams WHERE id = :team_id AND tournament_id = :tournament_id"
    await database.fetch_one(
        query=query, values={"team_id": team_id, "tournament_id": tournament_id}
    )


async def sql_delete_teams_of_tournament(tournament_id: TournamentId) -> None:
    query = "DELETE FROM teams WHERE tournament_id = :tournament_id"
    await database.fetch_one(query=query, values={"tournament_id": tournament_id})
