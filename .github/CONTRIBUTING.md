# Contributor's Guide

KenManage is a Next.js + FastAPI app for kendo tournament planning. The project is open source and welcomes beginners and first-time contributors.

## Licensing

By contributing, you agree that your contributions are licensed under the project's [LICENSE](../LICENSE) (AGPL-3.0).

## Getting started

1. Join the project Discord [channel](https://discord.gg/TDSBsXj6Ck) and reach out to Bella Huang (Lead Developer & Project Manager) to introduce yourself.
2. Find a GitHub issue to work on (or ask for one).
3. Fork the repo, then clone your fork:

```bash
git clone https://github.com/<your-github-username>/utkc-tournament-planner.git
cd utkc-tournament-planner
```

## Prerequisites

- [Git](https://git-scm.com/downloads)
- [Node.js](https://nodejs.org/) 22+ and [Yarn](https://yarnpkg.com/)
- [Python](https://www.python.org/) 3.12 and [Pipenv](https://pipenv.pypa.io/)
- [PostgreSQL](https://www.postgresql.org/) (e.g. [Postgres.app](https://postgresapp.com/) on macOS)
- A Firebase project (for auth) — ask a maintainer for shared credentials if you are joining the team

## Local setup

### 1. PostgreSQL

Create the app user/databases (as a Postgres superuser):

```bash
CREATE USER bracket_dev WITH PASSWORD 'bracket_dev';
CREATE DATABASE bracket_dev OWNER bracket_dev;
-- pytest only — never use this for the running app
CREATE DATABASE bracket_test OWNER bracket_dev;
```

`server/dev.env` points the app at `bracket_dev`.  
`server/ci.env` points pytest at `bracket_test`. **Do not point `ci.env` at `bracket_dev`** — tests call `drop_all` on their DSN.

### 2. Backend

```bash
cd server
pipenv install --dev
```

Copy and fill Firebase credentials:

```bash
cp .env.local.example .env.local
# Set FIREBASE_CREDENTIALS to a base64-encoded Firebase service-account JSON
```

`dev.env` already has a local `PG_DSN`, JWT secret, and admin bootstrap email/password. Adjust if needed.

Optional: seed dummy clubs/players/tournaments (this **wipes** `bracket_dev`):

```bash
export ENVIRONMENT=DEVELOPMENT
pipenv run python cli.py create-dev-db
```

Or start with an empty DB: on first API boot, if the DB is empty and admin credentials are set, the app creates tables and an admin user.

Run the API alone:

```bash
cd server
ENVIRONMENT=DEVELOPMENT pipenv run gunicorn \
  -k project.uvicorn.RestartableUvicornWorker \
  project.app:app \
  --bind localhost:8400 \
  --workers 1 \
  --reload
```

API docs: http://localhost:8400/docs

### 3. Frontend

```bash
cd client
cp .env.local.example .env.local
# Fill NEXT_PUBLIC_FIREBASE_* values
# NEXT_PUBLIC_API_BASE_URL=http://localhost:8400
yarn install --ignore-engines
```

Run the frontend alone:

```bash
cd client
yarn run dev
```

App: http://localhost:3000

### 4. Run both together

From the repo root:

```bash
./run.sh
```

Starts Next.js on `:3000` and the FastAPI app on `:8400`.

## Project layout

| Path | Role |
|------|------|
| `client/` | Next.js UI |
| `server/project/` | FastAPI app, routes, SQL, models |
| `server/alembic/` | DB migrations |
| `server/tests/` | pytest (API integration tests) |
| `run.sh` | Local frontend + backend |
| `TESTING.md` | How to run tests safely |

## Testing

See [TESTING.md](../TESTING.md) for pytest, Vitest, Playwright, and the manual release checklist.

Quick reminders:

```bash
# Server (uses bracket_test via ci.env)
cd server && pipenv run pytest

# Client unit
cd client && yarn --ignore-engines test
```

## Before development

1. Start from an up-to-date `main`
2. Create a branch using the issue number (see below)

```bash
git checkout main
git pull
git checkout -b feature/<issue-number>-short-description
```

## Branch naming

Use lowercase letters and hyphens. Include a prefix and the issue number.

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feature/` | New features or enhancements | `feature/1-add-user-authentication` |
| `bug/` | Bug fixes | `bug/2-fix-login-redirect` |
| `refactor/` | Refactors | `refactor/3-clean-dashboard-component` |
| `docs/` | Documentation | `docs/4-update-readme-contributing` |
| `test/` | Tests | `test/5-add-api-test-coverage` |
| `build/` | CI / build tooling | `build/6-update-dependencies` |
| `chore/` | Misc maintenance | `chore/7-modify-gitignore` |

## During development

- Sync your fork with upstream `main` often
- Use `git status` to see your branch and changed files
- Coordinate with others when your UI/API changes touch shared state or contracts

## Pushing changes

1. Confirm the app works locally for your change
2. Commit on your feature branch with a clear message
3. Push and open a pull request against `main`

```bash
git add <files>
git commit -m "Short summary of why"
git push -u origin HEAD
```

Follow the [pull request template](PULL_REQUEST_TEMPLATE.md).

## Database migrations

When you change SQLAlchemy schema under `server/project/`:

```bash
cd server
pipenv shell
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```

In development, the API can also auto-run migrations on startup (`AUTO_RUN_MIGRATIONS`, default on).

## Learning resources

- [FastAPI docs](https://fastapi.tiangolo.com/)
- [Next.js docs](https://nextjs.org/docs)
- [Mantine docs](https://mantine.dev/)
- [MDN](https://developer.mozilla.org/en-US/)
- [CSS Flexbox guide](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)
- [Refactoring UI](https://www.refactoringui.com/)
