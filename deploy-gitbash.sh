#!/usr/bin/env bash
#
# ChartSignl safe production deploy (Git Bash friendly)
# - Syncs ONLY into /root/ChartSignl/ (does not touch other VPS directories)
# - Excludes secrets (.env*) and heavy build artifacts
# - Preserves server: .env, .env.*, node_modules, .git
# - Rebuilds + restarts backend via Docker Compose
# - Verifies backend health on http://127.0.0.1:4000/health
#
set -euo pipefail

REMOTE_HOST="${REMOTE_HOST:-root@167.88.43.61}"
REMOTE_APP_DIR="${REMOTE_APP_DIR:-/root/ChartSignl}"

echo "📦 Syncing (tar over ssh) to ${REMOTE_HOST}:${REMOTE_APP_DIR}/"

# Remove everything except secrets + node_modules + git metadata
ssh -o BatchMode=yes "${REMOTE_HOST}" "bash -lc 'set -euo pipefail; cd \"${REMOTE_APP_DIR}\"; for p in * .*; do case \"\$p\" in .|..|node_modules|.env|.env.*|.git) continue;; esac; rm -rf -- \"\$p\"; done'"

# Stream repo contents (excluding env/build artifacts) into the remote directory
tar -czf - \
  --exclude 'node_modules' \
  --exclude '.env' \
  --exclude '.env.*' \
  --exclude 'dist' \
  --exclude '.turbo' \
  --exclude '.next' \
  --exclude '.expo' \
  --exclude '.git' \
  . \
| ssh -o BatchMode=yes "${REMOTE_HOST}" "bash -lc 'set -euo pipefail; cd \"${REMOTE_APP_DIR}\"; tar -xzf -'"

echo "🔧 Rebuilding + restarting backend…"
ssh -o BatchMode=yes "${REMOTE_HOST}" "bash -lc 'set -euo pipefail; \
  if [ -f /srv/chartsignl/.env ]; then ln -sf /srv/chartsignl/.env \"${REMOTE_APP_DIR}/apps/backend/deploy/.env\"; fi; \
  cd \"${REMOTE_APP_DIR}/apps/backend/deploy\"; \
  if docker compose version >/dev/null 2>&1; then \
    docker compose build; \
    docker compose up -d; \
  else \
    docker-compose build; \
    docker-compose up -d; \
  fi; \
  curl -fsS http://127.0.0.1:4000/health >/dev/null; \
  echo \"✅ Backend healthy.\"'"

echo "✅ Deployment complete."
