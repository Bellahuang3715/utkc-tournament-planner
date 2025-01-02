#!/bin/bash
set -eo pipefail

function run_frontend() {
  cd client && yarn run dev
}

function run_backend() {
  cd server && ENVIRONMENT=DEVELOPMENT pipenv run gunicorn \
      -k project.uvicorn.RestartableUvicornWorker \
      project.app:app \
      --bind localhost:8400 \
      --workers 1 \
      --reload
}

(trap 'kill 0' SIGINT;
  run_frontend &
  run_backend
)
