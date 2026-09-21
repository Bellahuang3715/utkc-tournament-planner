"""Read-only participant dashboard APIs (no auth; publish / preview gated)."""

from fastapi import APIRouter, HTTPException
from starlette import status

from project.logic.dashboard_access import can_access_participant_dashboard
from project.models.db.schedule_timetable import TournamentScheduleBody
from project.models.db.tournament import Tournament
from project.routes.models import (
    BracketCellsResponse,
    BracketsResponse,
    BracketsWithPlayersResponse,
    BracketsWithTeamsResponse,
    CourtsResponse,
    DivisionPlayersResponse,
    DivisionTeamsResponse,
    DivisionsResponse,
    PaginatedPlayers,
    PlayersResponse,
    TournamentScheduleResponse,
)
from project.sql.bracket_cells import sql_list_division_bracket_cells
from project.sql.brackets import (
    sql_list_division_brackets,
    sql_list_division_brackets_with_players,
    sql_list_division_brackets_with_teams,
)
from project.sql.courts import get_all_courts_in_tournament
from project.sql.divisions import (
    get_divisions_for_tournament,
    sql_get_division,
    sql_get_divisions_for_player,
    sql_get_players_for_division,
    sql_get_teams_for_division,
)
from project.sql.players import get_all_players_in_tournament, get_player_count
from project.sql.schedule_timetable import get_schedule_custom_blocks, get_schedule_placements
from project.sql.tournaments import sql_get_tournament_by_endpoint_name
from project.utils.id_types import DivisionId, PlayerId

router = APIRouter()

forbidden_dashboard_exception = HTTPException(
    status_code=status.HTTP_403_FORBIDDEN,
    detail="This participant site is not published",
)


async def _resolve_public_tournament(endpoint_name: str, preview: str | None) -> Tournament:
    tournament = await sql_get_tournament_by_endpoint_name(endpoint_name)
    if tournament is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tournament not found")
    if not can_access_participant_dashboard(tournament, preview_token=preview):
        raise forbidden_dashboard_exception
    return tournament


async def _resolve_division_in_tournament(
    endpoint_name: str, division_id: DivisionId, preview: str | None
) -> tuple[Tournament, object]:
    tournament = await _resolve_public_tournament(endpoint_name, preview)
    division = await sql_get_division(division_id)
    if division is None or division.tournament_id != tournament.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Division not found")
    return tournament, division


@router.get("/public/tournaments/{endpoint_name}/players", response_model=PlayersResponse)
async def public_list_players(
    endpoint_name: str,
    preview: str | None = None,
) -> PlayersResponse:
    tournament = await _resolve_public_tournament(endpoint_name, preview)
    return PlayersResponse(
        data=PaginatedPlayers(
            players=await get_all_players_in_tournament(tournament.id),
            count=await get_player_count(tournament.id),
        )
    )


@router.get("/public/tournaments/{endpoint_name}/courts", response_model=CourtsResponse)
async def public_list_courts(
    endpoint_name: str,
    preview: str | None = None,
) -> CourtsResponse:
    tournament = await _resolve_public_tournament(endpoint_name, preview)
    return CourtsResponse(data=await get_all_courts_in_tournament(tournament.id))


@router.get("/public/tournaments/{endpoint_name}/divisions", response_model=DivisionsResponse)
async def public_list_divisions(
    endpoint_name: str,
    preview: str | None = None,
) -> DivisionsResponse:
    tournament = await _resolve_public_tournament(endpoint_name, preview)
    return DivisionsResponse(data=await get_divisions_for_tournament(tournament.id))


@router.get(
    "/public/tournaments/{endpoint_name}/schedule_timetable",
    response_model=TournamentScheduleResponse,
)
async def public_get_schedule_timetable(
    endpoint_name: str,
    preview: str | None = None,
) -> TournamentScheduleResponse:
    tournament = await _resolve_public_tournament(endpoint_name, preview)
    placements = await get_schedule_placements(tournament.id)
    custom_blocks = await get_schedule_custom_blocks(tournament.id)
    return TournamentScheduleResponse(
        data=TournamentScheduleBody(
            placements=[
                {
                    "id": str(p.id),
                    "court_id": p.court_id,
                    "start_time": p.start_time,
                    "duration_mins": p.duration_mins,
                    "kind": p.kind,
                    "label": p.label,
                    "division_id": p.division_id,
                    "bracket_id": p.bracket_id,
                }
                for p in placements
            ],
            custom_blocks=[
                {
                    "id": str(b.id),
                    "label": b.label,
                    "duration_mins": b.duration_mins,
                }
                for b in custom_blocks
            ],
        )
    )


@router.get(
    "/public/tournaments/{endpoint_name}/players/{player_id}/divisions",
    response_model=DivisionsResponse,
)
async def public_player_divisions(
    endpoint_name: str,
    player_id: PlayerId,
    preview: str | None = None,
) -> DivisionsResponse:
    tournament = await _resolve_public_tournament(endpoint_name, preview)
    items = await sql_get_divisions_for_player(tournament.id, player_id)
    return DivisionsResponse(data=items)


@router.get(
    "/public/tournaments/{endpoint_name}/divisions/{division_id}/players",
    response_model=DivisionPlayersResponse,
)
async def public_division_players(
    endpoint_name: str,
    division_id: DivisionId,
    preview: str | None = None,
) -> DivisionPlayersResponse:
    await _resolve_division_in_tournament(endpoint_name, division_id, preview)
    return DivisionPlayersResponse(players=await sql_get_players_for_division(division_id))


@router.get(
    "/public/tournaments/{endpoint_name}/divisions/{division_id}/teams",
    response_model=DivisionTeamsResponse,
)
async def public_division_teams(
    endpoint_name: str,
    division_id: DivisionId,
    preview: str | None = None,
) -> DivisionTeamsResponse:
    await _resolve_division_in_tournament(endpoint_name, division_id, preview)
    return DivisionTeamsResponse(teams=await sql_get_teams_for_division(division_id))


@router.get(
    "/public/tournaments/{endpoint_name}/divisions/{division_id}/brackets",
    response_model=BracketsResponse,
)
async def public_division_brackets(
    endpoint_name: str,
    division_id: DivisionId,
    preview: str | None = None,
) -> BracketsResponse:
    await _resolve_division_in_tournament(endpoint_name, division_id, preview)
    return BracketsResponse(data=await sql_list_division_brackets(division_id))


@router.get(
    "/public/tournaments/{endpoint_name}/divisions/{division_id}/brackets/with-players",
    response_model=BracketsWithPlayersResponse,
)
async def public_division_brackets_with_players(
    endpoint_name: str,
    division_id: DivisionId,
    preview: str | None = None,
) -> BracketsWithPlayersResponse:
    await _resolve_division_in_tournament(endpoint_name, division_id, preview)
    return BracketsWithPlayersResponse(
        data=await sql_list_division_brackets_with_players(division_id)
    )


@router.get(
    "/public/tournaments/{endpoint_name}/divisions/{division_id}/brackets/with-teams",
    response_model=BracketsWithTeamsResponse,
)
async def public_division_brackets_with_teams(
    endpoint_name: str,
    division_id: DivisionId,
    preview: str | None = None,
) -> BracketsWithTeamsResponse:
    await _resolve_division_in_tournament(endpoint_name, division_id, preview)
    return BracketsWithTeamsResponse(data=await sql_list_division_brackets_with_teams(division_id))


@router.get(
    "/public/tournaments/{endpoint_name}/divisions/{division_id}/bracket-cells",
    response_model=BracketCellsResponse,
)
async def public_division_bracket_cells(
    endpoint_name: str,
    division_id: DivisionId,
    preview: str | None = None,
) -> BracketCellsResponse:
    await _resolve_division_in_tournament(endpoint_name, division_id, preview)
    return BracketCellsResponse(data=await sql_list_division_bracket_cells(division_id))
