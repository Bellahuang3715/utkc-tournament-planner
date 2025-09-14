from typing import Optional

from project.database import database
from project.models.db.division import (
    Division,
    DivisionCreateBody,
    DivisionUpdateBody,
)
from project.utils.id_types import DivisionId, TournamentId
from project.models.db.player import PlayerInDivision

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
) -> list[Division]:
    query = """
        SELECT *
        FROM divisions
        WHERE tournament_id = :tournament_id
        ORDER BY created DESC, id DESC
    """
    results = await database.fetch_all(query=query, values={"tournament_id": tournament_id})
    return [Division.model_validate(dict(r._mapping)) for r in results]


async def sql_get_players_for_division(division_id: DivisionId) -> list[PlayerInDivision]:
    query = """
        SELECT
            p.name,
            p.club,
            p.code,
            COALESCE(px.bias, FALSE) AS bias
        FROM players p
        JOIN players_x_divisions px ON px.player_id = p.id
        WHERE px.division_id = :division_id
        ORDER BY p.name, p.id
    """
    rows = await database.fetch_all(query, {"division_id": division_id})
    return [PlayerInDivision.model_validate(dict(r._mapping)) for r in rows]


async def sql_attach_players_to_division(division_id: DivisionId, player_ids: list[int], bias_player_ids: list[int] | None = None) -> None:
    if not player_ids:
        return
    insert_q = """
        INSERT INTO players_x_divisions (player_id, division_id)
        SELECT pid, :division_id
        FROM UNNEST(CAST(:player_ids AS BIGINT[])) AS t(pid)
        ON CONFLICT (player_id, division_id) DO NOTHING
    """
    await database.execute(query=insert_q, values={"division_id": division_id, "player_ids": player_ids})
    
    if bias_player_ids:
        update_q = """
            UPDATE players_x_divisions
            SET bias = TRUE
            WHERE division_id = :division_id
              AND player_id = ANY(CAST(:bias_player_ids AS BIGINT[]))
        """
        await database.execute(
            query=update_q,
            values={"division_id": division_id, "bias_player_ids": bias_player_ids},
        )
