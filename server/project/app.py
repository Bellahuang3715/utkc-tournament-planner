import time
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from starlette.exceptions import HTTPException
from starlette.middleware.base import RequestResponseEndpoint
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse, Response
from starlette.staticfiles import StaticFiles

from project.config import Environment, config, environment, init_sentry
from project.cronjobs.scheduling import start_cronjobs
from project.database import database
from project.models.metrics import RequestDefinition, get_request_metrics
from project.routes import (
    auth,
    clubs,
    courts,
    internals,
    players,
    players_fields,
    divisions,
    brackets,
    public_dashboard,
    schedule_timetable,
    scorekeeping,
    team_categories,
    teams,
    tournaments,
    users,
)
from project.utils.alembic import alembic_run_migrations
from project.utils.asyncio import AsyncioTasksManager
from project.utils.db_init import init_db_when_empty
from project.utils.logging import logger

init_sentry()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    await database.connect()
    await init_db_when_empty()

    if config.auto_run_migrations and environment is not Environment.CI:
        alembic_run_migrations()

    if environment is Environment.PRODUCTION:
        start_cronjobs()

    if environment is Environment.PRODUCTION and not config.is_cors_enabled():
        logger.warning("It's advised to set the `CORS_ORIGINS` environment variable in production")

    yield

    if environment is not Environment.CI:
        await database.disconnect()

    await AsyncioTasksManager.gather()


routers = {
    "Auth": auth.router,
    "Clubs": clubs.router,
    "Divisions": divisions.router,
    "Brackets": brackets.router,
    "Courts": courts.router,
    "Internals": internals.router,
    "Players": players.router,
    "Players Fields": players_fields.router,
    "Participant dashboard": public_dashboard.router,
    "Schedule Timetable": schedule_timetable.router,
    "Scorekeeping": scorekeeping.router,
    "Team categories": team_categories.router,
    "Teams": teams.router,
    "Tournaments": tournaments.router,
    "Users": users.router,
}

description = """
### Description
This is the HTTP API for **KenManage**, open-source kendo tournament software.
The web app uses these endpoints for organizers, scorekeepers, and the public
participant dashboard.

KenManage grew out of [Bracket](https://github.com/evroon/bracket); this API and
product are maintained separately.

For organizer-oriented walkthroughs (including how to call this API), see the
**Usage Guide** in the KenManage web app (`/usage-guide`).

### Auth (quick reference)
- **Organizers:** Firebase ID token as `Authorization: Bearer …`
- **Scorekeepers:** `X-Scorekeeper-Token` (from tournament Settings), plus
  `X-Edit-Session-Id` when editing scores
- **Public participant site:** no auth when the tournament is published; otherwise
  `?preview=` with the tournament preview token

There are no long-lived organizer API keys.

Use the tag list in Swagger UI (left sidebar / filter) to jump between Auth, Clubs,
Tournaments, Divisions, Brackets, and the rest.

### Links
- GitHub: <https://github.com/Bellahuang3715/utkc-tournament-planner>
- Contact: <mailto:kenmanage@gmail.com>
- Interactive API docs: [/docs](/docs)
"""

app = FastAPI(
    title="KenManage API",
    docs_url="/docs",
    redoc_url=None,
    version="1.0.0",
    lifespan=lifespan,
    summary="API for KenManage, open-source kendo tournament software.",
    description=description,
    contact={
        "name": "KenManage",
        "email": "kenmanage@gmail.com",
        "url": "https://github.com/Bellahuang3715/utkc-tournament-planner",
    },
    license_info={
        "name": "AGPL-3.0",
        "url": "https://www.gnu.org/licenses/agpl-3.0.en.html",
    },
)

print("CORS ORIGINS:", config.cors_origins)
print("CORS ORIGIN REGEX:", config.cors_origin_regex)

app.add_middleware(
    CORSMiddleware,
    # allow_origins=config.cors_origins,
    allow_origins=["*"],        # for dev only
    allow_origin_regex=config.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next: RequestResponseEndpoint) -> Response:
    start_time = time.time()
    request_metrics = get_request_metrics()
    request_metrics.request_count[RequestDefinition.from_request(request)] += 1
    response = await call_next(request)
    process_time = time.time() - start_time
    request_metrics.response_time[RequestDefinition.from_request(request)] = process_time
    return response


@app.exception_handler(HTTPException)
async def validation_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse({"detail": "Internal server error"}, status_code=500)


app.mount("/static", StaticFiles(directory="static"), name="static")

for tag, router in routers.items():
    app.include_router(router, tags=[tag])
