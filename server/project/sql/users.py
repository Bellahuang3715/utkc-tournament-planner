from project.database import database
from project.logic.tournaments import sql_delete_tournament_completely
from project.models.db.account import UserAccountType
from project.models.db.user import User, UserInDB, UserInsertable, UserPublic, UserToUpdate
from project.schema import users
from project.sql.clubs import get_clubs_owned_by_user_id, sql_delete_club
from project.sql.tournaments import sql_get_tournaments
from project.utils.db import fetch_one_parsed
from project.utils.id_types import UserId
from project.utils.types import assert_some


async def update_user(user_id: UserId, user: UserToUpdate) -> None:
    query = """
        UPDATE users
        SET name = :name,
            email = :email,
            phone = :phone,
            organization = :organization,
            title = :title,
            city = :city,
            country = :country,
            bio = :bio
        WHERE id = :user_id
        """
    await database.execute(
        query=query,
        values={
            "user_id": user_id,
            "name": user.name,
            "email": user.email,
            "phone": user.phone,
            "organization": user.organization,
            "title": user.title,
            "city": user.city,
            "country": user.country,
            "bio": user.bio,
        },
    )


async def update_user_account_type(user_id: UserId, account_type: UserAccountType) -> None:
    query = """
        UPDATE users
        SET account_type = :account_type
        WHERE id = :user_id
        """
    await database.execute(
        query=query, values={"user_id": user_id, "account_type": account_type.value}
    )


async def update_user_password(user_id: UserId, password_hash: str) -> None:
    query = """
        UPDATE users
        SET password_hash = :password_hash
        WHERE id = :user_id
        """
    await database.execute(query=query, values={"user_id": user_id, "password_hash": password_hash})


async def get_user_by_id(user_id: UserId) -> UserPublic | None:
    query = """
        SELECT *
        FROM users
        WHERE id = :user_id
        """
    result = await database.fetch_one(query=query, values={"user_id": user_id})
    return UserPublic.model_validate(dict(result._mapping)) if result is not None else None


async def get_expired_demo_users() -> list[UserPublic]:
    query = """
        SELECT *
        FROM users
        WHERE account_type='DEMO'
        AND created <= NOW() - INTERVAL '30 minutes'
        """
    result = await database.fetch_all(query=query)
    return [UserPublic.model_validate(demo_user) for demo_user in result]


async def create_user(user: UserInsertable) -> User:
    query = """
        INSERT INTO users (email, name, password_hash, created, account_type, country)
        VALUES (:email, :name, :password_hash, :created, :account_type, :country)
        RETURNING *
        """
    result = await database.fetch_one(
        query=query,
        values={
            "password_hash": user.password_hash,
            "name": user.name,
            "email": user.email,
            "created": user.created,
            "account_type": user.account_type.value,
            "country": user.country,
        },
    )
    return User.model_validate(dict(assert_some(result)._mapping))


async def delete_user(user_id: UserId) -> None:
    query = """
        DELETE FROM users
        WHERE id = :user_id
        """
    await database.fetch_one(query=query, values={"user_id": user_id})


async def check_whether_email_is_in_use(email: str) -> bool:
    query = """
        SELECT id
        FROM users
        WHERE email = :email
        """
    result = await database.fetch_one(query=query, values={"email": email})
    return result is not None


async def get_user(email: str) -> UserInDB | None:
    return await fetch_one_parsed(database, UserInDB, users.select().where(users.c.email == email))


async def delete_user_and_owned_clubs(user_id: UserId) -> None:
    for tournament in await sql_get_tournaments(creator_id=user_id):
        await sql_delete_tournament_completely(tournament.id)

    for club in await get_clubs_owned_by_user_id(user_id):
        await sql_delete_club(club.id)

    await delete_user(user_id)
