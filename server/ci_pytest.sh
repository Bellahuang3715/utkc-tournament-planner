#!/usr/bin/env bash
# CI / local: run the backend test suite with line and branch coverage.
set -euo pipefail

cd "$(dirname "$0")"

pipenv run pytest \
  --cov=project \
  --cov-branch \
  --cov-report=xml \
  --cov-report=term-missing:skip-covered \
  "$@"
