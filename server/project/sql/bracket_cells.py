from typing import List, Optional

from project.database import database
from project.models.db.bracket_cell import (
    BracketCell,
    BracketCellUpsert,
    DivisionBracketCellsItem,
)
from project.utils.id_types import BracketId, DivisionId


async def sql_list_bracket_cells(bracket_id: BracketId) -> List[BracketCell]:
    rows = await database.fetch_all(
        """
        SELECT
          bc.id,
          bc.bracket_id,
          bc.slot_idx,
          bc.player_id,
          bc.score,
          p.name,
          c.name AS club,
          p.code
        FROM bracket_cells bc
        LEFT JOIN players p ON p.id = bc.player_id
        LEFT JOIN clubs c ON c.id = p.club_id
        WHERE bc.bracket_id = :bracket_id
        ORDER BY bc.slot_idx
        """,
        {"bracket_id": bracket_id},
    )
    return [BracketCell.model_validate(dict(r._mapping)) for r in rows]


async def sql_list_division_bracket_cells(division_id: DivisionId) -> List[BracketCell]:
    rows = await database.fetch_all(
        """
        SELECT
          bc.id,
          bc.bracket_id,
          bc.slot_idx,
          bc.player_id,
          bc.score,
          p.name,
          c.name AS club,
          p.code
        FROM bracket_cells bc
        INNER JOIN brackets b ON b.id = bc.bracket_id
        LEFT JOIN players p ON p.id = bc.player_id
        LEFT JOIN clubs c ON c.id = p.club_id
        WHERE b.division_id = :division_id
        ORDER BY b."index", bc.slot_idx
        """,
        {"division_id": division_id},
    )
    return [BracketCell.model_validate(dict(r._mapping)) for r in rows]


async def sql_replace_bracket_cells(
    bracket_id: BracketId,
    cells: List[BracketCellUpsert],
) -> None:
    async with database.transaction():
        await database.execute(
            "DELETE FROM bracket_cells WHERE bracket_id = :bracket_id",
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
            INSERT INTO bracket_cells (bracket_id, slot_idx, player_id, score)
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
    items: List[DivisionBracketCellsItem],
) -> None:
    """Replace cells for the given brackets, verifying each belongs to the division."""
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
                "DELETE FROM bracket_cells WHERE bracket_id = :bracket_id",
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
                INSERT INTO bracket_cells (bracket_id, slot_idx, player_id, score)
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
