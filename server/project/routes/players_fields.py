from fastapi import APIRouter, Depends

from project.database import database
from project.schema import players_field
from project.routes.auth import firebase_user_authenticated
from project.models.db.user import UserPublic
from project.utils.id_types import TournamentId
from project.models.db.player_fields import FieldInsertable, SaveFieldsInsertable
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
        "type":          f.type.value,  # serialize enum to string value
        "options":       f.options,
        "position":      f.position,
      }
      for f in payload.fields
    ]
    if rows:
      await database.execute_many(query=players_field.insert(), values=rows)
    return SuccessResponse()


@router.get("/tournaments/{tournament_id}/player_fields",
    response_model=SaveFieldsInsertable,
    dependencies=[Depends(firebase_user_authenticated)],
)
async def get_player_fields(
    tournament_id: TournamentId,
    _: UserPublic = Depends(firebase_user_authenticated),
) -> SaveFieldsInsertable:
    # Fetch all fields for this tournament, in their saved order
    query = (
        players_field.select()
        .where(players_field.c.tournament_id == tournament_id)
        .order_by(players_field.c.position)
    )
    rows = await database.fetch_all(query=query)

    # Convert each row into your Pydantic model
    fields = [
        FieldInsertable.model_validate(dict(row))
        for row in rows
    ]
    return SaveFieldsInsertable(fields=fields)
