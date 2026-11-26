# Testing KenManage

## Important: do not wipe your app database

Integration tests call `metadata.drop_all()` on whatever `PG_DSN` is loaded from **`server/ci.env`**.

| Env file | Database | Used by |
|----------|----------|---------|
| `server/dev.env` | `bracket_dev` | Local app (`run.sh` / uvicorn) |
| `server/ci.env` | `bracket_test` | pytest only |

**Never point `ci.env` at `bracket_dev`.** Pytest also refuses to reinit databases whose name is not clearly a test DB (`*_test`, `*_ci`, or `test`).

### One-time local setup

```bash
# as a Postgres superuser (e.g. your macOS user via Postgres.app)
psql postgres://localhost:5432/postgres -c "CREATE DATABASE bracket_test OWNER bracket_dev;"
```

## Automated

### Server (pytest)

```bash
cd server
pipenv install --dev
pipenv run pytest
```

Uses `ci.env` → `bracket_test` when `pytest` is loaded.

Focused suites:

```bash
pipenv run pytest tests/integration_tests/api/divisions_test.py \
  tests/integration_tests/api/brackets_test.py \
  tests/integration_tests/api/public_dashboard_test.py
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

## Manual QA checklist (each release)

Run against local `create-dev-db` + app:

1. **Coded individuals:** Import/select players → Generate brackets **with** a 1-char prefix → player codes appear on brackets → creating another individuals division with the same players is blocked.
2. **Uncoded individuals:** Generate brackets **without** prefix → code/ID slot blank on brackets → same player can be added to another no-prefix individuals division.
3. **Teams:** Generate team brackets (no player-code prefix) succeeds.
4. **Lock:** Enter a score in Scores → division locks → roster/seeding changes blocked → Unlock (clear scores) with confirm, then edits work again.
5. **Public:** Open `/t/[slug]` brackets, scores, and participants without logging in.
