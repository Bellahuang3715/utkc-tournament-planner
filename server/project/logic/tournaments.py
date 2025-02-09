import aiofiles.os

from project.sql.courts import sql_delete_courts_of_tournament
from project.sql.players import sql_delete_players_of_tournament
from project.sql.rankings import get_all_rankings_in_tournament, sql_delete_ranking
from project.sql.shared import sql_delete_stage_item_matches, sql_delete_stage_item_relations
from project.sql.stage_items import sql_delete_stage_item
from project.sql.stages import get_full_tournament_details, sql_delete_stage
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
    stages = await get_full_tournament_details(tournament_id)
    await delete_tournament_logo(tournament_id)

    for stage in stages:
        for stage_item in stage.stage_items:
            await sql_delete_stage_item_matches(stage_item.id)

    for stage in stages:
        for stage_item in stage.stage_items:
            await sql_delete_stage_item_relations(stage_item.id)

    for stage in stages:
        for stage_item in stage.stage_items:
            await sql_delete_stage_item(stage_item.id)

        await sql_delete_stage(tournament_id, stage.id)

    for ranking in await get_all_rankings_in_tournament(tournament_id):
        await sql_delete_ranking(tournament_id, ranking.id)

    await sql_delete_players_of_tournament(tournament_id)
    await sql_delete_courts_of_tournament(tournament_id)
    await sql_delete_teams_of_tournament(tournament_id)
    await sql_delete_tournament(tournament_id)
