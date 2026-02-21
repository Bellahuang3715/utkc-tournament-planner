from typing import Iterable, List, Optional
from project.database import database
from project.models.db.bracket import (
    Bracket, BracketWithPlayers, DivisionBracketsCreateBody, BracketWithPlayersCreate
)
from project.utils.id_types import DivisionId, BracketId


# --- Read: list brackets for a division (no players) ---
async def sql_list_division_brackets(division_id: DivisionId) -> List[Bracket]:
    query = """
        SELECT id, "index", division_id, num_players, title
        FROM brackets
        WHERE division_id = :division_id
        ORDER BY "index", id
    """
    rows = await database.fetch_all(query, {"division_id": division_id})
    return [Bracket.model_validate(dict(r._mapping)) for r in rows]


async def sql_list_division_brackets_with_players(division_id: DivisionId) -> List[BracketWithPlayers]:
    query = """
        SELECT
          b.id, b."index", b.division_id, b.num_players, b.title,
          COALESCE(
            JSONB_AGG(
              JSONB_BUILD_OBJECT(
                'player_id', p.id,
                'bracket_idx', pxb.bracket_idx,
                'name', p.name,
                'club', p.club,
                'code', p.code
              )
              ORDER BY pxb.bracket_idx
            ) FILTER (WHERE pxb.bracket_id IS NOT NULL),
            '[]'::jsonb
          ) AS players
        FROM brackets b
        LEFT JOIN players_x_brackets pxb ON pxb.bracket_id = b.id
        LEFT JOIN players p ON p.id = pxb.player_id
        WHERE b.division_id = :division_id
        GROUP BY b.id
        ORDER BY b."index", b.id
    """
    rows = await database.fetch_all(query, {"division_id": division_id})
    return [BracketWithPlayers.model_validate(dict(r._mapping)) for r in rows]


# --- Delete all brackets (and their players) for a division (used when replace=true) ---
async def sql_delete_division_brackets(division_id: DivisionId) -> None:
    # players_x_brackets depends on brackets; delete children via join for speed
    await database.execute(
        """
        DELETE FROM players_x_brackets pxb
        USING brackets b
        WHERE pxb.bracket_id = b.id
          AND b.division_id = :division_id
        """,
        {"division_id": division_id},
    )
    await database.execute(
        'DELETE FROM brackets WHERE division_id = :division_id',
        {"division_id": division_id},
    )


# --- Create all brackets + slots in one transaction ---
async def sql_create_division_brackets(
    division_id: DivisionId,
    body: DivisionBracketsCreateBody,
    *,
    replace: bool = False,
) -> List[Bracket]:
    created: List[Bracket] = []

    async with database.transaction():
        if replace:
            await sql_delete_division_brackets(division_id)

        # 1) insert brackets, collect their IDs
        # (Insert one-by-one to capture each id + keep index order; still fast)
        for b in body.brackets:
            row = await database.fetch_one(
                """
                INSERT INTO brackets ("index", division_id, num_players, title)
                VALUES (:index, :division_id, :num_players, :title)
                RETURNING id, "index", division_id, num_players, title
                """,
                {
                    "index": b.index,
                    "division_id": division_id,
                    "num_players": b.num_players,
                    "title": b.title,
                },
            )
            assert row is not None
            bracket = Bracket.model_validate(dict(row._mapping))
            created.append(bracket)

            # 2) bulk insert slots for this bracket (if any)
            if b.players:
                player_ids = [int(p.player_id) for p in b.players]
                bracket_idxs = [int(p.bracket_idx) for p in b.players]
                bracket_ids = [int(bracket.id)] * len(player_ids)

                await database.execute(
                    """
                    INSERT INTO players_x_brackets (player_id, bracket_id, bracket_idx)
                    SELECT * FROM UNNEST(
                        (:player_ids)::bigint[],
                        (:bracket_ids)::bigint[],
                        (:bracket_idxs)::int[]
                    )
                    """,
                    {
                        "player_ids": player_ids,
                        "bracket_ids": bracket_ids,
                        "bracket_idxs": bracket_idxs,
                    },
                )

    return created


async def sql_update_bracket_title(bracket_id: BracketId, title: Optional[str]) -> Bracket:
    # normalize: empty string -> NULL
    norm = (title or "").strip() or None

    row = await database.fetch_one(
        """
        UPDATE brackets
        SET title = :title
        WHERE id = :bracket_id
        RETURNING id, "index", division_id, num_players, title
        """,
        {"bracket_id": bracket_id, "title": norm},
    )
    assert row is not None
    return Bracket.model_validate(dict(row._mapping))
