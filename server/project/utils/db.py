import json
from databases import Database
from sqlalchemy import Table
from sqlalchemy.sql import Select

from project.config import Environment, environment
from project.utils.conversion import to_string_mapping
from project.utils.logging import logger
from project.utils.types import BaseModelT, assert_some


async def fetch_one_parsed(
    database: Database, model: type[BaseModelT], query: Select
) -> BaseModelT | None:
    record = await database.fetch_one(query)
    return model.model_validate(dict(record._mapping)) if record is not None else None


async def fetch_one_parsed_certain(
    database: Database, model: type[BaseModelT], query: Select
) -> BaseModelT:
    return assert_some(await fetch_one_parsed(database, model, query))


async def fetch_all_parsed(
    database: Database, model: type[BaseModelT], query: Select
) -> list[BaseModelT]:
    records = await database.fetch_all(query)
    return [model.model_validate(dict(record._mapping)) for record in records]


async def insert_generic(
    database: Database,
    data_model: BaseModelT,
    table: Table,
    return_type: type[BaseModelT]
) -> tuple[int, BaseModelT]:
    assert environment is not Environment.PRODUCTION, "Below code can allow SQL injection"
    try:
        mapping = to_string_mapping(data_model)
        
        # NOTE: minimal patch, this should be refactored later
        # if this model has a `data` field, re-serialize it as valid JSON
        if "data" in mapping:
            # pull the real dict off the Pydantic model
            raw = getattr(data_model, "data", None)
            if isinstance(raw, dict):
                # json.dumps => double-quoted keys/strings
                json_str = json.dumps(raw)
                # escape any single quotes in the JSON body
                mapping["data"] = json_str.replace("'", "''")


        values = ", ".join([f"'{x}'" for x in mapping.values()])
        query = (
            f"INSERT INTO {table.name} ({', '.join(mapping.keys())}) VALUES ({values}) RETURNING *"
        )
        print(f"Executing query: {query}")  # Debugging output
        last_record_id: int = await database.execute(query)
        
        raw = await database.fetch_one(table.select().where(table.c.id == last_record_id))
        if raw is None:
            raise RuntimeError("Insert succeeded but read-back failed")

        row = dict(raw._mapping)
        if "data" in row and isinstance(row["data"], str):
            row["data"] = json.loads(row["data"])

        row_inserted = return_type.model_validate(row)
        assert isinstance(row_inserted, return_type), f"Unexpected type: {row_inserted}"
        return last_record_id, row_inserted
    except Exception:
        logger.exception(f"Could not insert {type(data_model).__name__}")
        raise
