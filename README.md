
# KenManage

**Run your kendo tournament in one place.**

**KenManage** is free, open-source software for managing kendo tournaments from registration to the final match. It brings together player rosters, divisions, bracket generation, court scheduling, live scorekeeping, and a public participant board — replacing the spreadsheets, paper score sheets, and disconnected tools that often make tournament organization unnecessarily complicated.

KenManage began as a collaboration with the **University of Toronto Kendo Club** to support its annual tournament, involving 300+ participants across multiple courts. It is now being developed with the broader kendo community in mind, with the goal of giving clubs and tournament organizers an accessible, unified platform for running their own events.

Whether you're organizing a large annual tournament or a smaller inter-club competition, KenManage aims to make tournament preparation easier and event-day coordination smoother.

## What can KenManage do?

Tournament organization involves a lot of moving pieces. KenManage brings the core workflow into one system, so organizers can spend less time managing spreadsheets and more time running the event.

### Features

- **Club & tournament management** — Create tournaments, manage participating clubs, and keep event information organized in a central dashboard.
- **Roster management & Excel import** — Import player lists from club spreadsheets into one filterable roster, including custom player fields. No more manually merging multiple spreadsheets.
- **Divisions & player codes** — Organize individual and team competitions, manage division assignments, and optionally generate player IDs with configurable prefixes.
- **Bracket generation & seeding** — Generate individual and team brackets with seeding tools that account for club separation and strong-player considerations. Fine-tune placements and export brackets for printing.
- **Court scheduling** — Build court timetables based on match durations, buffers, and scheduling constraints to help avoid conflicts.
- **Live scorekeeping** — Record match results during the tournament and automatically update brackets as matches finish. Multiple scorekeepers can collaborate using separate access codes.
- **Public participant board** — Share a public tournament page where participants can check brackets, match schedules, scores, and results without creating an account.

### Designed for different tournament roles

| Role | What they can do |
| --- | --- |
| **Organizer** | Manage the tournament, participants, divisions, brackets, schedules, and results through an authenticated account. |
| **Scorekeeper** | Enter match scores using a dedicated access code, without needing an account. |
| **Participant** | View tournament brackets, schedules, scores, and results through a public link, without logging in. |

---

## Architecture

KenManage is a two-process web application:

```text
Browser ──► Next.js (:3000) ──► FastAPI (:8400) ──► PostgreSQL
                 │                    │
            Firebase Auth        Firebase Admin
            (client SDK)         (token verification)
```

| Layer | Technology |
| --- | --- |
| UI | [Next.js](https://nextjs.org/) (Pages Router), React, TypeScript, [Mantine](https://mantine.dev/) |
| API | [FastAPI](https://fastapi.tiangolo.com/), Gunicorn + Uvicorn workers |
| Persistence | [PostgreSQL](https://www.postgresql.org/), SQLAlchemy, Alembic migrations |
| Authentication | [Firebase Authentication](https://firebase.google.com/) |
| Local development | `./run.sh` (starts frontend and backend together) |

### Local development URLs

| Service | URL |
| --- | --- |
| Web application | http://localhost:3000 |
| API | http://localhost:8400 |
| OpenAPI documentation | http://localhost:8400/docs |

---

## Getting started

Want to run KenManage locally or contribute to development?

The [Contributor's Guide](.github/CONTRIBUTING.md) contains the full setup instructions, including prerequisites, PostgreSQL configuration, Firebase credentials, environment variables, and database initialization.

### Prerequisites

The following tools are required:

- Git
- Node.js 22+
- Yarn
- Python 3.12
- Pipenv
- PostgreSQL (or [Docker](https://docs.docker.com/get-docker/) / Docker Compose to run Postgres)

### Quick setup

1. Install the prerequisites listed above.
2. Start PostgreSQL and create the databases (pick one):

   **Option A — Docker Compose (recommended)**

   ```bash
   docker compose up -d postgres
   ```

   This starts Postgres on `:5432` and creates `bracket_dev` plus `bracket_test` on first boot.

   **Option B — Local Postgres**

   Create `bracket_dev` (app) and `bracket_test` (pytest only) owned by user `bracket_dev` / password `bracket_dev`.

3. Configure your environment files:
   - `server/.env.local` — Firebase Admin credentials.
   - `client/.env.local` — Firebase web configuration and `NEXT_PUBLIC_API_BASE_URL=http://localhost:8400`.
4. Install dependencies:

   ```bash
   # Backend
   cd server
   pipenv install --dev

   # Frontend
   cd ../client
   yarn install --ignore-engines
   ```

5. From the repository root, start the application:

   ```bash
   ./run.sh
   ```

The application should now be available at http://localhost:3000.

### Optional: Seed development data

To populate the local application database with dummy data:

```bash
cd server
export ENVIRONMENT=DEVELOPMENT
pipenv run python cli.py create-dev-db
```

**Warning:** This command wipes and recreates `bracket_dev`. Do not run it against a database containing data you want to keep.

---

## Database safety

KenManage maintains separate databases for local development and automated testing.

| Configuration | Database | Purpose |
| --- | --- | --- |
| `server/dev.env` | `bracket_dev` | Local application |
| `server/ci.env` | `bracket_test` | Automated tests |

**Important:** The integration test suite reinitializes its database using `drop_all`. Tests must never target `bracket_dev` or any database containing production or development data.

See [TESTING.md](TESTING.md) for details.

---

## Testing & CI

KenManage includes automated tests and a manual release checklist.

| Test suite | Command | Description |
| --- | --- | --- |
| Backend | `cd server && ./ci_pytest.sh` | Green pytest suite + coverage (`bracket_test`) |
| Backend lint | `cd server && ./check.sh` | ruff format + lint (CI); `./precommit.sh` for local autofix |
| OpenAPI | see below | Export schema + generate typed client |
| Frontend | `cd client && yarn --ignore-engines test` | Vitest unit tests |
| End-to-end | `yarn test:e2e` | Playwright smoke tests; requires the application to be running |
| CI | [GitHub Actions](.github/workflows/test.yml) | Automated test + lint workflow |

### OpenAPI typed client

After changing FastAPI routes/models:

```bash
cd server && ENVIRONMENT=CI pipenv run python cli.py generate-openapi
cd ../client && yarn --ignore-engines openapi-ts
```

Import types/SDK helpers from `client/src/openapi` (see `client/src/services/ping.ts` for a minimal example). Hand-written services can migrate gradually.

### Process Compose (optional)

Copy [`process-compose-example.yml`](process-compose-example.yml) to `process-compose.yml`, start Postgres (`docker compose up -d postgres`), then `process-compose up` as an alternative to `./run.sh`.

A manual release checklist is also available in [TESTING.md](TESTING.md).

---

## Contributing

Contributions are welcome! Whether you're fixing a bug, improving the interface, adding functionality, or helping make KenManage more useful for kendo clubs, your input is appreciated.

To get started:

1. Join the project [Discord](https://discord.gg/TDSBsXj6Ck) and introduce yourself to the maintainers.
2. Fork the repository and create an issue-linked branch. See the [Contributor's Guide](.github/CONTRIBUTING.md) for branch naming conventions.
3. Make your changes and open a pull request against `main` using the [pull request template](.github/PULL_REQUEST_TEMPLATE.md).

Please keep discussions constructive and coordinate with maintainers when changing shared API or UI contracts.

---

## License

KenManage is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

See the [LICENSE](LICENSE) file and the in-app [license page](client/src/pages/license.tsx) for details.

The AGPL-3.0 requires anyone who modifies KenManage and makes the modified version available as a network service to provide users of that service with access to the corresponding source code. Contributions to KenManage are accepted under the same license.

---

## Acknowledgments

- Derived in part from [Bracket](https://github.com/evroon/bracket), licensed under GNU AGPLv3.
- Pull request template inspired by [freeCodeCamp](https://github.com/freeCodeCamp).
