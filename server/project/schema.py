from sqlalchemy import Column, ForeignKey, Integer, String, Table, UniqueConstraint, func, Index, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base  # type: ignore[attr-defined]
from sqlalchemy.sql.sqltypes import BigInteger, Boolean, DateTime, Enum, Float, Text

Base = declarative_base()
metadata = Base.metadata
DateTimeTZ = DateTime(timezone=True)

users = Table(
    "users",
    metadata,
    Column("id", BigInteger, primary_key=True, index=True),
    Column("email", String, nullable=False, index=True, unique=True),
    Column("name", String, nullable=False),
    Column("password_hash", String, nullable=False),
    Column("created", DateTimeTZ, nullable=False, server_default=func.now()),
    Column(
        "account_type",
        Enum(
            "REGULAR",
            "ADMIN",
            "DEMO",
            name="account_type",
        ),
        nullable=False,
    ),
)

clubs = Table(
    "clubs",
    metadata,
    Column("id", BigInteger, primary_key=True, index=True, autoincrement=True),
    Column("name", String, nullable=False, index=True),
    Column("abbreviation", String, nullable=False, index=True),
    Column("representative", String, nullable=True, index=True),
    Column("contact_email", String, nullable=True, index=True),
    Column("created", DateTimeTZ, nullable=False, server_default=func.now()),
    Column("updated", DateTimeTZ, nullable=False, server_default=func.now()),
    Column("creator_id", BigInteger, ForeignKey("users.id"), index=True, nullable=False),
)

tournaments = Table(
    "tournaments",
    metadata,
    Column("id", BigInteger, primary_key=True, index=True),
    Column("name", String, nullable=False, index=True),
    Column("organizer", String, nullable=False, index=True),
    Column("created", DateTimeTZ, nullable=False, server_default=func.now()),
    Column("start_time", DateTimeTZ, nullable=False),
    Column("dashboard_public", Boolean, nullable=False),
    Column("logo_path", String, nullable=True),
    Column("dashboard_endpoint", String, nullable=True, index=True, unique=True),
    Column("players_can_be_in_multiple_teams", Boolean, nullable=False, server_default="f"),
    Column("auto_assign_courts", Boolean, nullable=False, server_default="f"),
)

players = Table(
    "players",
    metadata,
    Column("id", BigInteger, primary_key=True, index=True),
    Column("tournament_id", BigInteger, ForeignKey("tournaments.id", ondelete="CASCADE"), index=True, nullable=False),
    Column("name", String, nullable=False, index=True),
    Column("club", String, nullable=False, index=True),
    Column("code", String, nullable=True, unique=True, index=True),
    Column("created", DateTimeTZ, nullable=False, server_default=func.now()),
    Column("wins", Integer, nullable=False),
    Column("data", JSONB, nullable=False),
    # optional: GIN index for fast JSON queries
    Index("ix_players_data_gin", "data", postgresql_using="gin"),
)

players_field = Table(
    "players_field",
    metadata,
    Column("id", BigInteger, primary_key=True, index=True),
    Column("tournament_id", BigInteger, ForeignKey("tournaments.id", ondelete="CASCADE"), index=True, nullable=False),
    Column("key", String, nullable=False),
    Column("label", String, nullable=False),
    Column("include", Boolean, nullable=False, server_default="t"), # checkbox state to include in table
    Column("type", 
           Enum(
               "TEXT",
               "CHECKBOX",
               "NUMBER",
               "DROPDOWN",
               name="player_field_type"), 
           nullable=False),
    Column("position", Integer, nullable=False),    # to preserve column order
    Column("options", JSONB, nullable=False, server_default=text("'[]'::jsonb")),    # only used for dropdowns
)

teams = Table(
    "teams",
    metadata,
    Column("id", BigInteger, primary_key=True, index=True),
    Column("code", String, nullable=False, index=True),
    Column("name", String, nullable=False, index=True),
    Column("category", String, nullable=False, index=True),
    Column("created", DateTimeTZ, nullable=False, server_default=func.now()),
    Column("updated", DateTimeTZ, nullable=False, server_default=func.now()),
    # try this later: Column("updated", DateTimeTZ, nullable=False, server_default=func.now(), onupdate=func.now()),
    Column("tournament_id", BigInteger, ForeignKey("tournaments.id", ondelete="CASCADE"), index=True, nullable=False),
    Column("active", Boolean, nullable=False, index=True, server_default="t"),
    Column("wins", Integer, nullable=False, server_default="0"),
)

teams_category = Table(
    "teams_category",
    metadata,
    Column("id", BigInteger, primary_key=True, index=True),
    Column("tournament_id", BigInteger, ForeignKey("tournaments.id", ondelete="CASCADE"), index=True, nullable=False),
    Column("name", String, nullable=False),
    Column("color", String, nullable=False),
    # Column("position", Integer, nullable=False, server_default="0"),
)

players_x_teams = Table(
    "players_x_teams",
    metadata,
    Column("id", BigInteger, primary_key=True, index=True),
    Column("player_id", BigInteger, ForeignKey("players.id", ondelete="CASCADE"), nullable=False),
    Column("team_id", BigInteger, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False),
    Column(
      "position",
      Enum(
        "SENPO",
        "JIHOU",
        "CHUKEN",
        "FUKUSHOU",
        "TAISHO",
        name="player_position_type",
      ),
      nullable=True,
    ),
)

divisions = Table(
    "divisions",
    metadata,
    Column("id", BigInteger, primary_key=True, index=True),
    Column("name", String, nullable=False, index=True),
    Column("prefix", String, nullable=True, index=True), # optional, ex 'E'
    Column("tournament_id", BigInteger, ForeignKey("tournaments.id", ondelete="CASCADE"), index=True, nullable=False),
    Column("duration_mins", Integer, nullable=False),
    Column("margin_mins", Integer, nullable=False),
    Column(
      "division_type",
      Enum(
        "INDIVIDUALS",
        "TEAMS",
        name="division_type",
      ),
      nullable=False,
    ),
    Column("created", DateTimeTZ, nullable=False, server_default=func.now()),
)

players_x_divisions = Table(
    "players_x_divisions",
    metadata,
    Column("id", BigInteger, primary_key=True, index=True),
    Column("player_id", BigInteger, ForeignKey("players.id", ondelete="CASCADE"), nullable=False),
    Column("division_id", BigInteger, ForeignKey("divisions.id", ondelete="CASCADE"), index=True, nullable=False),
    Column("bias", Boolean, nullable=False, server_default="f"),
    UniqueConstraint("player_id", "division_id", name="unique_player_division"), # ensures player does not get inserted multiple times into same division
)

brackets = Table(
    "brackets",
    metadata,
    Column("id", BigInteger, primary_key=True, index=True),
    Column("index", Integer, nullable=False), # order of brackets w/n division
    Column("division_id", BigInteger, ForeignKey("divisions.id", ondelete="CASCADE"), index=True, nullable=False),
    Column("num_players", Integer, nullable=False),
    Column("title", String, nullable=True), # title of the bracket, optional
)

players_x_brackets = Table(
    "players_x_brackets",
    metadata,
    Column("id", BigInteger, primary_key=True, index=True),
    Column("player_id", BigInteger, ForeignKey("players.id", ondelete="CASCADE"), nullable=False),
    Column("bracket_id", BigInteger, ForeignKey("brackets.id", ondelete="CASCADE"), index=True, nullable=False),
    Column("bracket_idx", Integer, nullable=False),
)

# bracket_conns = Table(
#     "bracket_conns",
#     metadata,
#     Column("id", BigInteger, primary_key=True, index=True),
#     Column("bracket_id", BigInteger, ForeignKey("brackets.id", ondelete="CASCADE"), index=True, nullable=False),
#     Column("player_1", Integer, nullable=False), # should cascade from another table
#     Column("player_2", Integer, nullable=False),
#     Column("winner", Integer, nullable=False),
#     Column("created", DateTimeTZ, nullable=False, server_default=func.now()),
# )

# cell = Table(
#     "cell",
#     metadata,
#     Column("id", BigInteger, primary_key=True, index=True),
#     Column("bracket_id", BigInteger, ForeignKey("brackets.id", ondelete="CASCADE"), nullable=False),
#     Column("player_id", BigInteger, ForeignKey("players.id", ondelete="CASCADE"), nullable=False),
#     Column("score", String, nullable=False),
# )

# ------------------------------------------------------------ #

stages = Table(
    "stages",
    metadata,
    Column("id", BigInteger, primary_key=True, index=True),
    Column("name", String, nullable=False, index=True),
    Column("created", DateTimeTZ, nullable=False, server_default=func.now()),
    Column("tournament_id", BigInteger, ForeignKey("tournaments.id"), index=True, nullable=False),
    Column("is_active", Boolean, nullable=False, server_default="false"),
)


stage_items = Table(
    "stage_items",
    metadata,
    Column("id", BigInteger, primary_key=True, index=True),
    Column("name", Text, nullable=False),
    Column("created", DateTimeTZ, nullable=False, server_default=func.now()),
    Column("stage_id", BigInteger, ForeignKey("stages.id"), index=True, nullable=False),
    Column("team_count", Integer, nullable=False),
    Column("ranking_id", BigInteger, ForeignKey("rankings.id"), nullable=False),
    Column(
        "type",
        Enum(
            "SINGLE_ELIMINATION",
            "SWISS",
            "ROUND_ROBIN",
            name="stage_type",
        ),
        nullable=False,
    ),
)

stage_item_inputs = Table(
    "stage_item_inputs",
    metadata,
    Column("id", BigInteger, primary_key=True, index=True),
    Column("slot", Integer, nullable=False),
    Column("tournament_id", BigInteger, ForeignKey("tournaments.id"), index=True, nullable=False),
    Column(
        "stage_item_id",
        BigInteger,
        ForeignKey("stage_items.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    ),
    Column("team_id", BigInteger, ForeignKey("teams.id"), nullable=True),
    Column("winner_from_stage_item_id", BigInteger, ForeignKey("stage_items.id"), nullable=True),
    Column("winner_position", Integer, nullable=True),
    Column("points", Float, nullable=False, server_default="0"),
    Column("wins", Integer, nullable=False, server_default="0"),
    Column("draws", Integer, nullable=False, server_default="0"),
    Column("losses", Integer, nullable=False, server_default="0"),
    UniqueConstraint("stage_item_id", "team_id"),
    UniqueConstraint("stage_item_id", "winner_from_stage_item_id", "winner_position"),
)

rounds = Table(
    "rounds",
    metadata,
    Column("id", BigInteger, primary_key=True, index=True),
    Column("name", Text, nullable=False),
    Column("created", DateTimeTZ, nullable=False, server_default=func.now()),
    Column("is_draft", Boolean, nullable=False),
    Column("stage_item_id", BigInteger, ForeignKey("stage_items.id"), nullable=False),
)


matches = Table(
    "matches",
    metadata,
    Column("id", BigInteger, primary_key=True, index=True),
    Column("created", DateTimeTZ, nullable=False, server_default=func.now()),
    Column("start_time", DateTimeTZ, nullable=True),
    Column("duration_minutes", Integer, nullable=True),
    Column("margin_minutes", Integer, nullable=True),
    Column("custom_duration_minutes", Integer, nullable=True),
    Column("custom_margin_minutes", Integer, nullable=True),
    Column("round_id", BigInteger, ForeignKey("rounds.id"), nullable=False),
    Column("stage_item_input1_id", BigInteger, ForeignKey("stage_item_inputs.id"), nullable=True),
    Column("stage_item_input2_id", BigInteger, ForeignKey("stage_item_inputs.id"), nullable=True),
    Column("stage_item_input1_conflict", Boolean, nullable=False),
    Column("stage_item_input2_conflict", Boolean, nullable=False),
    Column(
        "stage_item_input1_winner_from_match_id",
        BigInteger,
        ForeignKey("matches.id"),
        nullable=True,
    ),
    Column(
        "stage_item_input2_winner_from_match_id",
        BigInteger,
        ForeignKey("matches.id"),
        nullable=True,
    ),
    Column("court_id", BigInteger, ForeignKey("courts.id"), nullable=True),
    Column("stage_item_input1_score", Integer, nullable=False),
    Column("stage_item_input2_score", Integer, nullable=False),
    Column("position_in_schedule", Integer, nullable=True),
)

courts = Table(
    "courts",
    metadata,
    Column("id", BigInteger, primary_key=True, index=True),
    Column("name", Text, nullable=False),
    Column("created", DateTimeTZ, nullable=False, server_default=func.now()),
    Column("tournament_id", BigInteger, ForeignKey("tournaments.id"), nullable=False, index=True),
)

rankings = Table(
    "rankings",
    metadata,
    Column("id", BigInteger, primary_key=True, index=True),
    Column("created", DateTimeTZ, nullable=False, server_default=func.now()),
    Column("tournament_id", BigInteger, ForeignKey("tournaments.id"), nullable=False, index=True),
    Column("position", Integer, nullable=False),
    Column("win_points", Float, nullable=False),
    Column("draw_points", Float, nullable=False),
    Column("loss_points", Float, nullable=False),
    Column("add_score_points", Boolean, nullable=False),
)
