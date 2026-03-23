from project.database import database
from project.models.db.team_category import TeamCategory, TeamCategoryInsertable
from project.utils.id_types import TeamCategoryId, TournamentId


async def sql_list_team_categories(tournament_id: TournamentId) -> list[TeamCategory]:
    query = """
        SELECT id, tournament_id, name, color, position
        FROM teams_category
        WHERE tournament_id = :tournament_id
        ORDER BY position ASC, id ASC
    """
    rows = await database.fetch_all(query, {"tournament_id": tournament_id})
    return [TeamCategory.model_validate(dict(r._mapping)) for r in rows]


async def sql_get_team_category_by_id(
    tournament_id: TournamentId, category_id: TeamCategoryId
) -> TeamCategory | None:
    query = """
        SELECT id, tournament_id, name, color, position
        FROM teams_category
        WHERE id = :id AND tournament_id = :tournament_id
    """
    row = await database.fetch_one(query, {"id": category_id, "tournament_id": tournament_id})
    return TeamCategory.model_validate(dict(row._mapping)) if row else None


async def sql_count_teams_using_category(
    tournament_id: TournamentId, category_id: TeamCategoryId
) -> int:
    query = """
        SELECT count(*) FROM teams
        WHERE tournament_id = :tournament_id AND category_id = :category_id
    """
    return int(
        await database.fetch_val(
            query, {"tournament_id": tournament_id, "category_id": category_id}
        )
    )


async def sql_next_team_category_position(tournament_id: TournamentId) -> int:
    query = """
        SELECT COALESCE(MAX(position), -1) + 1 FROM teams_category
        WHERE tournament_id = :tournament_id
    """
    return int(await database.fetch_val(query, {"tournament_id": tournament_id}))


async def sql_insert_team_category(row: TeamCategoryInsertable) -> TeamCategory:
    query = """
        INSERT INTO teams_category (tournament_id, name, color, position)
        VALUES (:tournament_id, :name, :color, :position)
        RETURNING id, tournament_id, name, color, position
    """
    r = await database.fetch_one(query, row.model_dump())
    assert r is not None
    return TeamCategory.model_validate(dict(r._mapping))


async def sql_update_team_category(
    tournament_id: TournamentId,
    category_id: TeamCategoryId,
    *,
    name: str,
    color: str,
    position: int,
) -> None:
    query = """
        UPDATE teams_category
        SET name = :name, color = :color, position = :position
        WHERE id = :id AND tournament_id = :tournament_id
    """
    await database.execute(
        query,
        {
            "id": category_id,
            "tournament_id": tournament_id,
            "name": name,
            "color": color,
            "position": position,
        },
    )


async def sql_delete_team_category(tournament_id: TournamentId, category_id: TeamCategoryId) -> None:
    query = """
        DELETE FROM teams_category
        WHERE id = :id AND tournament_id = :tournament_id
    """
    await database.execute(query, {"id": category_id, "tournament_id": tournament_id})
