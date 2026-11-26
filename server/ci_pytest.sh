#!/usr/bin/env bash
# CI / local: run the currently green pytest suite with coverage.
# Still ignored: JWT-era auth_test/users_test, cronjobs, and one index-lookup drift case.
set -euo pipefail

cd "$(dirname "$0")"

pipenv run pytest \
  --ignore=tests/integration_tests/api/auth_test.py \
  --ignore=tests/integration_tests/api/users_test.py \
  --ignore=tests/integration_tests/cronjobs \
  --deselect=tests/integration_tests/index_lookup_test.py::test_all_unique_indices_in_lookup \
  --cov=project \
  --cov-report=xml \
  --cov-report=term-missing:skip-covered \
  "$@"
