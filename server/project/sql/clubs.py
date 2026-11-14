from typing import NamedTuple

from project.database import database
from project.models.db.club import Club, ClubCreateBody, ClubUpdateBody
from project.utils.id_types import ClubId, UserId
from project.utils.types import assert_some


class ClubTournamentUsage(NamedTuple):
    """A tournament that still references this club via players and/or teams."""

    name: str
    player_count: int
    team_count: int


# async def sql_give_user_access_to_club(user_id: UserId, club_id: ClubId) -> None:
#     query_many_to_many = """
#         INSERT INTO users_x_clubs (club_id, user_id, relation)
#         VALUES (:club_id, :user_id, 'OWNER')
#         """
#     await database.execute(
#         query=query_many_to_many,
#         values={"club_id": assert_some(club_id), "user_id": user_id},
#     )


async def create_club(club: ClubCreateBody, creator_id: UserId) -> Club:
    async with database.transaction():
        query = """
            INSERT INTO clubs (name, abbreviation, country, representative, contact_email, created, updated, creator_id)
            VALUES (:name, :abbreviation, :country, :representative, :contact_email, NOW(), NOW(), :creator_id)
            RETURNING *
        """
        values = {
            "name": club.name,
            "abbreviation": club.abbreviation,
            "country": club.country or "Canada",
            "representative": club.representative,
            "contact_email": club.contact_email,
            "creator_id": creator_id,
        }
        result = await database.fetch_one(query=query, values=values)
        if result is None:
            raise ValueError("Could not create club")

        club_created = Club.model_validate(dict(result._mapping))

    return club_created


async def sql_get_club(club_id: ClubId) -> Club | None:
    query = """
        SELECT *
        FROM clubs
        WHERE id = :club_id
        """
    result = await database.fetch_one(query=query, values={"club_id": club_id})
    return Club.model_validate(dict(result._mapping)) if result is not None else None


async def sql_update_club(club_id: ClubId, club: ClubUpdateBody) -> Club | None:
    query = """
        UPDATE clubs
        SET name = :name,
            abbreviation = :abbreviation,
            country = :country,
            representative = :representative,
            contact_email = :contact_email,
            updated = NOW()
        WHERE id = :club_id
        RETURNING *
        """
    values = {
        "club_id": club_id,
        "name": club.name,
        "abbreviation": club.abbreviation,
        "country": club.country or "Canada",
        "representative": club.representative,
        "contact_email": club.contact_email,
    }
    result = await database.fetch_one(query=query, values=values)
    return Club.model_validate(result) if result is not None else None


async def sql_delete_club(club_id: ClubId) -> None:
    query = """
        DELETE FROM clubs
        WHERE id = :club_id
        """
    await database.execute(query=query, values={"club_id": club_id})


async def sql_get_club_tournament_usage(club_id: ClubId) -> list[ClubTournamentUsage]:
    """Tournaments that still have players or teams linked to this club."""
    query = """
        WITH player_usage AS (
            SELECT tournament_id, COUNT(*)::int AS player_count
            FROM players
            WHERE club_id = :club_id
            GROUP BY tournament_id
        ),
        team_usage AS (
            SELECT tournament_id, COUNT(DISTINCT team_id)::int AS team_count
            FROM (
                SELECT tournament_id, id AS team_id
                FROM teams
                WHERE club_id = :club_id
                UNION
                SELECT t.tournament_id, t.id
                FROM teams_x_clubs txc
                JOIN teams t ON t.id = txc.team_id
                WHERE txc.club_id = :club_id
            ) linked_teams
            GROUP BY tournament_id
        )
        SELECT
            t.name AS name,
            COALESCE(p.player_count, 0)::int AS player_count,
            COALESCE(tm.team_count, 0)::int AS team_count
        FROM tournaments t
        LEFT JOIN player_usage p ON p.tournament_id = t.id
        LEFT JOIN team_usage tm ON tm.tournament_id = t.id
        WHERE COALESCE(p.player_count, 0) > 0
           OR COALESCE(tm.team_count, 0) > 0
        ORDER BY t.name ASC, t.id ASC
        """
    rows = await database.fetch_all(query=query, values={"club_id": club_id})
    return [
        ClubTournamentUsage(
            name=str(row["name"]),
            player_count=int(row["player_count"]),
            team_count=int(row["team_count"]),
        )
        for row in rows
    ]


async def get_all_clubs() -> list[Club]:
    query = """
        SELECT clubs.* FROM clubs
        ORDER BY clubs.name ASC, clubs.id ASC
        """
    results = await database.fetch_all(query=query)
    return [Club.model_validate(dict(result._mapping)) for result in results]


async def get_clubs_for_user_id(user_id: UserId) -> list[Club]:
    """Clubs this user owns. Defaults copied at registration live here and can be edited."""
    return await get_clubs_owned_by_user_id(user_id)


async def get_clubs_owned_by_user_id(user_id: UserId) -> list[Club]:
    query = """
        SELECT clubs.* FROM clubs
        WHERE clubs.creator_id = :creator_id
        ORDER BY clubs.name ASC, clubs.id ASC
        """
    results = await database.fetch_all(query=query, values={"creator_id": user_id})
    return [Club.model_validate(dict(result._mapping)) for result in results]


async def todo_get_club_for_user_id(club_id: ClubId, user_id: UserId) -> Club | None:
    query = """
        SELECT clubs.* FROM clubs
        JOIN users_x_clubs uxc on clubs.id = uxc.club_id
        WHERE uxc.user_id = :user_id
        AND club_id = :club_id
        """
    result = await database.fetch_one(query=query, values={"user_id": user_id, "club_id": club_id})
    return Club.model_validate(dict(result._mapping)) if result is not None else None
