from pydantic import BaseModel

from project.models.db.club import Club
from project.models.db.ranking import Ranking
from project.models.db.tournament import Tournament
from project.models.db.user import User
from project.models.db.user_x_club import UserXClub


class AuthContext(BaseModel):
    club: Club
    tournament: Tournament
    user: User
    user_x_club: UserXClub
    headers: dict[str, str]
    ranking: Ranking
