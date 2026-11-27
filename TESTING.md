# Testing KenManage

## Important: do not wipe your app database

Integration tests call `metadata.drop_all()` on whatever `PG_DSN` is loaded from **`server/ci.env`**.

| Env file | Database | Used by |
|----------|----------|---------|
| `server/dev.env` | `bracket_dev` | Local app (`run.sh` / uvicorn) |
| `server/ci.env` | `bracket_test` | pytest only |

**Never point `ci.env` at `bracket_dev`.** Pytest also refuses to reinit databases whose name is not clearly a test DB (`*_test`, `*_ci`, or `test`).

### One-time local setup

**Docker Compose** (creates `bracket_dev` + `bracket_test` on first boot):

```bash
docker compose up -d postgres
```

**Local Postgres** (as a superuser, e.g. via Postgres.app):

```bash
psql postgres://localhost:5432/postgres -c "CREATE DATABASE bracket_test OWNER bracket_dev;"
```

---

## When to run what

### Mental model

| Layer | What it checks | Needs running app? | Needs Postgres? |
| --- | --- | --- | --- |
| **Server lint** (`./check.sh`) | Code style / imports (ruff) | No | No |
| **Server pytest** (`./ci_pytest.sh`) | API + DB behavior | No (spins its own test server) | Yes → `bracket_test` only |
| **Client Vitest** | Pure TS/JS unit logic | No | No |
| **Playwright e2e** | Real browser against the UI | Yes (`:3000`) | Usually yes for full flows |
| **OpenAPI regen** | Not a test — refreshes typed client | No | No |
| **Manual QA** | Product flows humans care about | Yes | Yes → `bracket_dev` |
| **GitHub Actions** | Lint + Vitest + pytest (+ soft e2e) on every PR/push | — | CI Postgres service |

### Cheat sheet: “I just changed X → run Y”

| You changed… | Run locally |
| --- | --- |
| `client/src/**` helper / unit-tested logic | `cd client && yarn --ignore-engines test` (or `test:watch`) |
| `client` pages / UX | Vitest if covered + Playwright smoke + manual click-through |
| `server/project/**` API/DB | `cd server && ./ci_pytest.sh` (+ `./check.sh`) |
| Python formatting only | `cd server && ./precommit.sh` then `./check.sh` |
| API request/response shapes | `generate-openapi` + `yarn openapi-ts` (see below) |
| About to open/update a PR | Vitest + `./check.sh` + `./ci_pytest.sh` |
| Shipping a release | All of the above + [manual QA checklist](#manual-qa-checklist-each-release) |

### Day-to-day (while coding)

**Frontend logic** (seeding, display helpers, etc.):

```bash
cd client
yarn --ignore-engines test:watch   # while iterating
# or once:
yarn --ignore-engines test
```

Fast; no database. Use whenever you touch pure client code under `client/src/**/*.test.ts`.

**Backend API / SQL / models:**

```bash
docker compose up -d postgres   # if not already running

cd server
./ci_pytest.sh                  # same green suite CI runs
```

Or one file while debugging:

```bash
pipenv run pytest tests/integration_tests/api/divisions_test.py -q
```

**Python style before commit:**

```bash
cd server
./precommit.sh          # autofix format + lint
./check.sh              # verify (same as CI server-lint job)
```

`STRICT=1 ./precommit.sh` also runs mypy / vulture / pylint — optional; not required by CI yet.

**FastAPI routes or Pydantic shapes** (not a test — regenerates the typed client):

```bash
cd server && ENVIRONMENT=CI pipenv run python cli.py generate-openapi
cd ../client && yarn --ignore-engines openapi-ts
```

Commit both `server/openapi/openapi.json` and `client/src/openapi/` when they change. Requires Firebase Admin credentials available to the server import path (e.g. `server/.env.local`).

### Before opening or updating a PR

Run what CI requires:

```bash
# 1) Client unit
cd client && yarn --ignore-engines test

# 2) Server lint
cd ../server && ./check.sh

# 3) Server API (needs Postgres + bracket_test)
./ci_pytest.sh
```

If those three are green, the required CI jobs should pass.

Optional if you changed UI flows:

```bash
# from repo root — app running in another terminal
./run.sh

cd client
yarn --ignore-engines test:e2e
```

### Playwright e2e — when it’s worth it

```bash
cd client
yarn --ignore-engines test:e2e:install   # once per machine
# app must be up on :3000 (./run.sh)
yarn --ignore-engines test:e2e
```

Run when you change login / home / public tournament pages, or before a release. Optional env: `E2E_PUBLIC_SLUG=<dashboard_endpoint>` to exercise `/t/[slug]`. Skip for tiny backend-only changes.

### Release / large product change

Use the [manual QA checklist](#manual-qa-checklist-each-release) against **`bracket_dev`** with a seeded DB:

```bash
cd server
export ENVIRONMENT=DEVELOPMENT
pipenv run python cli.py create-dev-db   # wipes bracket_dev
# then ./run.sh and click through the checklist
```

Automated tests do not cover full kendo tournament UX.

---

## Command reference

### Server (pytest)

```bash
cd server
pipenv install --dev
./ci_pytest.sh          # same green suite + coverage as CI
# or full tree (includes known-failing legacy tests):
# pipenv run pytest
```

Uses `ci.env` → `bracket_test` when `pytest` is loaded.

`ci_pytest.sh` still ignores JWT-era `auth_test` / `users_test`, cronjobs, and one index-lookup drift case. Players, courts, tournaments, and Firebase auth smoke are in the green suite.

Focused suites:

```bash
pipenv run pytest tests/integration_tests/api/divisions_test.py \
  tests/integration_tests/api/brackets_test.py \
  tests/integration_tests/api/public_dashboard_test.py
```

### Server lint (ruff)

```bash
cd server
./check.sh          # format --check + lint (same as CI)
./precommit.sh      # autofix format/lint locally
STRICT=1 ./precommit.sh  # also mypy + vulture + pylint
```

### Client (Vitest)

```bash
cd client
yarn --ignore-engines test
# or: yarn --ignore-engines test:watch
```

### Playwright smoke (e2e)

```bash
cd client
yarn --ignore-engines playwright install chromium
yarn --ignore-engines test:e2e
```

Requires the app reachable at `E2E_BASE_URL` (default `http://localhost:3000`). Start backend + frontend first (`./run.sh` or equivalent).

### OpenAPI client regen

```bash
cd server && ENVIRONMENT=CI pipenv run python cli.py generate-openapi
cd ../client && yarn --ignore-engines openapi-ts
```

See `client/src/services/ping.ts` for a minimal example of calling the generated client.

---

## What GitHub Actions runs

Workflow: [`.github/workflows/test.yml`](.github/workflows/test.yml) on push/PR to `main` / `master`.

| Job | Local equivalent | Blocks merge? |
| --- | --- | --- |
| **Client unit (Vitest)** | `cd client && yarn test` | Yes |
| **Server lint (ruff)** | `cd server && ./check.sh` | Yes |
| **Server API (pytest)** | `cd server && ./ci_pytest.sh` | Yes |
| **Client e2e smoke (Playwright)** | build Next + `yarn test:e2e` | **No** (`continue-on-error`); build skips Firebase init when `NEXT_PUBLIC_FIREBASE_*` unset |

A separate **Dependabot auto-merge** workflow merges Dependabot PRs; you do not run it yourself. Push a PR and watch the Checks tab for the Test workflow.

---

## Common confusions

- **`pipenv run pytest`** (full tree) ≠ **`./ci_pytest.sh`**. The full tree still includes JWT-era `auth_test` / `users_test` and cronjobs that are ignored by CI.
- **`./check.sh`** = verify only. **`./precommit.sh`** = autofix then verify.
- **Vitest** ≠ **Playwright**. Vitest = fast Node unit tests. Playwright = browser against a running Next app.
- **OpenAPI commands** are codegen, not tests.
- **`./run.sh` / process-compose** start the app; they do not run tests.
- **`bracket_dev`** is for the running app and manual QA. **`bracket_test`** is for pytest only.

---

## What automation covers (Phases 1–3)

Automated in Vitest / green pytest (see suites under `client/src/**/*.test.ts` and `server/tests/integration_tests/api/`):

| Invariant / flow | Automated? |
| --- | --- |
| Duplicate team name/code in a category | Yes (`teams_test`) |
| Same player listed twice on one team request | Yes (deduped roster) |
| Two players sharing a team position | Yes (409 + unique index) |
| Invalid team player IDs rejected | Yes |
| Same player twice in one division | Yes (idempotent attach; unique constraint) |
| Duplicate division prefix | Yes |
| Prefix must be a single letter A–Z | Yes (422 on `1`/`#`/`AB`; `b` → `B`) |
| Scorekeeping locks roster/seeding; clear unlocks | Yes (`brackets_test`) |
| Team bracket create (+ under-min reject) | Yes |
| Prefixed division brackets expose player codes | Yes |
| Public brackets/cells/match-directory/schedule readable; mutate denied | Yes |
| Players / courts / tournaments CRUD | Yes (revived Firebase-era suites) |
| Player codes unique per tournament | Yes |
| Court reorder | Yes |
| Invalid / missing Firebase token; `/users/me` | Yes (`auth_smoke_test`) |
| Outsider denied on another owner's tournament | Yes |
| Concurrent edit locks (claim 409, write block, release, TTL) | Yes (`edit_locks_test`) |
| Scorekeeper redeem + score via `X-Scorekeeper-Token` | Yes (`scorekeeping_test`) |

Client unit coverage: `score_status`, `score_notation`, `scorekeeper_access`, seeding assign (individuals + teams).

Concurrent editors should get a controlled **HTTP 409** (“someone else is editing”), not an app crash.

---

## Manual QA checklist (each release)

Run against local `create-dev-db` + app:

1. **Coded individuals:** Import/select players → Generate brackets **with** a 1-letter prefix (A–Z) → player codes appear on brackets → creating another individuals division with the same players is blocked.
2. **Uncoded individuals:** Generate brackets **without** prefix → code/ID slot blank on brackets → same player can be added to another no-prefix individuals division.
3. **Teams:** Generate team brackets (no player-code prefix) succeeds; positions stay unique when specified.
4. **Lock:** Enter a score in Scores → division locks → roster/seeding changes blocked → Unlock (clear scores) with confirm, then edits work again.
5. **Public:** Open `/t/[slug]` brackets, scores, and participants without logging in.
6. **Concurrent scorekeepers:** Second editor on the same group should see “someone else is editing” (HTTP 409). Covered by `edit_locks_test` / `scorekeeping_test`; still worth a quick manual check on the Scores UI.
