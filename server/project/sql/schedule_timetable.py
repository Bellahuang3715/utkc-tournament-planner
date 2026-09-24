from project.database import database
from project.models.db.schedule_timetable import (
    ScheduleCustomBlock,
    ScheduleCustomBlockBody,
    ScheduleTimeblock,
    ScheduleTimeblockBody,
)
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


async def replace_schedule(
    tournament_id: TournamentId,
    placements: list[ScheduleTimeblockBody],
    custom_blocks: list[ScheduleCustomBlockBody],
) -> None:
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
