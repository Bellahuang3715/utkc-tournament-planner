from project.database import database
from project.models.db.club import Club, ClubCreateBody, ClubUpdateBody
from project.utils.id_types import ClubId, UserId
from project.utils.types import assert_some


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
            INSERT INTO clubs (name, abbreviation, representative, contact_email, created, updated, creator_id)
            VALUES (:name, :abbreviation, :representative, :contact_email, NOW(), NOW(), :creator_id)
            RETURNING *
        """
        values = {
            "name": club.name,
            "abbreviation": club.abbreviation,
            "representative": club.representative,
            "contact_email": club.contact_email,
            "creator_id": creator_id,
        }
        result = await database.fetch_one(query=query, values=values)
        if result is None:
            raise ValueError("Could not create club")

        club_created = Club.model_validate(dict(result._mapping))

    return club_created


# NOTE: This function needs to be updated
async def sql_update_club(club_id: ClubId, club: ClubUpdateBody) -> Club | None:
    query = """
        UPDATE clubs
        SET name = :name, abbreviation = :abbreviation
        WHERE id = :club_id
        RETURNING *
        """
    result = await database.fetch_one(query=query, values={"name": club.name, "club_id": club_id})
    return Club.model_validate(result) if result is not None else None


async def sql_delete_club(club_id: ClubId) -> None:
    query = """
        DELETE FROM clubs
        WHERE id = :club_id
        """
    await database.execute(query=query, values={"club_id": club_id})


async def get_clubs_for_user_id(user_id: UserId) -> list[Club]:
    query = """
        SELECT clubs.* FROM clubs
        WHERE clubs.creator_id = :creator_id
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
