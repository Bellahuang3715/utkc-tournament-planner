"""Starter data copied into a user's own rows.

Clubs are inserted on registration when the user's country has a list here.
Team categories are inserted when a tournament is created.
After the copy, those rows are normal records the user can edit or delete.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class DefaultClub:
    name: str
    abbreviation: str


@dataclass(frozen=True)
class DefaultTeamCategory:
    name: str
    color: str
    position: int


# Keys must match the country name stored on users.country (for example "Canada").
# A country with no entry, or an empty list, imports nothing.
DEFAULT_CLUBS_BY_COUNTRY: dict[str, list[DefaultClub]] = {
    "Canada": [
        DefaultClub(name="Budogu Zen Kendo", abbreviation="BDG"),
        DefaultClub(name="Burlington Kendo & Iaido Club", abbreviation="BUR"),
        DefaultClub(name="Cambridge Kendo Club", abbreviation="CAM"),
        DefaultClub(name="Carleton University Kendo Club", abbreviation="CAR"),
        DefaultClub(name="Club de Kendo Ayame", abbreviation="AYA"),
        DefaultClub(name="Club De Kendo Trois-Rivieres", abbreviation="CTR"),
        DefaultClub(name="Etobicoke Kendo Club", abbreviation="ETO"),
        DefaultClub(name="Forest City Kendo Club", abbreviation="FOR"),
        DefaultClub(name="Isshin Kendo Club", abbreviation="ISS"),
        DefaultClub(name="JCCC Kendo Club", abbreviation="JCC"),
        DefaultClub(name="Jung Ko Kendo", abbreviation="JKO"),
        DefaultClub(name="Kensyukai Markham Kendo Club", abbreviation="MAR"),
        DefaultClub(name="Kingston Kendo Club", abbreviation="KIN"),
        DefaultClub(name="Macomb Kendo Dojo", abbreviation="MCB"),
        DefaultClub(name="McGill University Kendo Club", abbreviation="MCG"),
        DefaultClub(name="Mississauga Kendo Club", abbreviation="MIS"),
        DefaultClub(name="Niagara Kendo Club", abbreviation="NIA"),
        DefaultClub(name="Nord Kendo", abbreviation="NOR"),
        DefaultClub(name="North York Kendo Club", abbreviation="NYK"),
        DefaultClub(name="Ohio State University Kendo Club", abbreviation="OSU"),
        DefaultClub(name="Renshin Kendo Dojo", abbreviation="REN"),
        DefaultClub(name="Shidokan Kendo & Iaido Club", abbreviation="SHI"),
        DefaultClub(name="Tateyama Kendo Club", abbreviation="TAT"),
        DefaultClub(name="Toronto Kendo Club", abbreviation="TKC"),
        DefaultClub(name="Toronto Metropolitan University Kendo Club", abbreviation="TMU"),
        DefaultClub(name="University of Toronto Kendo Club", abbreviation="UOT"),
        DefaultClub(name="University of Waterloo Kendo Club", abbreviation="UWA"),
        DefaultClub(name="Whitby Kendo Dojo", abbreviation="WHI"),
        DefaultClub(name="University of Western Ontario Kendo Club", abbreviation="WES"),
        DefaultClub(name="York University Kendo Club", abbreviation="YOR"),
    ],
}

# Copied onto every new tournament, regardless of country.
DEFAULT_TEAM_CATEGORIES: list[DefaultTeamCategory] = [
    DefaultTeamCategory(name="Mixed", color="#d0ebff", position=0),
    DefaultTeamCategory(name="Womens", color="#ffdeeb", position=1),
    DefaultTeamCategory(name="U18 Mixed", color="#fff3bf", position=2),
]


def resolve_country_name(country: str | None) -> str | None:
    """Return the catalog key when it matches, otherwise the trimmed name."""
    if not country or not country.strip():
        return None
    raw = country.strip()
    for name in DEFAULT_CLUBS_BY_COUNTRY:
        if name.lower() == raw.lower():
            return name
    return raw


def default_clubs_for_country(country: str | None) -> list[DefaultClub]:
    resolved = resolve_country_name(country)
    if resolved is None:
        return []
    return list(DEFAULT_CLUBS_BY_COUNTRY.get(resolved, []))
