from fastapi import HTTPException

from project.database import database
from project.models.db.schedule_timetable import (
    ScheduleCustomBlock,
    ScheduleCustomBlockBody,
    ScheduleTimeblock,
    ScheduleTimeblockBody,
)
from project.schema import brackets, courts, divisions
from project.utils.id_types import TournamentId


async def get_schedule_placements(tournament_id: TournamentId) -> list[ScheduleTimeblock]:
    query = """
        SELECT id, tournament_id, court_id, start_time, duration_mins, kind, label, division_id, bracket_id, color
        FROM schedule_timeblocks
        WHERE tournament_id = :tournament_id
        ORDER BY start_time, id
    """
    result = await database.fetch_all(query=query, values={"tournament_id": tournament_id})
    return [ScheduleTimeblock.model_validate(dict(x._mapping)) for x in result]


async def get_schedule_custom_blocks(tournament_id: TournamentId) -> list[ScheduleCustomBlock]:
    query = """
        SELECT id, tournament_id, label, duration_mins
        FROM schedule_custom_blocks
        WHERE tournament_id = :tournament_id
        ORDER BY id DESC
    """
    result = await database.fetch_all(query=query, values={"tournament_id": tournament_id})
    return [ScheduleCustomBlock.model_validate(dict(x._mapping)) for x in result]


async def _validate_schedule_references(
    tournament_id: TournamentId, placements: list[ScheduleTimeblockBody]
) -> None:
    court_ids = {p.court_id for p in placements if p.court_id is not None}
    division_ids = {p.division_id for p in placements if p.division_id is not None}
    bracket_ids = {p.bracket_id for p in placements if p.bracket_id is not None}

    for table, ids in ((courts, court_ids), (divisions, division_ids)):
        if not ids:
            continue
        rows = await database.fetch_all(
            table.select()
            .with_only_columns(table.c.id)
            .where(table.c.id.in_(ids), table.c.tournament_id == tournament_id)
        )
        if ids != {row["id"] for row in rows}:
            resource = "court" if table is courts else "division"
            raise HTTPException(
                400, f"The schedule references a {resource} outside this tournament"
            )

    if bracket_ids:
        rows = await database.fetch_all(
            brackets.join(divisions)
            .select()
            .with_only_columns(brackets.c.id, brackets.c.division_id)
            .where(brackets.c.id.in_(bracket_ids), divisions.c.tournament_id == tournament_id)
        )
        division_by_bracket = {row["id"]: row["division_id"] for row in rows}
        if bracket_ids != division_by_bracket.keys():
            raise HTTPException(400, "The schedule references a bracket outside this tournament")
        if any(
            p.bracket_id is not None
            and p.division_id is not None
            and division_by_bracket[p.bracket_id] != p.division_id
            for p in placements
        ):
            raise HTTPException(
                400, "The schedule bracket does not belong to its selected division"
            )


async def replace_schedule(
    tournament_id: TournamentId,
    placements: list[ScheduleTimeblockBody],
    custom_blocks: list[ScheduleCustomBlockBody],
) -> None:
    async with database.transaction():
        # Serialize complete replacements for the same tournament.
        await database.fetch_val(
            "SELECT id FROM tournaments WHERE id = :tournament_id FOR NO KEY UPDATE",
            values={"tournament_id": tournament_id},
        )
        await _validate_schedule_references(tournament_id, placements)
        await database.execute(
            query="DELETE FROM schedule_timeblocks WHERE tournament_id = :tournament_id",
            values={"tournament_id": tournament_id},
        )
        await database.execute(
            query="DELETE FROM schedule_custom_blocks WHERE tournament_id = :tournament_id",
            values={"tournament_id": tournament_id},
        )

        for p in placements:
            await database.execute(
                query="""
                    INSERT INTO schedule_timeblocks
                        (tournament_id, court_id, start_time, duration_mins, kind, label, division_id, bracket_id, color)
                    VALUES
                        (:tournament_id, :court_id, :start_time, :duration_mins, :kind, :label, :division_id, :bracket_id, :color)
                """,
                values={
                    "tournament_id": tournament_id,
                    "court_id": p.court_id,
                    "start_time": p.start_time,
                    "duration_mins": p.duration_mins,
                    "kind": p.kind,
                    "label": p.label,
                    "division_id": p.division_id,
                    "bracket_id": p.bracket_id,
                    "color": p.color,
                },
            )

        for b in custom_blocks:
            await database.execute(
                query="""
                    INSERT INTO schedule_custom_blocks
                        (tournament_id, label, duration_mins)
                    VALUES
                        (:tournament_id, :label, :duration_mins)
                """,
                values={
                    "tournament_id": tournament_id,
                    "label": b.label,
                    "duration_mins": b.duration_mins,
                },
            )
