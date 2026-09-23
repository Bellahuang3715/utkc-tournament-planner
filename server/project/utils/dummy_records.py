from zoneinfo import ZoneInfo

from heliclockter import datetime_utc

from project.models.db.account import UserAccountType
from project.models.db.club import ClubInsertable
from project.models.db.court import CourtInsertable
from project.models.db.player import PlayerInsertable
from project.models.db.player_x_team import PlayerXTeamInsertable
from project.models.db.team import TeamInsertable
from project.models.db.team_category import TeamCategoryInsertable
from project.models.db.tournament import TournamentInsertable
from project.models.db.user import UserInsertable
from project.utils.id_types import (
    ClubId,
    UserId,
    PlayerId,
    TeamCategoryId,
    TeamId,
    TournamentId,
)
from project.utils.security import hash_password

DUMMY_MOCK_TIME = datetime_utc(2022, 1, 11, 4, 32, 11, tzinfo=ZoneInfo("UTC"))

# We don't know any db IDs here, so we use a placeholder for foreign keys.
DB_PLACEHOLDER_ID = -42

DUMMY_TOURNAMENT = TournamentInsertable(
    name="Some Cool Tournament",
    organizer="UofT",
    created=DUMMY_MOCK_TIME,
    start_time=DUMMY_MOCK_TIME,
    dashboard_public=True,
    dashboard_endpoint="endpoint-test",
    dashboard_preview_token="preview-token-test",
    scorekeeper_token=None,
    logo_path=None,
    players_can_be_in_multiple_teams=True,
    auto_assign_courts=True,
    creator_id=UserId(DB_PLACEHOLDER_ID),
)

DUMMY_CLUB = ClubInsertable(
    name="Some Cool Club",
    abbreviation="SC",
    country="Canada",
    representative="John Doe",
    contact_email="john@gmail.com",
    created=DUMMY_MOCK_TIME,
    updated=DUMMY_MOCK_TIME,
    creator_id=UserId(DB_PLACEHOLDER_ID)
)

DUMMY_USER = UserInsertable(
    email="admin@example.com",
    name="Admin",
    password_hash=hash_password("adminadmin"),
    created=DUMMY_MOCK_TIME,
    account_type=UserAccountType.REGULAR,
)

DUMMY_TEAM_CATEGORY_MIXED = TeamCategoryInsertable(
    tournament_id=TournamentId(DB_PLACEHOLDER_ID),
    name="Mixed",
    color="#d0ebff",
    position=0,
)

DUMMY_TEAM_CATEGORY_WOMENS = TeamCategoryInsertable(
    tournament_id=TournamentId(DB_PLACEHOLDER_ID),
    name="Womens",
    color="#ffdeeb",
    position=1,
)

DUMMY_TEAM1 = TeamInsertable(
    created=DUMMY_MOCK_TIME,
    updated=DUMMY_MOCK_TIME,
    code="UOT A",
    club_id=ClubId(2),
    category_id=TeamCategoryId(1),
    tournament_id=TournamentId(DB_PLACEHOLDER_ID),
    active=True,
)

DUMMY_TEAM2 = TeamInsertable(
    created=DUMMY_MOCK_TIME,
    updated=DUMMY_MOCK_TIME,
    code="NOR B",
    club_id=ClubId(2),
    category_id=TeamCategoryId(1),
    tournament_id=TournamentId(DB_PLACEHOLDER_ID),
    active=True,
)

DUMMY_TEAM3 = TeamInsertable(
    created=DUMMY_MOCK_TIME,
    updated=DUMMY_MOCK_TIME,
    code="YOR C",
    club_id=ClubId(2),
    category_id=TeamCategoryId(1),
    tournament_id=TournamentId(DB_PLACEHOLDER_ID),
    active=True,
)

DUMMY_TEAM4 = TeamInsertable(
    created=DUMMY_MOCK_TIME,
    updated=DUMMY_MOCK_TIME,
    code="MIX A",
    club_id=ClubId(2),
    category_id=TeamCategoryId(1),
    tournament_id=TournamentId(DB_PLACEHOLDER_ID),
    active=True,
)


DUMMY_PLAYER1 = PlayerInsertable(
    tournament_id=TournamentId(DB_PLACEHOLDER_ID),
    created=DUMMY_MOCK_TIME,
    name="John Doe",
    club_id=ClubId(2),
    data={
       "name":     "John Doe",
       "rank":     "1D",
       "division": "A",
       "lunch":    "Regular",
       "active":   True,
       "paid":     True,
    },
)

DUMMY_PLAYER2 = PlayerInsertable(
    tournament_id=TournamentId(DB_PLACEHOLDER_ID),
    created=DUMMY_MOCK_TIME,
    name="Thomas Kim",
    club_id=ClubId(2),
    data={
       "name":     "Thomas Kim",
       "rank":     "1D",
       "division": "A",
       "lunch":    "Regular",
       "active":   True,
       "paid":     True,
    },
)

DUMMY_PLAYER3 = PlayerInsertable(
    tournament_id=TournamentId(DB_PLACEHOLDER_ID),
    created=DUMMY_MOCK_TIME,
    name="Wryan Jeong",
    club_id=ClubId(2),
    data={
       "name":     "Wryan Jeong",
       "rank":     "4D",
       "division": "C",
       "lunch":    "Regular",
       "active":   True,
       "paid":     True,
    },
)

DUMMY_PLAYER4 = PlayerInsertable(
    tournament_id=TournamentId(DB_PLACEHOLDER_ID),
    created=DUMMY_MOCK_TIME,
    name="Taeyoon You",
    club_id=ClubId(2),
    data={
       "name":     "Taeyoon You",
       "rank":     "3D",
       "division": "B",
       "lunch":    "Regular",
       "active":   True,
       "paid":     True,
    },
)

DUMMY_PLAYER5 = PlayerInsertable(
    tournament_id=TournamentId(DB_PLACEHOLDER_ID),
    created=DUMMY_MOCK_TIME,
    name="Jin Kim",
    club_id=ClubId(2),
    data={
       "name":     "Jin Kim",
       "rank":     "Kyu",
       "division": "A",
       "lunch":    "Vegan",
       "active":   True,
       "paid":     True,
    },
)

DUMMY_PLAYER6 = PlayerInsertable(
    tournament_id=TournamentId(DB_PLACEHOLDER_ID),
    created=DUMMY_MOCK_TIME,
    name="Kisoo Choe",
    club_id=ClubId(2),
    data={
       "name":     "Kisoo Choe",
       "rank":     "2D",
       "division": "B",
       "lunch":    "Regular",
       "active":   True,
       "paid":     True,
    },
)

DUMMY_PLAYER7 = PlayerInsertable(
    tournament_id=TournamentId(DB_PLACEHOLDER_ID),
    created=DUMMY_MOCK_TIME,
    name="Sang Hoon Lee",
    club_id=ClubId(2),
    data={
       "name":     "Sang Hoon Lee",
       "rank":     "6D",
       "division": "C",
       "lunch":    "Regular",
       "active":   True,
       "paid":     True,
    },
)

DUMMY_PLAYER8 = PlayerInsertable(
    tournament_id=TournamentId(DB_PLACEHOLDER_ID),
    created=DUMMY_MOCK_TIME,
    name="Alex Jeong",
    club_id=ClubId(2),
    data={
       "name":     "Alex Jeong",
       "rank":     "Kyu",
       "division": "A",
       "lunch":    "Regular",
       "active":   True,
       "paid":     True,
    },
)

DUMMY_PLAYER_X_TEAM = PlayerXTeamInsertable(
    player_id=PlayerId(DB_PLACEHOLDER_ID),
    team_id=TeamId(DB_PLACEHOLDER_ID),
    position="SENPO",
)

DUMMY_COURT1 = CourtInsertable(
    name="Court 1",
    created=DUMMY_MOCK_TIME,
    tournament_id=TournamentId(DB_PLACEHOLDER_ID),
)

DUMMY_COURT2 = CourtInsertable(
    name="Court 2",
    created=DUMMY_MOCK_TIME,
    tournament_id=TournamentId(DB_PLACEHOLDER_ID),
)
