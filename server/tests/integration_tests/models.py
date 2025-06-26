from pydantic import BaseModel

from project.models.db.club import Club
from project.models.db.ranking import Ranking
from project.models.db.tournament import Tournament
from project.models.db.user import User


class AuthContext(BaseModel):
    club: Club
    tournament: Tournament
    user: User
    headers: dict[str, str]
    ranking: Ranking
