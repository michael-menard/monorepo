#!/usr/bin/env bash
# =============================================================================
# Telemetry Stack Smoke Test
# =============================================================================
#
# Validates the local observability stack (TELE-0010).
#
# Prerequisites:
#   - Docker Desktop running
#   - lego-api running on host with ENABLE_METRICS=true for AC-3
#     (start with: cd apps/api/lego-api && ENABLE_METRICS=true pnpm dev)
#   - Ports 9090, 3003, 4317, 4318, 8889, 13133 available
#
# Usage:
#   bash infra/smoke-test.sh           # Run all checks
#   bash infra/smoke-test.sh --no-api  # Skip lego-api check (AC-3)
#
# =============================================================================

set -euo pipefail

COMPOSE_FILE="infra/compose.lego-app.yaml"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SKIP_API=false
PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0
TOTAL_CHECKS=0

# Parse flags
for arg in "$@"; do
  case $arg in
    --no-api) SKIP_API=true ;;
  esac
done

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

pass() {
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  PASS_COUNT=$((PASS_COUNT + 1))
  echo -e "  ${GREEN}[PASS]${NC} $1"
}

fail() {
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  FAIL_COUNT=$((FAIL_COUNT + 1))
  echo -e "  ${RED}[FAIL]${NC} $1"
}

skip() {
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  SKIP_COUNT=$((SKIP_COUNT + 1))
  echo -e "  ${YELLOW}[SKIP]${NC} $1"
}

wait_for_healthy() {
  local service=$1
  local max_wait=${2:-60}
  local elapsed=0
  while [ $elapsed -lt $max_wait ]; do
    local health
    health=$(docker inspect --format='{{.State.Health.Status}}' "$service" 2>/dev/null || echo "not_found")
    if [ "$health" = "healthy" ]; then
      return 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done
  return 1
}

cd "$REPO_ROOT"

echo ""
echo "============================================="
echo " Telemetry Stack Smoke Test (TELE-0010)"
echo "============================================="
echo ""

# ─── AC-1: Full stack startup ────────────────────────────────────────────────
echo "AC-1: Docker Compose stack starts cleanly"

docker compose -f "$COMPOSE_FILE" up -d --wait --timeout 60 2>/dev/null

# Check all expected services are running and healthy
ALL_HEALTHY=true
for service in monorepo-postgres monorepo-redis monorepo-prometheus monorepo-grafana monorepo-otel-collector monorepo-minio; do
  if ! wait_for_healthy "$service" 60; then
    fail "$service did not become healthy within 60s"
    ALL_HEALTHY=false
  fi
done

if [ "$ALL_HEALTHY" = true ]; then
  # Verify no containers are restarting or unhealthy
  UNHEALTHY=$(docker compose -f "$COMPOSE_FILE" ps --format json 2>/dev/null | grep -c '"unhealthy"\|"restarting"' || true)
  if [ "$UNHEALTHY" -eq 0 ]; then
    pass "All services started and healthy"
  else
    fail "Some services are unhealthy or restarting"
  fi
fi

echo ""

# ─── AC-2: Prometheus health ─────────────────────────────────────────────────
echo "AC-2: Prometheus accessible and healthy"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9090/-/healthy 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  pass "Prometheus healthy (HTTP $HTTP_CODE)"
else
  fail "Prometheus health check returned HTTP $HTTP_CODE (expected 200)"
fi

echo ""

# ─── AC-3: Prometheus scrapes lego-api ────────────────────────────────────────
echo "AC-3: Prometheus scrapes lego-api target"

if [ "$SKIP_API" = true ]; then
  skip "lego-api check skipped (--no-api flag)"
else
  # Check if lego-api is running on port 3001
  API_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/metrics 2>/dev/null || echo "000")
  if [ "$API_CHECK" = "000" ]; then
    fail "lego-api not reachable on port 3001 (is it running with ENABLE_METRICS=true?)"
  else
    # Wait a scrape interval (15s) then check Prometheus targets
    echo "  Waiting 20s for Prometheus to scrape..."
    sleep 20
    TARGET_HEALTH=$(curl -s 'http://localhost:9090/api/v1/targets' 2>/dev/null | \
      python3 -c "import sys,json; targets=json.load(sys.stdin)['data']['activeTargets']; api=[t for t in targets if t['labels'].get('job')=='lego-api']; print(api[0]['health'] if api else 'not_found')" 2>/dev/null || echo "error")
    if [ "$TARGET_HEALTH" = "up" ]; then
      pass "lego-api target is UP in Prometheus"
    else
      fail "lego-api target health: $TARGET_HEALTH (expected 'up')"
    fi
  fi
fi

echo ""

# ─── AC-4: Grafana health and datasource ─────────────────────────────────────
echo "AC-4: Grafana accessible with Prometheus datasource"

GRAFANA_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3003/api/health 2>/dev/null || echo "000")
if [ "$GRAFANA_CODE" = "200" ]; then
  pass "Grafana API healthy (HTTP $GRAFANA_CODE)"
else
  fail "Grafana health check returned HTTP $GRAFANA_CODE (expected 200)"
fi

DS_NAME=$(curl -s -u admin:admin http://localhost:3003/api/datasources 2>/dev/null | \
  python3 -c "import sys,json; ds=json.load(sys.stdin); print(ds[0]['name'] if ds else 'none')" 2>/dev/null || echo "error")
if [ "$DS_NAME" = "Prometheus" ]; then
  pass "Prometheus datasource provisioned"
else
  fail "Expected datasource 'Prometheus', got '$DS_NAME'"
fi

echo ""

# ─── AC-5: Grafana folder provisioned ────────────────────────────────────────
echo "AC-5: Grafana dashboard folder provisioned"

FOLDERS=$(curl -s -u admin:admin http://localhost:3003/api/folders 2>/dev/null || echo "[]")
HAS_FOLDER=$(echo "$FOLDERS" | python3 -c "import sys,json; folders=json.load(sys.stdin); print('yes' if any('workflow' in f.get('title','').lower() for f in folders) else 'no')" 2>/dev/null || echo "error")
if [ "$HAS_FOLDER" = "yes" ]; then
  pass "Workflow telemetry folder provisioned in Grafana"
else
  fail "No workflow telemetry folder found in Grafana (folders: $FOLDERS)"
fi

echo ""

# ─── AC-6: ENABLE_METRICS documented ─────────────────────────────────────────
echo "AC-6: ENABLE_METRICS=true documented in .env.example"

if grep -q "ENABLE_METRICS=true" apps/api/lego-api/.env.example 2>/dev/null; then
  pass "ENABLE_METRICS=true present in .env.example"
else
  fail "ENABLE_METRICS=true not found in apps/api/lego-api/.env.example"
fi

if grep -q "host.docker.internal" apps/api/lego-api/.env.example 2>/dev/null; then
  pass "Comment references host.docker.internal scraping"
else
  fail "Comment does not reference Prometheus scraping via host.docker.internal"
fi

echo ""

# ─── AC-7: Dashboard path README ─────────────────────────────────────────────
echo "AC-7: Dashboard path README exists"

if [ -f "infra/grafana/dashboards/README.md" ]; then
  if grep -q "canonical" infra/grafana/dashboards/README.md 2>/dev/null; then
    pass "README.md documents canonical dashboard location"
  else
    fail "README.md exists but does not document canonical path"
  fi
  if grep -q "apps/telemetry/dashboards" infra/grafana/dashboards/README.md 2>/dev/null; then
    pass "README.md notes superseded PLAN.md reference"
  else
    fail "README.md does not note superseded PLAN.md reference"
  fi
else
  fail "infra/grafana/dashboards/README.md not found"
fi

echo ""

# ─── AC-8: No existing services broken ───────────────────────────────────────
echo "AC-8: Existing services not broken (clean restart)"

docker compose -f "$COMPOSE_FILE" down -v 2>/dev/null
docker compose -f "$COMPOSE_FILE" up -d --wait --timeout 60 2>/dev/null

RESTART_HEALTHY=true
for service in monorepo-postgres monorepo-redis monorepo-minio monorepo-prometheus monorepo-grafana monorepo-otel-collector; do
  if ! wait_for_healthy "$service" 60; then
    fail "$service failed health check after clean restart"
    RESTART_HEALTHY=false
  fi
done

if [ "$RESTART_HEALTHY" = true ]; then
  pass "All services healthy after clean restart (down -v && up -d)"
fi

# Check minio-init exited cleanly
MINIO_INIT_EXIT=$(docker inspect --format='{{.State.ExitCode}}' monorepo-minio-init 2>/dev/null || echo "unknown")
if [ "$MINIO_INIT_EXIT" = "0" ]; then
  pass "minio-init exited with code 0"
else
  fail "minio-init exit code: $MINIO_INIT_EXIT (expected 0)"
fi

echo ""

# ─── AC-9: OTel Collector reachable ──────────────────────────────────────────
echo "AC-9: OTel Collector metrics endpoint"

OTEL_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8889/metrics 2>/dev/null || echo "000")
if [ "$OTEL_CODE" = "200" ]; then
  pass "OTel Collector metrics endpoint (HTTP $OTEL_CODE)"
else
  fail "OTel Collector metrics endpoint returned HTTP $OTEL_CODE (expected 200)"
fi

# Check Prometheus targets for otel-collector job
OTEL_HEALTH=$(curl -s 'http://localhost:9090/api/v1/targets' 2>/dev/null | \
  python3 -c "import sys,json; targets=json.load(sys.stdin)['data']['activeTargets']; otel=[t for t in targets if t['labels'].get('job')=='otel-collector']; print(otel[0]['health'] if otel else 'not_found')" 2>/dev/null || echo "error")
if [ "$OTEL_HEALTH" = "up" ]; then
  pass "otel-collector target is UP in Prometheus"
else
  fail "otel-collector target health: $OTEL_HEALTH (expected 'up')"
fi

echo ""

# ─── Summary ─────────────────────────────────────────────────────────────────
echo "============================================="
echo " Summary"
echo "============================================="
echo -e "  ${GREEN}Passed${NC}: $PASS_COUNT"
echo -e "  ${RED}Failed${NC}: $FAIL_COUNT"
echo -e "  ${YELLOW}Skipped${NC}: $SKIP_COUNT"
echo "  Total:   $TOTAL_CHECKS"
echo ""

if [ "$FAIL_COUNT" -gt 0 ]; then
  echo -e "${RED}SMOKE TEST FAILED${NC}"
  exit 1
else
  echo -e "${GREEN}SMOKE TEST PASSED${NC}"
  exit 0
fi
