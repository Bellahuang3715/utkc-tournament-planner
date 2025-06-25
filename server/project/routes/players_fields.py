from fastapi import APIRouter, Depends

from project.database import database
from project.schema import players_field
from project.routes.auth import firebase_user_authenticated
from project.models.db.user import UserPublic
from project.utils.id_types import TournamentId
from project.models.db.player_fields import SaveFieldsInsertable
from project.routes.models import SuccessResponse

router = APIRouter()

@router.put("/tournaments/{tournament_id}/player_fields")
async def update_player_fields(
    tournament_id: TournamentId,
    payload: SaveFieldsInsertable,
    _: UserPublic = Depends(firebase_user_authenticated),
) -> SuccessResponse:
    print("Saving player fields for tournament:", tournament_id)
    # 1) wipe out old
    await database.execute(
        query=players_field.delete().where(players_field.c.tournament_id == tournament_id)
    )

    # 2) bulk insert all new in one go
    rows = [
      {
        "tournament_id": tournament_id,
        "key":           f.key,
        "label":         f.label,
        "include":       f.include,
        "type":          f.type.value.lower(),  # serialize enum to string value
        "options":       f.options or None,
        "position":      f.position,
      }
      for f in payload.fields
    ]
    if rows:
      await database.execute_many(query=players_field.insert(), values=rows)
    return SuccessResponse()
