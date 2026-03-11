#!/usr/bin/env bash
# migrate-impl-artifacts-to-kb.sh — KSOT-3020
#
# Scans all _implementation/ directories for YAML artifact files and
# imports them into the KB via kb_write_artifact. Idempotent — safe to run
# multiple times (skips existing artifacts).
#
# Usage: bash scripts/migrate-impl-artifacts-to-kb.sh [--dry-run] [--prefix=WISH]
#
# Options:
#   --dry-run    Print what would be imported without actually importing
#   --prefix=X   Only process stories matching this prefix (e.g. WISH)

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

# Map from filename to artifact_type
declare_artifact_type() {
  local filename="$1"
  case "$filename" in
    CHECKPOINT.yaml|CHECKPOINT*.yaml) echo "checkpoint" ;;
    SCOPE.yaml) echo "scope" ;;
    PLAN.yaml|IMPLEMENTATION-PLAN.yaml) echo "plan" ;;
    EVIDENCE.yaml|EVIDENCE.iter*.yaml) echo "evidence" ;;
    REVIEW.yaml|REVIEW.iter*.yaml) echo "review" ;;
    VERIFICATION.yaml|QA-VERIFY.yaml) echo "verification" ;;
    ELAB.yaml) echo "elaboration" ;;
    FIX-SUMMARY.yaml|FIX-SUMMARY*.yaml) echo "fix_summary" ;;
    ANALYSIS.yaml) echo "analysis" ;;
    *) echo "" ;;
  esac
}

extract_story_id() {
  local dir="$1"
  # Extract from path pattern: ...stories/STORY-ID/_implementation/
  echo "$dir" | grep -oE '[A-Z][A-Z0-9]*-[0-9]+' | tail -1 || true
}

log() { echo "[$(date +%H:%M:%S)] $*"; }

log "Scanning for _implementation/ artifact directories..."
log "Dry run: $DRY_RUN"
[[ -n "$PREFIX_FILTER" ]] && log "Prefix filter: $PREFIX_FILTER"

while IFS= read -r impl_dir; do
  story_id=$(extract_story_id "$impl_dir")

  [[ -z "$story_id" ]] && continue
  [[ -n "$PREFIX_FILTER" ]] && [[ "$story_id" != "${PREFIX_FILTER}-"* ]] && continue

  log "Processing: $impl_dir (story: $story_id)"

  while IFS= read -r yaml_file; do
    filename=$(basename "$yaml_file")
    artifact_type=$(declare_artifact_type "$filename")

    [[ -z "$artifact_type" ]] && { log "  SKIP (unknown type): $filename"; continue; }

    if [[ "$DRY_RUN" == "true" ]]; then
      echo "  Would import: $filename → artifact_type=$artifact_type story_id=$story_id"
      IMPORTED=$((IMPORTED + 1))
      continue
    fi

    # Check if artifact already exists in KB
    existing=$(timeout 15 env -u CLAUDECODE claude -p \
      "Call kb_read_artifact with story_id '${story_id}' and artifact_type '${artifact_type}'. Output 'EXISTS' if found, 'NOT_FOUND' if not found." \
      --allowedTools "mcp__knowledge-base__kb_read_artifact" \
      --output-format text 2>/dev/null | grep -oE 'EXISTS|NOT_FOUND' | head -1) || true

    if [[ "$existing" == "EXISTS" ]]; then
      log "  SKIP (already in KB): $filename"
      SKIPPED=$((SKIPPED + 1))
      continue
    fi

    # Read file content and import to KB
    content=$(cat "$yaml_file" 2>/dev/null) || { log "  ERROR: Cannot read $yaml_file"; ERRORS=$((ERRORS + 1)); continue; }

    result=$(timeout 20 env -u CLAUDECODE claude -p \
      "Call kb_write_artifact with story_id '${story_id}', artifact_type '${artifact_type}', and content as JSON object with key 'raw_yaml' containing the following YAML content (truncated to first 2000 chars): ${content:0:2000}. Output 'ok' on success." \
      --allowedTools "mcp__knowledge-base__kb_write_artifact" \
      --output-format text 2>/dev/null) || { log "  ERROR: KB write failed for $yaml_file"; ERRORS=$((ERRORS + 1)); continue; }

    if echo "$result" | grep -q "ok"; then
      log "  IMPORTED: $filename → $artifact_type"
      IMPORTED=$((IMPORTED + 1))
    else
      log "  ERROR: Unexpected result for $yaml_file: $result"
      ERRORS=$((ERRORS + 1))
    fi

  done < <(find "$impl_dir" -maxdepth 1 -name "*.yaml" 2>/dev/null)

done < <(find plans/ -type d -name "_implementation" 2>/dev/null)

echo ""
echo "==============================="
echo "  Migration Summary"
echo "==============================="
echo "  Imported: $IMPORTED"
echo "  Skipped:  $SKIPPED"
echo "  Errors:   $ERRORS"
echo ""

[[ $ERRORS -gt 0 ]] && exit 1 || exit 0
