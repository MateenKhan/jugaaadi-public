#!/usr/bin/env bash
#
# Build the showcase and sync it to the nginx web root on the VPS.
#
#   cp deploy/.env.example deploy/.env   # once — set VPS_HOST etc.
#   npm run deploy
#
# rsync --delete makes the remote directory match dist/ exactly, so files
# removed from a build also disappear from the server.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# shellcheck source=/dev/null
[ -f deploy/.env ] && source deploy/.env

VPS_HOST="${VPS_HOST:-}"
VPS_USER="${VPS_USER:-root}"
VPS_PATH="${VPS_PATH:-/var/www/public.jugaaadi.com}"
VPS_PORT="${VPS_PORT:-22}"

if [ -z "$VPS_HOST" ]; then
  echo "VPS_HOST is not set. Copy deploy/.env.example to deploy/.env and fill it in." >&2
  exit 1
fi

echo "==> Building"
npm run build

DIST="$ROOT/apps/showcase/dist"
[ -d "$DIST" ] || { echo "Build produced no dist/ at $DIST" >&2; exit 1; }

echo "==> Syncing to ${VPS_USER}@${VPS_HOST}:${VPS_PATH}"
# The trailing slash on "$DIST/" copies the CONTENTS, not the directory itself.
rsync -avz --delete \
  -e "ssh -p ${VPS_PORT}" \
  "$DIST/" \
  "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/"

echo "==> Done — https://public.jugaaadi.com"
