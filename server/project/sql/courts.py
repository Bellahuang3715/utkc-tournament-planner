from project.database import database
from project.models.db.court import Court, CourtBody
from project.utils.id_types import CourtId, TournamentId


async def get_all_courts_in_tournament(tournament_id: TournamentId) -> list[Court]:
    query = """
        SELECT *
        FROM courts
        WHERE courts.tournament_id = :tournament_id
        ORDER BY courts.display_order ASC, courts.id ASC
        """
    result = await database.fetch_all(query=query, values={"tournament_id": tournament_id})
    return [Court.model_validate(dict(x._mapping)) for x in result]


async def get_next_court_display_order(tournament_id: TournamentId) -> int:
    query = """
        SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order
        FROM courts
        WHERE tournament_id = :tournament_id
        """
    row = await database.fetch_one(query=query, values={"tournament_id": tournament_id})
    return int(row["next_order"]) if row is not None else 0


async def update_court(
    tournament_id: TournamentId, court_id: CourtId, court_body: CourtBody
) -> None:
    query = """
        UPDATE courts
        SET name = :name
        WHERE courts.tournament_id = :tournament_id
        AND courts.id = :court_id
        """
    await database.execute(
        query=query,
        values={"tournament_id": tournament_id, "court_id": court_id, "name": court_body.name},
    )


async def sql_reorder_courts(tournament_id: TournamentId, court_ids: list[CourtId]) -> None:
    async with database.transaction():
        for index, court_id in enumerate(court_ids):
            await database.execute(
                query="""
                    UPDATE courts
                    SET display_order = :display_order
                    WHERE id = :court_id
                      AND tournament_id = :tournament_id
                """,
                values={
                    "display_order": index,
                    "court_id": court_id,
                    "tournament_id": tournament_id,
                },
            )


async def sql_delete_court(tournament_id: TournamentId, court_id: CourtId) -> None:
    query = "DELETE FROM courts WHERE id = :court_id AND tournament_id = :tournament_id"
    await database.fetch_one(
        query=query, values={"court_id": court_id, "tournament_id": tournament_id}
    )


async def sql_delete_courts_of_tournament(tournament_id: TournamentId) -> None:
    query = "DELETE FROM courts WHERE tournament_id = :tournament_id"
    await database.fetch_one(query=query, values={"tournament_id": tournament_id})
