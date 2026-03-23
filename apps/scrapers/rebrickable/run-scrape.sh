#!/usr/bin/env bash
#
# Rebrickable MOC Instructions Scraper
#
# Usage:
#   ./run-scrape.sh              # Full scrape, all pages
#   ./run-scrape.sh --limit 5    # First 5 MOCs only
#   ./run-scrape.sh --force      # Re-download already completed MOCs
#   ./run-scrape.sh --resume     # Resume an interrupted run
#   ./run-scrape.sh --headed     # Show browser window
#   ./run-scrape.sh --dry-run    # Scrape metadata only, no downloads
#
# All flags are passed through to the scraper CLI.
# Logs are written to logs/ with timestamps. The scraper checkpoints
# progress per-MOC, so interrupted runs can be resumed with --resume.

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
