from typing import List, Optional

from fastapi import HTTPException
from starlette import status

from project.database import database
from project.models.db.bracket_cell import (
    PlayerBracketCell,
    PlayerBracketCellUpsert,
    DivisionPlayerBracketCellsItem,
    TeamBracketCell,
    TeamBracketCellUpsert,
    DivisionTeamBracketCellsItem,
)
from project.utils.id_types import BracketId, DivisionId

DIVISION_LOCKED_DETAIL = (
    "Scorekeeping has started for this division. "
    "Unlock from Scores by clearing all recorded scores before changing roster or seeding."
)

_PLAYER_CELL_SELECT = """
        SELECT
          bc.id,
          bc.bracket_id,
          bc.slot_idx,
          bc.player_id,
          bc.score,
          p.name,
          c.name AS club,
          p.code
        FROM player_bracket_cells bc
        LEFT JOIN players p ON p.id = bc.player_id
        LEFT JOIN clubs c ON c.id = p.club_id
"""

_TEAM_CELL_SELECT = """
        SELECT
          bc.id,
          bc.bracket_id,
          bc.slot_idx,
          bc.team_id,
          t.code,
          t.code AS name,
          COALESCE(
            (
              SELECT string_agg(clubs.name, ', ' ORDER BY clubs.name)
              FROM teams_x_clubs txc
              JOIN clubs ON clubs.id = txc.club_id
              WHERE txc.team_id = t.id
            ),
            c.name
          ) AS club
        FROM team_bracket_cells bc
        LEFT JOIN teams t ON t.id = bc.team_id
        LEFT JOIN clubs c ON c.id = t.club_id
"""


# ---- Player cells ----


async def sql_list_bracket_cells(bracket_id: BracketId) -> List[PlayerBracketCell]:
    rows = await database.fetch_all(
        _PLAYER_CELL_SELECT
        + """
        WHERE bc.bracket_id = :bracket_id
        ORDER BY bc.slot_idx
        """,
        {"bracket_id": bracket_id},
    )
    return [PlayerBracketCell.model_validate(dict(r._mapping)) for r in rows]


async def sql_list_division_bracket_cells(division_id: DivisionId) -> List[PlayerBracketCell]:
    rows = await database.fetch_all(
        _PLAYER_CELL_SELECT
        + """
        INNER JOIN brackets b ON b.id = bc.bracket_id
        WHERE b.division_id = :division_id
        ORDER BY b."index", bc.slot_idx
        """,
        {"division_id": division_id},
    )
    return [PlayerBracketCell.model_validate(dict(r._mapping)) for r in rows]


async def sql_replace_bracket_cells(
    bracket_id: BracketId,
    cells: List[PlayerBracketCellUpsert],
) -> None:
    async with database.transaction():
        await database.execute(
            "DELETE FROM player_bracket_cells WHERE bracket_id = :bracket_id",
            {"bracket_id": bracket_id},
        )
        if not cells:
            return

        slot_idxs = [int(c.slot_idx) for c in cells]
        player_ids: List[Optional[int]] = [
            int(c.player_id) if c.player_id is not None else None for c in cells
        ]
        scores = [str(c.score or "") for c in cells]
        bracket_ids = [int(bracket_id)] * len(cells)

        await database.execute(
            """
            INSERT INTO player_bracket_cells (bracket_id, slot_idx, player_id, score)
            SELECT * FROM UNNEST(
                (:bracket_ids)::bigint[],
                (:slot_idxs)::int[],
                (:player_ids)::bigint[],
                (:scores)::text[]
            )
            """,
            {
                "bracket_ids": bracket_ids,
                "slot_idxs": slot_idxs,
                "player_ids": player_ids,
                "scores": scores,
            },
        )


async def sql_replace_division_bracket_cells(
    division_id: DivisionId,
    items: List[DivisionPlayerBracketCellsItem],
) -> None:
    if not items:
        return

    async with database.transaction():
        for item in items:
            row = await database.fetch_one(
                """
                SELECT id FROM brackets
                WHERE id = :bracket_id AND division_id = :division_id
                """,
                {"bracket_id": item.bracket_id, "division_id": division_id},
            )
            if row is None:
                continue
            await database.execute(
                "DELETE FROM player_bracket_cells WHERE bracket_id = :bracket_id",
                {"bracket_id": item.bracket_id},
            )
            if not item.cells:
                continue

            slot_idxs = [int(c.slot_idx) for c in item.cells]
            player_ids: List[Optional[int]] = [
                int(c.player_id) if c.player_id is not None else None for c in item.cells
            ]
            scores = [str(c.score or "") for c in item.cells]
            bracket_ids = [int(item.bracket_id)] * len(item.cells)

            await database.execute(
                """
                INSERT INTO player_bracket_cells (bracket_id, slot_idx, player_id, score)
                SELECT * FROM UNNEST(
                    (:bracket_ids)::bigint[],
                    (:slot_idxs)::int[],
                    (:player_ids)::bigint[],
                    (:scores)::text[]
                )
                """,
                {
                    "bracket_ids": bracket_ids,
                    "slot_idxs": slot_idxs,
                    "player_ids": player_ids,
                    "scores": scores,
                },
            )


async def sql_clear_division_player_bracket_cells(division_id: DivisionId) -> None:
    await database.execute(
        """
        DELETE FROM player_bracket_cells
        WHERE bracket_id IN (
          SELECT id FROM brackets WHERE division_id = :division_id
        )
        """,
        {"division_id": division_id},
    )


# ---- Team cells ----


async def sql_list_team_bracket_cells(bracket_id: BracketId) -> List[TeamBracketCell]:
    rows = await database.fetch_all(
        _TEAM_CELL_SELECT
        + """
        WHERE bc.bracket_id = :bracket_id
        ORDER BY bc.slot_idx
        """,
        {"bracket_id": bracket_id},
    )
    return [TeamBracketCell.model_validate(dict(r._mapping)) for r in rows]


async def sql_list_division_team_bracket_cells(
    division_id: DivisionId,
) -> List[TeamBracketCell]:
    rows = await database.fetch_all(
        _TEAM_CELL_SELECT
        + """
        INNER JOIN brackets b ON b.id = bc.bracket_id
        WHERE b.division_id = :division_id
        ORDER BY b."index", bc.slot_idx
        """,
        {"division_id": division_id},
    )
    return [TeamBracketCell.model_validate(dict(r._mapping)) for r in rows]


async def sql_replace_team_bracket_cells(
    bracket_id: BracketId,
    cells: List[TeamBracketCellUpsert],
) -> None:
    async with database.transaction():
        await database.execute(
            "DELETE FROM team_bracket_cells WHERE bracket_id = :bracket_id",
            {"bracket_id": bracket_id},
        )
        if not cells:
            return

        slot_idxs = [int(c.slot_idx) for c in cells]
        team_ids: List[Optional[int]] = [
            int(c.team_id) if c.team_id is not None else None for c in cells
        ]
        bracket_ids = [int(bracket_id)] * len(cells)

        await database.execute(
            """
            INSERT INTO team_bracket_cells (bracket_id, slot_idx, team_id)
            SELECT * FROM UNNEST(
                (:bracket_ids)::bigint[],
                (:slot_idxs)::int[],
                (:team_ids)::bigint[]
            )
            """,
            {
                "bracket_ids": bracket_ids,
                "slot_idxs": slot_idxs,
                "team_ids": team_ids,
            },
        )


async def sql_replace_division_team_bracket_cells(
    division_id: DivisionId,
    items: List[DivisionTeamBracketCellsItem],
) -> None:
    if not items:
        return

    async with database.transaction():
        for item in items:
            row = await database.fetch_one(
                """
                SELECT id FROM brackets
                WHERE id = :bracket_id AND division_id = :division_id
                """,
                {"bracket_id": item.bracket_id, "division_id": division_id},
            )
            if row is None:
                continue
            await database.execute(
                "DELETE FROM team_bracket_cells WHERE bracket_id = :bracket_id",
                {"bracket_id": item.bracket_id},
            )
            if not item.cells:
                continue

            slot_idxs = [int(c.slot_idx) for c in item.cells]
            team_ids: List[Optional[int]] = [
                int(c.team_id) if c.team_id is not None else None for c in item.cells
            ]
            bracket_ids = [int(item.bracket_id)] * len(item.cells)

            await database.execute(
                """
                INSERT INTO team_bracket_cells (bracket_id, slot_idx, team_id)
                SELECT * FROM UNNEST(
                    (:bracket_ids)::bigint[],
                    (:slot_idxs)::int[],
                    (:team_ids)::bigint[]
                )
                """,
                {
                    "bracket_ids": bracket_ids,
                    "slot_idxs": slot_idxs,
                    "team_ids": team_ids,
                },
            )


async def sql_clear_division_team_bracket_cells(division_id: DivisionId) -> None:
    await database.execute(
        """
        DELETE FROM team_bracket_cells
        WHERE bracket_id IN (
          SELECT id FROM brackets WHERE division_id = :division_id
        )
        """,
        {"division_id": division_id},
    )


# ---- Lock / unlock (either table can lock a division) ----


async def sql_division_is_locked(division_id: DivisionId) -> bool:
    """True when any group has scores or advanced winners (scorekeeping started)."""
    row = await database.fetch_one(
        """
        SELECT (
          EXISTS (
            SELECT 1
            FROM player_bracket_cells bc
            INNER JOIN brackets b ON b.id = bc.bracket_id
            WHERE b.division_id = :division_id
              AND (
                TRIM(COALESCE(bc.score, '')) <> ''
                OR (bc.slot_idx >= b.num_players AND bc.player_id IS NOT NULL)
              )
          )
          OR EXISTS (
            SELECT 1
            FROM team_bracket_cells bc
            INNER JOIN brackets b ON b.id = bc.bracket_id
            WHERE b.division_id = :division_id
              AND bc.slot_idx >= b.num_players
              AND bc.team_id IS NOT NULL
          )
        ) AS locked
        """,
        {"division_id": division_id},
    )
    return bool(row and row["locked"])


async def sql_ensure_division_unlocked(division_id: DivisionId) -> None:
    if await sql_division_is_locked(division_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=DIVISION_LOCKED_DETAIL,
        )


async def sql_clear_division_bracket_cells(division_id: DivisionId) -> None:
    """Clear all scorekeeping state for the division (player + team cells)."""
    await sql_clear_division_player_bracket_cells(division_id)
    await sql_clear_division_team_bracket_cells(division_id)
