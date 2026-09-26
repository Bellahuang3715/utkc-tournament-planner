from project.database import database
from project.defaults import DEFAULT_TEAM_CATEGORIES, default_clubs_for_country, resolve_country_name
from project.models.db.team_category import TeamCategoryInsertable
from project.sql.team_categories import sql_insert_team_category
from project.utils.id_types import TournamentId, UserId


async def import_default_clubs(creator_id: UserId, country: str | None) -> None:
    """Copy the country's starter clubs into rows owned by this user."""
    resolved = resolve_country_name(country)
    clubs = default_clubs_for_country(resolved)
    if resolved is None or not clubs:
        return

    query = """
        INSERT INTO clubs (name, abbreviation, country, representative, contact_email, created, updated, creator_id)
        VALUES (:name, :abbreviation, :country, NULL, NULL, NOW(), NOW(), :creator_id)
    """
    await database.execute_many(
        query=query,
        values=[
            {
                "name": club.name,
                "abbreviation": club.abbreviation,
                "country": resolved,
                "creator_id": creator_id,
            }
            for club in clubs
        ],
    )


async def import_default_team_categories(tournament_id: TournamentId) -> None:
    """Copy the starter team categories onto a new tournament."""
    for category in DEFAULT_TEAM_CATEGORIES:
        await sql_insert_team_category(
            TeamCategoryInsertable(
                tournament_id=tournament_id,
                name=category.name,
                color=category.color,
                position=category.position,
            )
        )
