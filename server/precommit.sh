#!/bin/bash
# Local quality gate. CI runs ./check.sh (ruff only).
# Set STRICT=1 to also fail on mypy / vulture / pylint.
set -euo pipefail

cd "$(dirname "$0")"

pipenv run ruff format .
pipenv run ruff check --fix .
pipenv run ruff check .

if [[ "${STRICT:-0}" == "1" ]]; then
  # Fail only on unused functions/classes/methods (same gate as upstream Bracket).
  ! pipenv run vulture | grep "unused function\|unused class\|unused method"
  pipenv run mypy project cli.py
  pipenv run pylint cli.py project tests
fi
