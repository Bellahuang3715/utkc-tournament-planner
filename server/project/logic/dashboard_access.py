import re
import secrets
from hmac import compare_digest

from project.models.db.tournament import Tournament, TournamentPublic
from project.models.db.user import UserPublic


def new_dashboard_preview_token() -> str:
    return secrets.token_urlsafe(24)


def new_scorekeeper_token() -> str:
    return secrets.token_urlsafe(24)


def slugify_dashboard_endpoint(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return (slug[:48] or "tournament").rstrip("-")


def to_public_tournament(tournament: Tournament) -> TournamentPublic:
    return TournamentPublic(
        id=tournament.id,
        name=tournament.name,
        organizer=tournament.organizer,
        start_time=tournament.start_time,
        location=tournament.location,
        description=tournament.description,
        dashboard_public=tournament.dashboard_public,
        dashboard_endpoint=tournament.dashboard_endpoint,
        logo_path=tournament.logo_path,
    )


def can_access_participant_dashboard(
    tournament: Tournament,
    *,
    user: UserPublic | None = None,
    preview_token: str | None = None,
) -> bool:
    """Owner can always access; others need public dashboard or a valid preview token."""
    if user is not None and tournament.creator_id == user.id:
        return True
    if tournament.dashboard_public:
        return True
    if (
        preview_token
        and tournament.dashboard_preview_token
        and compare_digest(preview_token, tournament.dashboard_preview_token)
    ):
        return True
    return False
