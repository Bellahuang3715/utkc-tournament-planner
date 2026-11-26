#!/usr/bin/env bash
# Regenerate the typed frontend client from server/openapi/openapi.json.
# @hey-api/openapi-ts currently breaks with TypeScript 7 (used by Next), so this
# runs codegen in an isolated temp install pinned to TypeScript 5.9.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCHEMA="$ROOT/server/openapi/openapi.json"
OUT="$ROOT/client/src/openapi"

if [[ ! -f "$SCHEMA" ]]; then
  echo "Missing $SCHEMA — run: cd server && ENVIRONMENT=CI pipenv run python cli.py generate-openapi" >&2
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cd "$TMP"
npm init -y >/dev/null
npm install --silent typescript@5.9.3 @hey-api/openapi-ts@0.99.0

cat > openapi-ts.config.js <<EOF
import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: '$SCHEMA',
  output: '$OUT',
  plugins: ['@hey-api/client-axios'],
});
EOF

npx openapi-ts
echo "Wrote typed client to $OUT"
