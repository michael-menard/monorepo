#!/usr/bin/env bash
#
# Rebrickable MOC Instructions Scraper
# ─────────────────────────────────────────────────────────────────────────────
#
# QUICK START
#   ./run-scrape.sh              # Full scrape — all purchased MOCs
#   ./run-scrape.sh --limit 5    # Test run — first 5 MOCs only
#
# SCRAPE FLAGS
#   --dry-run          Scrape metadata (title, description, images) but skip
#                      file downloads. Useful for cataloguing without storage.
#
#   --headed           Show the browser window. Useful for debugging selectors
#                      or watching the scrape in real time.
#
#   --force            Re-process MOCs that already have a completed checkpoint.
#                      Use when you want to re-download files or refresh metadata.
#
#   --resume           Resume a previously interrupted run (status=interrupted).
#                      Picks up from the last checkpoint within that run.
#                      Does NOT retry download failures from completed runs —
#                      use --retry-failed for that.
#
#   --retry-failed     Retry MOCs where metadata was scraped but the PDF/file
#                      download failed. Queries checkpoint history for MOCs that
#                      reached detail_scraped but never completed. Skips the
#                      purchases-list crawl — goes straight to the known-partial
#                      MOCs. Run this after a session-expiry cascade failure.
#
#   --limit N          Process at most N MOCs. Works with all modes including
#                      --retry-failed (limits the partial MOC list).
#
#   --ignore-robots    Skip robots.txt checks. Use only for testing.
#
# SYNC
#   pnpm scrape:sync-to-gallery
#                      Sync scraped data from the scraper DB → gallery DB.
#                      Reads instructions + parts and upserts into monorepo DB
#                      so the gallery can display scraped MOCs.
#                      Requires: SYNC_USER_ID, SCRAPER_DB_*, GALLERY_DB_* env vars.
#
# COMMON WORKFLOWS
#
#   Full scrape from scratch:
#     ./run-scrape.sh
#
#   Test with 3 MOCs, show browser:
#     ./run-scrape.sh --headed --limit 3
#
#   Resume after Ctrl-C (interrupted run):
#     ./run-scrape.sh --resume
#
#   Retry MOCs where PDF download failed:
#     ./run-scrape.sh --retry-failed
#
#   Re-download everything (ignore past checkpoints):
#     ./run-scrape.sh --force
#
#   Scrape metadata only, then sync to gallery:
#     ./run-scrape.sh --dry-run
#     pnpm scrape:sync-to-gallery
#
# LOGS
#   Written to logs/scrape-YYYYMMDD-HHMMSS.log (also printed to terminal).
#
# SESSION / AUTH NOTES
#   The scraper stores a browser session in data/browser-profile/ and
#   automatically refreshes auth every 45 min to prevent silent AJAX 403s
#   from causing cascade download failures mid-run.
#   If you see repeated "Could not download" errors, check the FAIL step logs:
#     FAIL step 2 — modal never appeared  → likely navigated away / session gone
#     FAIL step 3 — modal has no button   → check modalContent in log for message
#     FAIL step 5 — no download event     → check expireInfo for expired tokens
#
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"
mkdir -p "$LOG_DIR"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="$LOG_DIR/scrape-$TIMESTAMP.log"

echo "=== Rebrickable MOC Scraper ==="
echo "Log: $LOG_FILE"
echo "Args: ${*:-none}"
echo ""

cd "$SCRIPT_DIR"

# Run the scraper, tee output to both terminal and log file
pnpm scrape "$@" 2>&1 | tee "$LOG_FILE"

EXIT_CODE=${PIPESTATUS[0]}

echo ""
if [ "$EXIT_CODE" -eq 0 ]; then
  echo "Scrape completed successfully. Log saved to $LOG_FILE"
else
  echo "Scrape failed (exit code $EXIT_CODE). Check log: $LOG_FILE"
fi

exit "$EXIT_CODE"
