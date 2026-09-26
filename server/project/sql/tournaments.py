from typing import Any

from fastapi import HTTPException

from project.database import database
from project.logic.default_imports import import_default_team_categories
from project.models.db.tournament import (
    Tournament,
    TournamentBody,
    TournamentStatus,
    TournamentUpdateBody,
)
from project.utils.id_types import BracketId, DivisionId, TournamentId, UserId


async def sql_get_tournament(tournament_id: TournamentId) -> Tournament:
    query = """
        SELECT *
        FROM tournaments
        WHERE id = :tournament_id
        """
    result = await database.fetch_one(query=query, values={"tournament_id": tournament_id})
    if result is None:
        raise HTTPException(status_code=404, detail="Tournament not found")

    return Tournament.model_validate(result)


async def sql_get_tournament_by_endpoint_name(
    endpoint_name: str,
    *,
    require_public: bool = False,
) -> Tournament | None:
    query = """
        SELECT *
        FROM tournaments
        WHERE dashboard_endpoint = :endpoint_name
        """
    if require_public:
        query += " AND dashboard_public IS TRUE"
    result = await database.fetch_one(query=query, values={"endpoint_name": endpoint_name})
    return Tournament.model_validate(result) if result is not None else None


async def sql_get_tournaments(
    *,
    creator_id: UserId | None = None,
    endpoint_name: str | None = None,
) -> list[Tournament]:
    query = """
        SELECT *
        FROM tournaments
        """
    params: dict[str, Any] = {}
    clauses: list[str] = []

    if creator_id is not None:
        clauses.append("creator_id = :creator_id")
        params["creator_id"] = creator_id

    if endpoint_name is not None:
        clauses.append("dashboard_endpoint = :endpoint_name")
        params["endpoint_name"] = endpoint_name

    if clauses:
        query += " WHERE " + " AND ".join(clauses)

    query += " ORDER BY name ASC, id ASC"

    result = await database.fetch_all(query=query, values=params)
    return [Tournament.model_validate(x) for x in result]


async def sql_get_tournament_id_for_division(division_id: DivisionId) -> TournamentId | None:
    query = """
        SELECT tournament_id
        FROM divisions
        WHERE id = :division_id
        """
    result = await database.fetch_one(query=query, values={"division_id": division_id})
    return TournamentId(result["tournament_id"]) if result is not None else None


async def sql_get_tournament_id_for_bracket(bracket_id: BracketId) -> TournamentId | None:
    query = """
        SELECT d.tournament_id
        FROM brackets b
        JOIN divisions d ON d.id = b.division_id
        WHERE b.id = :bracket_id
        """
    result = await database.fetch_one(query=query, values={"bracket_id": bracket_id})
    return TournamentId(result["tournament_id"]) if result is not None else None


async def sql_set_tournament_status(
    tournament_id: TournamentId, status: TournamentStatus
) -> None:
    query = """
        UPDATE tournaments
        SET status = :status
        WHERE id = :tournament_id
        """
    await database.execute(
        query=query,
        values={"tournament_id": tournament_id, "status": status.value},
    )


async def sql_delete_tournament(tournament_id: TournamentId) -> None:
    query = """
        DELETE FROM tournaments
        WHERE id = :tournament_id
        """
    await database.fetch_one(query=query, values={"tournament_id": tournament_id})


async def sql_update_tournament(
    tournament_id: TournamentId, tournament: TournamentUpdateBody
) -> None:
    query = """
        UPDATE tournaments
        SET
            start_time = :start_time,
            name = :name,
            dashboard_public = :dashboard_public,
            dashboard_endpoint = :dashboard_endpoint,
            players_can_be_in_multiple_teams = :players_can_be_in_multiple_teams,
            auto_assign_courts = :auto_assign_courts
        WHERE tournaments.id = :tournament_id
        """
    await database.execute(
        query=query,
        values={"tournament_id": tournament_id, **tournament.model_dump()},
    )


async def sql_set_dashboard_preview_token(
    tournament_id: TournamentId, preview_token: str
) -> None:
    query = """
        UPDATE tournaments
        SET dashboard_preview_token = :preview_token
        WHERE id = :tournament_id
        """
    await database.execute(
        query=query,
        values={"tournament_id": tournament_id, "preview_token": preview_token},
    )


async def sql_set_scorekeeper_token(
    tournament_id: TournamentId, token: str | None
) -> None:
    query = """
        UPDATE tournaments
        SET scorekeeper_token = :token
        WHERE id = :tournament_id
        """
    await database.execute(
        query=query,
        values={"tournament_id": tournament_id, "token": token},
    )


async def sql_get_tournament_by_scorekeeper_token(token: str) -> Tournament | None:
    query = """
        SELECT *
        FROM tournaments
        WHERE scorekeeper_token = :token
        """
    result = await database.fetch_one(query=query, values={"token": token})
    return Tournament.model_validate(result) if result is not None else None



async def sql_create_tournament(
    tournament: TournamentBody,
    *,
    creator_id: UserId,
    dashboard_preview_token: str,
) -> TournamentId:
    query = """
        INSERT INTO tournaments (
            name,
            organizer,
            start_time,
            location,
            description,
            dashboard_public,
            dashboard_endpoint,
            dashboard_preview_token,
            logo_path,
            players_can_be_in_multiple_teams,
            auto_assign_courts,
            creator_id
        )
        VALUES (
            :name,
            :organizer,
            :start_time,
            :location,
            :description,
            :dashboard_public,
            :dashboard_endpoint,
            :dashboard_preview_token,
            :logo_path,
            :players_can_be_in_multiple_teams,
            :auto_assign_courts,
            :creator_id
        )
        RETURNING id
        """
    values = {
        "name": tournament.name,
        "organizer": tournament.organizer,
        "start_time": tournament.start_time,
        "location": tournament.location,
        "description": tournament.description,
        "dashboard_public": tournament.dashboard_public,
        "dashboard_endpoint": tournament.dashboard_endpoint,
        "dashboard_preview_token": dashboard_preview_token,
        # logo is always uploaded separately; default to NULL on create
        "logo_path": None,
        "players_can_be_in_multiple_teams": tournament.players_can_be_in_multiple_teams,
        "auto_assign_courts": tournament.auto_assign_courts,
        "creator_id": creator_id,
    }
    async with database.transaction():
        new_id = await database.fetch_val(query=query, values=values)
        tournament_id = TournamentId(new_id)
        await import_default_team_categories(tournament_id)
        return tournament_id
