#!/usr/bin/env bash
# remote-dev-up.sh — Start all services needed for remote access over Tailscale.
#
# Run this on the home machine before leaving. Starts Docker infrastructure,
# then the lego app (API + UI) and workflow roadmap (API + UI).
#
# Usage:
#   ./scripts/remote-dev-up.sh          # Start everything
#   ./scripts/remote-dev-up.sh --stop   # Stop dev servers (Docker keeps running)
#
# Prerequisites:
#   - Docker Desktop running
#   - Tailscale connected
#   - pnpm installed

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

LOG_DIR="$REPO_ROOT/.dev-logs"
COMPOSE_FILE="infra/compose.lego-app.yaml"

# ANSI colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[remote-dev]${NC} $1"; }
warn() { echo -e "${YELLOW}[remote-dev]${NC} $1"; }
err()  { echo -e "${RED}[remote-dev]${NC} $1" >&2; }

# ── Stop mode ────────────────────────────────────────────────────────────────

if [[ "${1:-}" == "--stop" ]]; then
  log "Stopping dev servers..."
  for pidfile in "$LOG_DIR"/*.pid; do
    [ -f "$pidfile" ] || continue
    pid=$(cat "$pidfile")
    name=$(basename "$pidfile" .pid)
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null && log "Stopped $name (PID $pid)" || warn "Failed to stop $name"
    else
      log "$name already stopped"
    fi
    rm -f "$pidfile"
  done
  exit 0
fi

# ── Preflight checks ────────────────────────────────────────────────────────

if ! docker info >/dev/null 2>&1; then
  err "Docker is not running. Start Docker Desktop first."
  exit 1
fi

if ! command -v tailscale >/dev/null 2>&1; then
  warn "Tailscale CLI not found — skipping connectivity check."
  TS_HOSTNAME="<unknown>"
else
  TS_HOSTNAME=$(tailscale status --self --json 2>/dev/null | grep '"DNSName"' | head -1 | sed 's/.*"DNSName": "\(.*\)\.",/\1/' || echo "<unknown>")
fi

if ! command -v pnpm >/dev/null 2>&1; then
  err "pnpm not found."
  exit 1
fi

mkdir -p "$LOG_DIR"

# ── Step 1: Docker infrastructure ────────────────────────────────────────────

log "Starting Docker infrastructure..."
docker compose -f "$COMPOSE_FILE" --env-file "$REPO_ROOT/.env" up -d 2>&1 | tail -3

log "Waiting for healthy containers..."
TIMEOUT=60
ELAPSED=0
while true; do
  UNHEALTHY=$(docker compose -f "$COMPOSE_FILE" --env-file "$REPO_ROOT/.env" ps --format json 2>/dev/null \
    | grep -c '"starting"\|"unhealthy"' || true)
  if [ "$UNHEALTHY" -eq 0 ]; then
    break
  fi
  if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
    warn "Some containers still not healthy after ${TIMEOUT}s — continuing anyway."
    break
  fi
  sleep 2
  ELAPSED=$((ELAPSED + 2))
done

log "Docker infrastructure ready."

# ── Step 2: Prevent sleep ────────────────────────────────────────────────────

if ! pgrep -q caffeinate; then
  caffeinate -i &
  echo $! > "$LOG_DIR/caffeinate.pid"
  log "Started caffeinate to prevent sleep."
else
  log "caffeinate already running."
fi

# ── Step 3: Build workspace dependencies ─────────────────────────────────────

log "Building workspace packages..."
pnpm run build --filter '@repo/logger' --filter '@repo/api-client' --filter '@repo/app-component-library' --filter '@repo/db' >/dev/null 2>&1 || warn "Some package builds failed — dev servers may still work."

# ── Step 4: Start dev servers ────────────────────────────────────────────────

start_service() {
  local name="$1"
  local filter="$2"

  log "Starting ${name}..."
  pnpm --filter "$filter" dev > "$LOG_DIR/${name}.log" 2>&1 &
  local pid=$!
  echo "$pid" > "$LOG_DIR/${name}.pid"

  # Brief wait to catch immediate crashes
  sleep 2
  if ! kill -0 "$pid" 2>/dev/null; then
    err "${name} failed to start. Check $LOG_DIR/${name}.log"
    return 1
  fi

  log "${name} started (PID ${pid})"
}

FAILED=0
start_service "lego-api"          "@repo/lego-api"          || FAILED=$((FAILED + 1))
start_service "main-app"          "@repo/main-app"          || FAILED=$((FAILED + 1))
start_service "roadmap-svc"       "@repo/roadmap-svc"       || FAILED=$((FAILED + 1))
start_service "workflow-roadmap"  "@repo/workflow-roadmap"   || FAILED=$((FAILED + 1))
start_service "scrape-worker"     "@repo/scrape-worker"     || FAILED=$((FAILED + 1))

# ── Summary ──────────────────────────────────────────────────────────────────

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  Remote Dev Environment${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Tailscale hostname:  ${GREEN}${TS_HOSTNAME}${NC}"
echo ""
echo -e "  ${GREEN}Lego App${NC}"
echo -e "    UI:   http://${TS_HOSTNAME}:8000"
echo -e "    API:  http://${TS_HOSTNAME}:9100"
echo ""
echo -e "  ${GREEN}Workflow Roadmap${NC}"
echo -e "    UI:   http://${TS_HOSTNAME}:8027"
echo -e "    API:  http://${TS_HOSTNAME}:9103"
echo ""
echo -e "  ${GREEN}Scrape Worker${NC}"
echo -e "    Queue API:  http://${TS_HOSTNAME}:9100/scraper/queues"
echo ""
echo -e "  ${GREEN}Databases (for MCP)${NC}"
echo -e "    KB (PgBouncer):   postgresql://kbuser:***@${TS_HOSTNAME}:5433/knowledgebase"
echo -e "    Monorepo PG:      postgresql://postgres:***@${TS_HOSTNAME}:5432/monorepo"
echo ""
echo -e "  Logs:  ${LOG_DIR}/"
echo -e "  Stop:  ./scripts/remote-dev-up.sh --stop"
echo ""

if [ "$FAILED" -gt 0 ]; then
  warn "${FAILED} service(s) failed to start. Check logs above."
  exit 1
fi

log "All services running. You can leave now."
