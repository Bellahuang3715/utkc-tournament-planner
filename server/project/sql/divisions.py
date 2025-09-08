from typing import Optional

from project.database import database
from project.models.db.division import (
    Division,
    DivisionCreateBody,
    DivisionUpdateBody,
)
from project.utils.id_types import DivisionId, TournamentId


async def create_division(body: DivisionCreateBody) -> Division:
    query = """
        INSERT INTO divisions (name, prefix, tournament_id, duration_mins, margin_mins, division_type, created)
        VALUES (:name, :prefix, :tournament_id, :duration_mins, :margin_mins, :division_type, NOW())
        RETURNING *
    """
    values = {
        "name": body.name,
        "prefix": body.prefix,
        "tournament_id": body.tournament_id,
        "duration_mins": body.duration_mins,
        "margin_mins": body.margin_mins,
        "division_type": body.division_type.value if hasattr(body.division_type, "value") else body.division_type,
    }
    result = await database.fetch_one(query=query, values=values)
    if result is None:
        raise ValueError("Could not create division")
    return Division.model_validate(dict(result._mapping))


async def sql_update_division(division_id: DivisionId, body: DivisionUpdateBody) -> Division | None:
    query = """
        UPDATE divisions
        SET
            name = :name,
            prefix = :prefix,
            duration_mins = :duration_mins,
            margin_mins = :margin_mins,
            division_type = :division_type
        WHERE id = :division_id
        RETURNING *
    """
    values = {
        "division_id": division_id,
        "name": body.name,
        "prefix": body.prefix,
        "duration_mins": body.duration_mins,
        "margin_mins": body.margin_mins,
        "division_type": body.division_type.value if hasattr(body.division_type, "value") else body.division_type,
    }
    result = await database.fetch_one(query=query, values=values)
    return Division.model_validate(dict(result._mapping)) if result is not None else None


async def sql_delete_division(division_id: DivisionId) -> None:
    # Cascades will remove dependent rows (brackets / players_x_divisions) per your schema
    query = "DELETE FROM divisions WHERE id = :division_id"
    await database.execute(query=query, values={"division_id": division_id})


async def get_divisions_for_tournament(
    tournament_id: TournamentId,
    q: Optional[str] = None,
) -> list[Division]:
    query = """
        SELECT *
        FROM divisions
        WHERE tournament_id = :tournament_id
          AND (
                :q IS NULL
             OR name ILIKE '%' || :q || '%'
             OR COALESCE(prefix, '') ILIKE '%' || :q || '%'
          )
        ORDER BY created DESC, id DESC
    """
    results = await database.fetch_all(query=query, values={"tournament_id": tournament_id, "q": q})
    return [Division.model_validate(dict(r._mapping)) for r in results]


async def sql_attach_players_to_division(division_id: DivisionId, player_ids: list[int]) -> None:
    if not player_ids:
        return
    query = """
        INSERT INTO players_x_divisions (player_id, division_id)
        SELECT pid, :division_id
        FROM UNNEST(:player_ids::bigint[]) AS t(pid)
        WHERE NOT EXISTS (
            SELECT 1
            FROM players_x_divisions px
            WHERE px.player_id = pid AND px.division_id = :division_id
        )
    """
    await database.execute(query=query, values={"division_id": division_id, "player_ids": player_ids})
