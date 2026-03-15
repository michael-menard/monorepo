#!/usr/bin/env bash
# scripts/db/run-pgtap.sh — pgtap test runner
#
# Discovers and runs all SQL test files under tests/db/ via pg_prove.
# Exits non-zero if any test fails.
#
# Usage:
#   bash scripts/db/run-pgtap.sh               # Run all tests
#   bash scripts/db/run-pgtap.sh --help        # Show this help
#   bash scripts/db/run-pgtap.sh tests/db/triggers/test_set_story_completed_at.sql
#                                              # Run a single test file
#
# Environment variables (can be set or use defaults for local docker-compose.pgtap.yml):
#   PGTAP_DB_HOST  (default: localhost)
#   PGTAP_DB_PORT  (default: 5434)
#   PGTAP_DB_USER  (default: pgtap)
#   PGTAP_DB_PASS  (default: pgtap)
#   PGTAP_DB_NAME  (default: pgtap_test)
#
# Dependencies:
#   pg_prove — installed inside pgtap-postgres container, OR locally via:
#     macOS:  brew install pgTAP
#     Debian: apt-get install libtap-parser-sourcehandler-pgtap-perl

set -euo pipefail

# ── Help ─────────────────────────────────────────────────────────────────────
if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  sed -n '2,/^[^#]/p' "$0" | grep '^#' | sed 's/^# \?//'
  exit 0
fi

# ── Configuration ─────────────────────────────────────────────────────────────
PGTAP_DB_HOST="${PGTAP_DB_HOST:-localhost}"
PGTAP_DB_PORT="${PGTAP_DB_PORT:-5434}"
PGTAP_DB_USER="${PGTAP_DB_USER:-pgtap}"
PGTAP_DB_PASS="${PGTAP_DB_PASS:-pgtap}"
PGTAP_DB_NAME="${PGTAP_DB_NAME:-pgtap_test}"

TESTS_DIR="$(cd "$(dirname "$0")/../../tests/db" && pwd)"

# ── Argument handling ─────────────────────────────────────────────────────────
# Allow passing specific test files as arguments; otherwise discover all *.sql
if [ $# -gt 0 ]; then
  TEST_FILES="$*"
else
  # Discover all SQL test files recursively under tests/db/
  TEST_FILES="$(find "$TESTS_DIR" -name '*.sql' | sort)"
fi

if [ -z "$TEST_FILES" ]; then
  echo "No test files found under $TESTS_DIR — nothing to run."
  exit 0
fi

echo "=== pgtap test runner ==="
echo "Host:     $PGTAP_DB_HOST:$PGTAP_DB_PORT"
echo "Database: $PGTAP_DB_NAME"
echo "User:     $PGTAP_DB_USER"
echo ""

# ── Check pg_prove is available ───────────────────────────────────────────────
if ! command -v pg_prove >/dev/null 2>&1; then
  echo "ERROR: pg_prove not found in PATH."
  echo "Install options:"
  echo "  macOS:  brew install pgTAP"
  echo "  Debian: apt-get install libtap-parser-sourcehandler-pgtap-perl"
  echo "  Docker: run via docker exec on pgtap-postgres container"
  exit 1
fi

# ── Run tests ─────────────────────────────────────────────────────────────────
PGPASSWORD="$PGTAP_DB_PASS" pg_prove \
  --host "$PGTAP_DB_HOST" \
  --port "$PGTAP_DB_PORT" \
  --dbname "$PGTAP_DB_NAME" \
  --username "$PGTAP_DB_USER" \
  --verbose \
  $TEST_FILES
