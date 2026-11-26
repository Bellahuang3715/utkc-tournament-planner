#!/bin/bash
# Lightweight CI/local check (format + ruff). Full gate: ./precommit.sh
set -euo pipefail

cd "$(dirname "$0")"

pipenv run ruff format --check .
pipenv run ruff check .
