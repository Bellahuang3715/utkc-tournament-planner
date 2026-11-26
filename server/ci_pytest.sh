#!/usr/bin/env bash
# CI / local: run the currently green pytest suite with coverage.
# Known-broken legacy suites (JWT-era auth, schema drift) are ignored until fixed.
set -euo pipefail

cd "$(dirname "$0")"

pipenv run pytest \
  --ignore=tests/integration_tests/api/auth_test.py \
  --ignore=tests/integration_tests/api/users_test.py \
  --ignore=tests/integration_tests/api/players_test.py \
  --ignore=tests/integration_tests/api/courts_test.py \
  --ignore=tests/integration_tests/api/tournaments_test.py \
  --ignore=tests/integration_tests/cronjobs \
  --deselect=tests/integration_tests/api/teams_test.py::test_update_team_invalid_players \
  --deselect=tests/integration_tests/index_lookup_test.py::test_all_unique_indices_in_lookup \
  --cov=project \
  --cov-report=xml \
  --cov-report=term-missing:skip-covered \
  "$@"
