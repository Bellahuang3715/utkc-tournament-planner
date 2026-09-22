from fastapi import APIRouter, Depends

from project.models.db.schedule_timetable import TournamentScheduleBody
from project.models.db.user import UserPublic
from project.routes.auth import firebase_user_authenticated
from project.routes.authorization import require_tournament_owner
from project.routes.models import TournamentScheduleResponse
from project.sql.schedule_timetable import (
    get_schedule_custom_blocks,
    get_schedule_placements,
    replace_schedule,
)
from project.utils.id_types import TournamentId

router = APIRouter(dependencies=[Depends(require_tournament_owner)])


@router.get("/tournaments/{tournament_id}/schedule_timetable", response_model=TournamentScheduleResponse)
async def get_schedule_timetable(
    tournament_id: TournamentId,
    _: UserPublic = Depends(firebase_user_authenticated),
) -> TournamentScheduleResponse:
    placements = await get_schedule_placements(tournament_id)
    custom_blocks = await get_schedule_custom_blocks(tournament_id)
    return TournamentScheduleResponse(
        data=TournamentScheduleBody(
            placements=[
                {
                    "id": str(p.id),
                    "court_id": p.court_id,
                    "start_time": p.start_time,
                    "duration_mins": p.duration_mins,
                    "kind": p.kind,
                    "label": p.label,
                    "division_id": p.division_id,
                    "bracket_id": p.bracket_id,
                }
                for p in placements
            ],
            custom_blocks=[
                {
                    "id": str(b.id),
                    "label": b.label,
                    "duration_mins": b.duration_mins,
                }
                for b in custom_blocks
            ],
        )
    )


@router.put("/tournaments/{tournament_id}/schedule_timetable", response_model=TournamentScheduleResponse)
async def put_schedule_timetable(
    tournament_id: TournamentId,
    body: TournamentScheduleBody,
    _: UserPublic = Depends(firebase_user_authenticated),
) -> TournamentScheduleResponse:
    await replace_schedule(
        tournament_id=tournament_id,
        placements=body.placements,
        custom_blocks=body.custom_blocks,
    )
    placements = await get_schedule_placements(tournament_id)
    custom_blocks = await get_schedule_custom_blocks(tournament_id)
    return TournamentScheduleResponse(
        data=TournamentScheduleBody(
            placements=[
                {
                    "id": str(p.id),
                    "court_id": p.court_id,
                    "start_time": p.start_time,
                    "duration_mins": p.duration_mins,
                    "kind": p.kind,
                    "label": p.label,
                    "division_id": p.division_id,
                    "bracket_id": p.bracket_id,
                }
                for p in placements
            ],
            custom_blocks=[
                {
                    "id": str(b.id),
                    "label": b.label,
                    "duration_mins": b.duration_mins,
                }
                for b in custom_blocks
            ],
        )
    )
