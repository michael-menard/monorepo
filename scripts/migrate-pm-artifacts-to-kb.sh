#!/usr/bin/env bash
# migrate-pm-artifacts-to-kb.sh — KSOT-3030
#
# Scans all _pm/ directories for artifact files and imports them to KB.
# Idempotent — safe to run multiple times.
#
# Usage: bash scripts/migrate-pm-artifacts-to-kb.sh [--dry-run] [--prefix=WISH]

set -euo pipefail

DRY_RUN=false
PREFIX_FILTER=""

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --prefix=*) PREFIX_FILTER="${arg#--prefix=}" ;;
  esac
done

IMPORTED=0
SKIPPED=0
ERRORS=0

declare_artifact_type() {
  local filename="$1"
  case "$filename" in
    STORY-SEED.md) echo "story_seed" ;;
    TEST-PLAN.md|TEST-PLAN.yaml) echo "test_plan" ;;
    DEV-FEASIBILITY.md|DEV-FEASIBILITY.yaml) echo "dev_feasibility" ;;
    UIUX-NOTES.md|UIUX-NOTES.yaml) echo "uiux_notes" ;;
    *) echo "" ;;
  esac
}

extract_story_id() {
  local dir="$1"
  echo "$dir" | grep -oE '[A-Z][A-Z0-9]*-[0-9]+' | tail -1 || true
}

log() { echo "[$(date +%H:%M:%S)] $*"; }

log "Scanning for _pm/ artifact directories..."
log "Dry run: $DRY_RUN"
[[ -n "$PREFIX_FILTER" ]] && log "Prefix filter: $PREFIX_FILTER"

while IFS= read -r pm_dir; do
  story_id=$(extract_story_id "$pm_dir")

  [[ -z "$story_id" ]] && continue
  [[ -n "$PREFIX_FILTER" ]] && [[ "$story_id" != "${PREFIX_FILTER}-"* ]] && continue

  log "Processing: $pm_dir (story: $story_id)"

  while IFS= read -r artifact_file; do
    filename=$(basename "$artifact_file")
    artifact_type=$(declare_artifact_type "$filename")

    [[ -z "$artifact_type" ]] && { log "  SKIP (unknown type): $filename"; continue; }

    if [[ "$DRY_RUN" == "true" ]]; then
      echo "  Would import: $filename → artifact_type=$artifact_type story_id=$story_id"
      IMPORTED=$((IMPORTED + 1))
      continue
    fi

    # Check if already in KB
    existing=$(timeout 15 env -u CLAUDECODE claude -p \
      "Call kb_read_artifact with story_id '${story_id}' and artifact_type '${artifact_type}'. Output 'EXISTS' if found, 'NOT_FOUND' if not found." \
      --allowedTools "mcp__knowledge-base__kb_read_artifact" \
      --output-format text 2>/dev/null | grep -oE 'EXISTS|NOT_FOUND' | head -1) || true

    if [[ "$existing" == "EXISTS" ]]; then
      log "  SKIP (already in KB): $filename"
      SKIPPED=$((SKIPPED + 1))
      continue
    fi

    content=$(cat "$artifact_file" 2>/dev/null) || { log "  ERROR: Cannot read $artifact_file"; ERRORS=$((ERRORS + 1)); continue; }

    result=$(timeout 20 env -u CLAUDECODE claude -p \
      "Call kb_write_artifact with story_id '${story_id}', artifact_type '${artifact_type}', phase 'analysis', and content as JSON object with key 'raw_content' containing this text (first 2000 chars): ${content:0:2000}. Output 'ok' on success." \
      --allowedTools "mcp__knowledge-base__kb_write_artifact" \
      --output-format text 2>/dev/null) || { log "  ERROR: KB write failed for $artifact_file"; ERRORS=$((ERRORS + 1)); continue; }

    if echo "$result" | grep -q "ok"; then
      log "  IMPORTED: $filename → $artifact_type"
      IMPORTED=$((IMPORTED + 1))
    else
      log "  ERROR: Unexpected result: $result"
      ERRORS=$((ERRORS + 1))
    fi

  done < <(find "$pm_dir" -maxdepth 1 \( -name "*.md" -o -name "*.yaml" \) 2>/dev/null)

done < <(find plans/ -type d -name "_pm" 2>/dev/null)

echo ""
echo "==============================="
echo "  PM Artifact Migration Summary"
echo "==============================="
echo "  Imported: $IMPORTED"
echo "  Skipped:  $SKIPPED"
echo "  Errors:   $ERRORS"
echo ""

[[ $ERRORS -gt 0 ]] && exit 1 || exit 0
