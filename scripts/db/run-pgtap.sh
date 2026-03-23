#!/usr/bin/env bash
# scripts/db/run-pgtap.sh — pgtap test runner
#
# Discovers and runs all SQL test files via pg_prove from two locations:
#   1. tests/db/                                               (legacy test home)
#   2. apps/api/knowledge-base/src/db/migrations/pgtap/       (story-collocated tests)
# Exits non-zero if any test fails.
#
# Usage:
#   bash scripts/db/run-pgtap.sh               # Run all tests
#   bash scripts/db/run-pgtap.sh --help        # Show this help
#   bash scripts/db/run-pgtap.sh tests/db/triggers/test_set_story_completed_at.sql
#                                              # Run a single test file
#
# Environment variables (set in .env.local — copy from .env.pgtap.example):
#   PGTAP_DB_HOST  (default: localhost)
#   PGTAP_DB_PORT  (default: 5434)
#   PGTAP_DB_USER  (default: pgtap)
#   PGTAP_DB_PASS  (required — no default; set in .env.local or export before running)
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
PGTAP_DB_PASS="${PGTAP_DB_PASS:?PGTAP_DB_PASS must be set — copy .env.pgtap.example to .env.local and load it}"
PGTAP_DB_NAME="${PGTAP_DB_NAME:-pgtap_test}"

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TESTS_DIR="$REPO_ROOT/tests/db"
MIGRATIONS_PGTAP_DIR="$REPO_ROOT/apps/api/knowledge-base/src/db/migrations/pgtap"

# ── Argument handling ─────────────────────────────────────────────────────────
# Allow passing specific test files as arguments; otherwise discover all *.sql
# from both TESTS_DIR and MIGRATIONS_PGTAP_DIR.
TEST_ARRAY=()
if [ $# -gt 0 ]; then
  for f in "$@"; do
    # Reject paths containing ".." (directory traversal)
    if [[ "$f" == *..* ]]; then
      echo "ERROR: Rejected path containing '..': $f"
      exit 1
    fi
    # Resolve to absolute path for prefix check
    abs_f="$(cd "$(dirname "$f")" 2>/dev/null && pwd)/$(basename "$f")"
    # Accept paths that fall under either allowed directory
    if [[ "$abs_f" != "$TESTS_DIR"* ]] && [[ "$abs_f" != "$MIGRATIONS_PGTAP_DIR"* ]]; then
      echo "ERROR: Rejected path outside allowed test directories: $f"
      echo "  Allowed: $TESTS_DIR"
      echo "  Allowed: $MIGRATIONS_PGTAP_DIR"
      exit 1
    fi
    TEST_ARRAY+=("$f")
  done
else
  # Discover all SQL test files from both locations, sorted together.
  # We write NUL-delimited paths to a temp file so the array population
  # happens in the current shell (not a subshell) and persists correctly.
  _tmp_list="$(mktemp)"
  [ -d "$TESTS_DIR" ]            && find "$TESTS_DIR"            -name '*.sql' -print0 >> "$_tmp_list"
  [ -d "$MIGRATIONS_PGTAP_DIR" ] && find "$MIGRATIONS_PGTAP_DIR" -name '*.sql' -print0 >> "$_tmp_list"
  while IFS= read -r -d '' f; do
    TEST_ARRAY+=("$f")
  done < <(sort -z < "$_tmp_list")
  rm -f "$_tmp_list"
fi

if [ ${#TEST_ARRAY[@]} -eq 0 ]; then
  echo "No test files found — nothing to run."
  echo "  Searched: $TESTS_DIR"
  echo "  Searched: $MIGRATIONS_PGTAP_DIR"
  exit 0
fi

echo "=== pgtap test runner ==="
echo "Host:     $PGTAP_DB_HOST:$PGTAP_DB_PORT"
echo "Database: $PGTAP_DB_NAME"
echo "User:     $PGTAP_DB_USER"
echo "Tests:    ${#TEST_ARRAY[@]} file(s) found"
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
# --verbose logs all SQL output; suppress in CI to avoid leaking schema structure
VERBOSE_FLAG=()
if [ "${CI:-}" != "true" ]; then
  VERBOSE_FLAG=(--verbose)
fi

PGPASSWORD="$PGTAP_DB_PASS" pg_prove \
  --host "$PGTAP_DB_HOST" \
  --port "$PGTAP_DB_PORT" \
  --dbname "$PGTAP_DB_NAME" \
  --username "$PGTAP_DB_USER" \
  "${VERBOSE_FLAG[@]}" \
  "${TEST_ARRAY[@]}"
