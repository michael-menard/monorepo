#!/usr/bin/env bash
#
# KSOT-3020-C / KSOT-3030: Migrate existing filesystem artifacts to KB.
#
# Scans all story directories for _implementation/*.yaml and _pm/*.yaml,
# parses them, and calls kb_write_artifact for each.
#
# Type mapping:
#   EVIDENCE.yaml    → evidence
#   REVIEW.yaml      → review
#   VERIFICATION.yaml → verification
#   CHECKPOINT.yaml  → checkpoint
#   SCOPE.yaml       → scope
#   PLAN.yaml        → plan
#   ELAB.yaml        → elaboration
#
# Usage:
#   ./scripts/migrate-artifacts-to-kb.sh [plan-dir]    # Migrate a specific plan
#   ./scripts/migrate-artifacts-to-kb.sh --all          # Migrate all plans
#   ./scripts/migrate-artifacts-to-kb.sh --dry-run      # Preview only
#

set -eo pipefail

DRY_RUN=false
ALL_PLANS=false
TARGET_PLAN=""

for arg in "$@"; do
  case "$arg" in
    --dry-run)   DRY_RUN=true ;;
    --all)       ALL_PLANS=true ;;
    *)           TARGET_PLAN="$arg" ;;
  esac
done

if [[ -z "$TARGET_PLAN" ]] && ! $ALL_PLANS; then
  echo "Usage: $0 <plan-dir> [--dry-run]"
  echo "       $0 --all [--dry-run]"
  exit 1
fi

# Map filename → artifact type
artifact_type_for() {
  local filename="$1"
  case "$filename" in
    EVIDENCE.yaml)      echo "evidence" ;;
    REVIEW.yaml)        echo "review" ;;
    VERIFICATION.yaml)  echo "verification" ;;
    CHECKPOINT.yaml)    echo "checkpoint" ;;
    SCOPE.yaml)         echo "scope" ;;
    PLAN.yaml)          echo "plan" ;;
    ELAB.yaml)          echo "elaboration" ;;
    GATE-FAILURE.yaml)  echo "gate_failure" ;;
    *)                  echo "" ;;
  esac
}

migrate_story_artifacts() {
  local STORY_DIR="$1"
  local STORY_ID
  STORY_ID=$(basename "$STORY_DIR")
  local migrated=0

  # Scan _implementation/ directory
  for yaml_file in "$STORY_DIR"/_implementation/*.yaml; do
    [[ -f "$yaml_file" ]] || continue
    local filename
    filename=$(basename "$yaml_file")
    local art_type
    art_type=$(artifact_type_for "$filename")
    [[ -z "$art_type" ]] && continue

    if $DRY_RUN; then
      echo "  DRY: $STORY_ID _implementation/$filename → type=$art_type"
    else
      local content
      content=$(cat "$yaml_file" 2>/dev/null) || continue
      timeout 15 env -u CLAUDECODE claude -p \
        "Call kb_write_artifact with story_id='${STORY_ID}', type='${art_type}', content below. Output ONLY: OK or ERROR.
${content}" \
        --allowedTools "mcp__knowledge-base__kb_write_artifact" \
        --output-format text >/dev/null 2>&1 && {
        echo "  OK:  $STORY_ID $filename → $art_type"
      } || {
        echo "  ERR: $STORY_ID $filename → $art_type (KB write failed)"
      }
    fi
    ((migrated++))
  done

  # Scan _pm/ directory
  for yaml_file in "$STORY_DIR"/_pm/*.yaml; do
    [[ -f "$yaml_file" ]] || continue
    local filename
    filename=$(basename "$yaml_file")
    local art_type
    art_type=$(artifact_type_for "$filename")
    [[ -z "$art_type" ]] && continue

    if $DRY_RUN; then
      echo "  DRY: $STORY_ID _pm/$filename → type=$art_type"
    else
      local content
      content=$(cat "$yaml_file" 2>/dev/null) || continue
      timeout 15 env -u CLAUDECODE claude -p \
        "Call kb_write_artifact with story_id='${STORY_ID}', type='${art_type}', content below. Output ONLY: OK or ERROR.
${content}" \
        --allowedTools "mcp__knowledge-base__kb_write_artifact" \
        --output-format text >/dev/null 2>&1 && {
        echo "  OK:  $STORY_ID $filename → $art_type"
      } || {
        echo "  ERR: $STORY_ID $filename → $art_type (KB write failed)"
      }
    fi
    ((migrated++))
  done

  return 0
}

migrate_plan() {
  local PLAN_DIR="$1"
  local total=0

  echo "Migrating artifacts: $PLAN_DIR"

  # Find all story directories (flat layout or stage-based)
  while IFS= read -r -d '' story_dir; do
    local sid
    sid=$(basename "$story_dir")
    echo "$sid" | grep -qE '^[A-Z]+-[0-9]+$' || continue

    # Only process if it has artifact dirs
    if [[ -d "$story_dir/_implementation" ]] || [[ -d "$story_dir/_pm" ]]; then
      migrate_story_artifacts "$story_dir"
      ((total++))
    fi
  done < <(find "$PLAN_DIR" -maxdepth 4 -type d -print0 2>/dev/null | while IFS= read -r -d '' d; do
    local name
    name=$(basename "$d")
    if echo "$name" | grep -qE '^[A-Z]+-[0-9]+$'; then
      printf '%s\0' "$d"
    fi
  done)

  echo "  Total stories with artifacts: $total"
  echo ""
}

if $ALL_PLANS; then
  find plans -name "stories.index.md" -print 2>/dev/null | sort -u | while IFS= read -r idx; do
    migrate_plan "$(dirname "$idx")"
  done
else
  if [[ ! -d "$TARGET_PLAN" ]]; then
    echo "Error: Plan directory not found: $TARGET_PLAN"
    exit 1
  fi
  migrate_plan "$TARGET_PLAN"
fi

echo "Artifact migration complete."
$DRY_RUN && echo "(Dry run — no artifacts were written to KB)"
