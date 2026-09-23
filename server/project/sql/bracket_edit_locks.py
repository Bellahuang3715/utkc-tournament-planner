"""Soft edit locks for scorekeeping brackets (one editor per group)."""

from fastapi import HTTPException
from starlette import status

from project.database import database
from project.models.db.bracket_edit_lock import BracketEditLock
from project.utils.id_types import BracketId, DivisionId

# Lock expires if no heartbeat within this window (seconds).
LOCK_TTL_SECONDS = 45

LOCK_HELD_DETAIL = "This group is being edited by someone else"


async def sql_get_edit_lock(bracket_id: BracketId) -> BracketEditLock | None:
    row = await database.fetch_one(
        """
        SELECT bracket_id, holder_session_id, holder_name, updated_at
        FROM bracket_edit_locks
        WHERE bracket_id = :bracket_id
        """,
        {"bracket_id": bracket_id},
    )
    return BracketEditLock.model_validate(row) if row is not None else None


async def sql_list_active_edit_locks(division_id: DivisionId) -> list[BracketEditLock]:
    rows = await database.fetch_all(
        """
        SELECT l.bracket_id, l.holder_session_id, l.holder_name, l.updated_at
        FROM bracket_edit_locks l
        INNER JOIN brackets b ON b.id = l.bracket_id
        WHERE b.division_id = :division_id
          AND l.updated_at >= NOW() - make_interval(secs => :ttl)
        ORDER BY l.bracket_id
        """,
        {"division_id": division_id, "ttl": LOCK_TTL_SECONDS},
    )
    return [BracketEditLock.model_validate(row) for row in rows]


async def sql_claim_edit_lock(
    bracket_id: BracketId,
    *,
    session_id: str,
    holder_name: str,
) -> BracketEditLock:
    session_id = session_id.strip()
    holder_name = holder_name.strip()
    if not session_id or not holder_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="session_id and holder_name are required",
        )

    # Use DB clock for updated_at / expiry so Python timezone skew can't
    # make a just-claimed lock look stale on the next heartbeat.
    row = await database.fetch_one(
        """
        INSERT INTO bracket_edit_locks (bracket_id, holder_session_id, holder_name, updated_at)
        VALUES (:bracket_id, :session_id, :holder_name, NOW())
        ON CONFLICT (bracket_id) DO UPDATE
        SET holder_session_id = EXCLUDED.holder_session_id,
            holder_name = EXCLUDED.holder_name,
            updated_at = NOW()
        WHERE bracket_edit_locks.updated_at < NOW() - make_interval(secs => :ttl)
           OR bracket_edit_locks.holder_session_id = EXCLUDED.holder_session_id
        RETURNING bracket_id, holder_session_id, holder_name, updated_at
        """,
        {
            "bracket_id": bracket_id,
            "session_id": session_id,
            "holder_name": holder_name,
            "ttl": LOCK_TTL_SECONDS,
        },
    )
    if row is None:
        existing = await sql_get_edit_lock(bracket_id)
        holder = existing.holder_name if existing else "someone else"
        session = existing.holder_session_id if existing else ""
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": LOCK_HELD_DETAIL,
                "holder_name": holder,
                "holder_session_id": session,
            },
        )
    return BracketEditLock.model_validate(row)


async def sql_heartbeat_edit_lock(
    bracket_id: BracketId, *, session_id: str
) -> BracketEditLock:
    session_id = session_id.strip()
    row = await database.fetch_one(
        """
        UPDATE bracket_edit_locks
        SET updated_at = NOW()
        WHERE bracket_id = :bracket_id
          AND holder_session_id = :session_id
          AND updated_at >= NOW() - make_interval(secs => :ttl)
        RETURNING bracket_id, holder_session_id, holder_name, updated_at
        """,
        {
            "bracket_id": bracket_id,
            "session_id": session_id,
            "ttl": LOCK_TTL_SECONDS,
        },
    )
    if row is not None:
        return BracketEditLock.model_validate(row)

    existing = await sql_get_edit_lock(bracket_id)
    if existing is not None:
        # Row exists but is held by someone else (or expired for us).
        active = await database.fetch_val(
            """
            SELECT 1
            FROM bracket_edit_locks
            WHERE bracket_id = :bracket_id
              AND updated_at >= NOW() - make_interval(secs => :ttl)
            """,
            {"bracket_id": bracket_id, "ttl": LOCK_TTL_SECONDS},
        )
        if active and existing.holder_session_id != session_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "message": LOCK_HELD_DETAIL,
                    "holder_name": existing.holder_name,
                    "holder_session_id": existing.holder_session_id,
                },
            )

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="No active edit lock for this group",
    )


async def sql_release_edit_lock(bracket_id: BracketId, *, session_id: str) -> None:
    """Release lock if held by this session. Idempotent if missing/expired/other."""
    session_id = session_id.strip()
    await database.execute(
        """
        DELETE FROM bracket_edit_locks
        WHERE bracket_id = :bracket_id
          AND holder_session_id = :session_id
        """,
        {"bracket_id": bracket_id, "session_id": session_id},
    )


async def assert_session_can_write_bracket(
    bracket_id: BracketId, *, session_id: str | None
) -> None:
    """Block score writes when another session holds an active lock."""
    row = await database.fetch_one(
        """
        SELECT bracket_id, holder_session_id, holder_name, updated_at
        FROM bracket_edit_locks
        WHERE bracket_id = :bracket_id
          AND updated_at >= NOW() - make_interval(secs => :ttl)
        """,
        {"bracket_id": bracket_id, "ttl": LOCK_TTL_SECONDS},
    )
    if row is None:
        return
    existing = BracketEditLock.model_validate(row)
    if session_id and existing.holder_session_id == session_id.strip():
        return
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail={
            "message": LOCK_HELD_DETAIL,
            "holder_name": existing.holder_name,
            "holder_session_id": existing.holder_session_id,
        },
    )


async def assert_session_can_write_brackets(
    bracket_ids: list[BracketId], *, session_id: str | None
) -> None:
    for bracket_id in bracket_ids:
        await assert_session_can_write_bracket(bracket_id, session_id=session_id)
