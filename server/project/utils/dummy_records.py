from decimal import Decimal
from zoneinfo import ZoneInfo

from heliclockter import datetime_utc

from project.models.db.account import UserAccountType
from project.models.db.club import ClubInsertable
from project.models.db.court import CourtInsertable
from project.models.db.match import MatchInsertable
from project.models.db.player import PlayerInsertable
from project.models.db.player_x_team import PlayerXTeamInsertable
from project.models.db.ranking import RankingInsertable
from project.models.db.round import RoundInsertable
from project.models.db.stage import StageInsertable
from project.models.db.stage_item import StageItemInsertable, StageType
from project.models.db.team import TeamInsertable
from project.models.db.tournament import TournamentInsertable
from project.models.db.user import UserInsertable
from project.utils.id_types import (
    UserId,
    ClubId,
    CourtId,
    PlayerId,
    RankingId,
    RoundId,
    StageId,
    StageItemId,
    StageItemInputId,
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
    logo_path=None,
    players_can_be_in_multiple_teams=True,
    auto_assign_courts=True,
)

DUMMY_CLUB = ClubInsertable(
    name="Some Cool Club",
    abbreviation="SC",
    representative="John Doe",
    contact_email="john@gmail.com",
    created=DUMMY_MOCK_TIME,
    updated=DUMMY_MOCK_TIME,
    creator_id=UserId(DB_PLACEHOLDER_ID)
)

DUMMY_STAGE1 = StageInsertable(
    tournament_id=TournamentId(DB_PLACEHOLDER_ID),
    created=DUMMY_MOCK_TIME,
    is_active=True,
    name="Group Stage",
)

DUMMY_STAGE2 = StageInsertable(
    tournament_id=TournamentId(DB_PLACEHOLDER_ID),
    created=DUMMY_MOCK_TIME,
    is_active=False,
    name="Knockout Stage",
)

DUMMY_STAGE_ITEM1 = StageItemInsertable(
    stage_id=StageId(DB_PLACEHOLDER_ID),
    ranking_id=RankingId(DB_PLACEHOLDER_ID),
    created=DUMMY_MOCK_TIME,
    type=StageType.ROUND_ROBIN,
    team_count=4,
    name="Group A",
)

DUMMY_STAGE_ITEM2 = StageItemInsertable(
    stage_id=StageId(DB_PLACEHOLDER_ID),
    ranking_id=RankingId(DB_PLACEHOLDER_ID),
    created=DUMMY_MOCK_TIME,
    type=StageType.ROUND_ROBIN,
    team_count=4,
    name="Group B",
)

DUMMY_STAGE_ITEM3 = StageItemInsertable(
    stage_id=StageId(DB_PLACEHOLDER_ID),
    ranking_id=RankingId(DB_PLACEHOLDER_ID),
    created=DUMMY_MOCK_TIME,
    type=StageType.SINGLE_ELIMINATION,
    team_count=4,
    name="Bracket A",
)

DUMMY_ROUND1 = RoundInsertable(
    stage_item_id=StageItemId(DB_PLACEHOLDER_ID),
    created=DUMMY_MOCK_TIME,
    is_draft=False,
    name="Round 1",
)

DUMMY_ROUND2 = RoundInsertable(
    stage_item_id=StageItemId(DB_PLACEHOLDER_ID),
    created=DUMMY_MOCK_TIME,
    is_draft=True,
    name="Round 2",
)

DUMMY_ROUND3 = RoundInsertable(
    stage_item_id=StageItemId(DB_PLACEHOLDER_ID),
    created=DUMMY_MOCK_TIME,
    is_draft=False,
    name="Round 3",
)

DUMMY_MATCH1 = MatchInsertable(
    created=DUMMY_MOCK_TIME,
    start_time=DUMMY_MOCK_TIME,
    round_id=RoundId(DB_PLACEHOLDER_ID),
    stage_item_input1_id=StageItemInputId(DB_PLACEHOLDER_ID),
    stage_item_input2_id=StageItemInputId(DB_PLACEHOLDER_ID),
    stage_item_input1_score=11,
    stage_item_input2_score=22,
    court_id=CourtId(DB_PLACEHOLDER_ID),
    stage_item_input1_winner_from_match_id=None,
    stage_item_input2_winner_from_match_id=None,
    duration_minutes=10,
    margin_minutes=5,
    custom_duration_minutes=None,
    custom_margin_minutes=None,
    position_in_schedule=1,
    stage_item_input1_conflict=False,
    stage_item_input2_conflict=False,
)

DUMMY_USER = UserInsertable(
    email="admin@example.com",
    name="Admin",
    password_hash=hash_password("adminadmin"),
    created=DUMMY_MOCK_TIME,
    account_type=UserAccountType.REGULAR,
)

DUMMY_TEAM1 = TeamInsertable(
    created=DUMMY_MOCK_TIME,
    updated=DUMMY_MOCK_TIME,
    code="UOT A",
    name="University of Toronto",
    category="Mixed",
    tournament_id=TournamentId(DB_PLACEHOLDER_ID),
    active=True,
)

DUMMY_TEAM2 = TeamInsertable(
    created=DUMMY_MOCK_TIME,
    updated=DUMMY_MOCK_TIME,
    code="NOR B",
    name="Nord Kendo Club",
    category="Mixed",
    tournament_id=TournamentId(DB_PLACEHOLDER_ID),
    active=True,
)

DUMMY_TEAM3 = TeamInsertable(
    created=DUMMY_MOCK_TIME,
    updated=DUMMY_MOCK_TIME,
    code="YOR C",
    name="York University",
    category="Mixed",
    tournament_id=TournamentId(DB_PLACEHOLDER_ID),
    active=True,
)

DUMMY_TEAM4 = TeamInsertable(
    created=DUMMY_MOCK_TIME,
    updated=DUMMY_MOCK_TIME,
    code="MIX A",
    name="North York x Renshin",
    category="Mixed",
    tournament_id=TournamentId(DB_PLACEHOLDER_ID),
    active=True,
)


DUMMY_PLAYER1 = PlayerInsertable(
    tournament_id=TournamentId(DB_PLACEHOLDER_ID),
    created=DUMMY_MOCK_TIME,
    name="John Doe",
    club="University of Toronto",
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
    club="University of Toronto",
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
    club="University of Toronto",
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
    club="University of Toronto",
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
    club="University of Toronto",
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
    club="University of Toronto",
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
    club="University of Toronto",
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
    club="University of Toronto",
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

DUMMY_RANKING1 = RankingInsertable(
    tournament_id=TournamentId(DB_PLACEHOLDER_ID),
    win_points=Decimal("1.0"),
    draw_points=Decimal("0.5"),
    loss_points=Decimal("0.0"),
    add_score_points=False,
    position=0,
)
