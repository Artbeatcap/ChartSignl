#!/usr/bin/env bash
#
# ChartSignl safe production deploy (local-run)
# - Syncs ONLY into /root/ChartSignl/ (does not touch other VPS directories)
# - Excludes secrets (.env*) and heavy build artifacts
# - Rebuilds + restarts backend via Docker Compose
# - Verifies backend health on http://127.0.0.1:4000/health
#
# Usage:
#   ./deploy.sh
#
# Optional:
#   REMOTE_HOST=root@1.2.3.4 REMOTE_APP_DIR=/root/ChartSignl ./deploy.sh
#
set -euo pipefail

REMOTE_HOST="${REMOTE_HOST:-root@167.88.43.61}"
REMOTE_APP_DIR="${REMOTE_APP_DIR:-/root/ChartSignl}"

REMOTE_COMPOSE_DIR="${REMOTE_APP_DIR}/apps/backend/deploy"
REMOTE_COMPOSE_FILE="${REMOTE_COMPOSE_DIR}/docker-compose.yml"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require_cmd rsync
require_cmd ssh

echo "📦 Syncing repo to ${REMOTE_HOST}:${REMOTE_APP_DIR}/"
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.env' \
  --exclude '.env.*' \
  --exclude 'dist' \
  --exclude '.turbo' \
  --exclude '.next' \
  --exclude '.expo' \
  --exclude '.git' \
  -e ssh \
  ./ "${REMOTE_HOST}:${REMOTE_APP_DIR}/"

echo "🔎 Detecting production env source + restarting backend (Docker Compose)…"
ssh "${REMOTE_HOST}" "bash -s" <<EOF
set -euo pipefail

APP_DIR="${REMOTE_APP_DIR}"
COMPOSE_DIR="${REMOTE_COMPOSE_DIR}"
COMPOSE_FILE="${REMOTE_COMPOSE_FILE}"

if [ ! -d "\$APP_DIR" ]; then
  echo "ERROR: Missing app dir: \$APP_DIR" >&2
  exit 1
fi

if [ ! -f "\$COMPOSE_FILE" ]; then
  echo "ERROR: Missing compose file: \$COMPOSE_FILE" >&2
  exit 1
fi

cd "\$COMPOSE_DIR"

# Prefer docker compose; fall back to docker-compose if needed.
if docker compose version >/dev/null 2>&1; then
  DC=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  DC=(docker-compose)
else
  echo "ERROR: Neither 'docker compose' nor 'docker-compose' is available on the VPS." >&2
  exit 1
fi

ENV_ARG=()
if [ -f "\$COMPOSE_DIR/.env" ]; then
  echo "✅ Using env file: \$COMPOSE_DIR/.env"
elif [ -f "\$APP_DIR/.env" ]; then
  echo "✅ Using env file: \$APP_DIR/.env"
  ENV_ARG=(--env-file "\$APP_DIR/.env")
else
  echo "ERROR: No .env found at:" >&2
  echo "  - \$COMPOSE_DIR/.env" >&2
  echo "  - \$APP_DIR/.env" >&2
  echo "" >&2
  echo "Create one of those files with SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, etc." >&2
  exit 1
fi

echo "🧱 Rebuilding + restarting backend…"
"\${DC[@]}" "\${ENV_ARG[@]}" down
"\${DC[@]}" "\${ENV_ARG[@]}" up -d --build

echo "🩺 Health check…"
curl -fsS "http://127.0.0.1:4000/health" >/dev/null
echo "✅ Backend healthy."
EOF

echo "✅ Deployment complete."
