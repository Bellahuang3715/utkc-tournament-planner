import aiofiles.os

from project.sql.courts import sql_delete_courts_of_tournament
from project.sql.players import sql_delete_players_of_tournament
from project.sql.teams import sql_delete_teams_of_tournament
from project.sql.tournaments import sql_delete_tournament, sql_get_tournament
from project.utils.id_types import TournamentId


async def get_tournament_logo_path(tournament_id: TournamentId) -> str | None:
    tournament = await sql_get_tournament(tournament_id)
    logo_path = f"static/tournament-logos/{tournament.logo_path}" if tournament.logo_path else None
    return logo_path if logo_path is not None and await aiofiles.os.path.exists(logo_path) else None


async def delete_tournament_logo(tournament_id: TournamentId) -> None:
    logo_path = await get_tournament_logo_path(tournament_id)
    if logo_path is not None:
        await aiofiles.os.remove(logo_path)


async def sql_delete_tournament_completely(tournament_id: TournamentId) -> None:
    await delete_tournament_logo(tournament_id)
    await sql_delete_players_of_tournament(tournament_id)
    await sql_delete_courts_of_tournament(tournament_id)
    await sql_delete_teams_of_tournament(tournament_id)
    await sql_delete_tournament(tournament_id)
