from project.database import database
from project.sql.stage_items import sql_delete_stage_item
from project.utils.id_types import StageItemId


async def sql_delete_stage_item_matches(stage_item_id: StageItemId) -> None:
    from project.sql.matches import sql_delete_matches_for_stage_item_id

    async with database.transaction():
        await sql_delete_matches_for_stage_item_id(stage_item_id)


async def sql_delete_stage_item_relations(stage_item_id: StageItemId) -> None:
    from project.sql.rounds import sql_delete_rounds_for_stage_item_id
    from project.sql.stage_item_inputs import sql_delete_stage_item_inputs

    async with database.transaction():
        await sql_delete_rounds_for_stage_item_id(stage_item_id)
        await sql_delete_stage_item_inputs(stage_item_id)


async def sql_delete_stage_item_with_foreign_keys(stage_item_id: StageItemId) -> None:
    from project.sql.matches import sql_delete_matches_for_stage_item_id
    from project.sql.rounds import sql_delete_rounds_for_stage_item_id
    from project.sql.stage_item_inputs import sql_delete_stage_item_inputs

    async with database.transaction():
        await sql_delete_matches_for_stage_item_id(stage_item_id)
        await sql_delete_stage_item_inputs(stage_item_id)
        await sql_delete_rounds_for_stage_item_id(stage_item_id)
        await sql_delete_stage_item(stage_item_id)
