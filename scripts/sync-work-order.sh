#!/usr/bin/env bash
#
# Sync Work Order — Detect real story states and update WORK-ORDER-BY-BATCH.md
#
# Parses the work order table, runs detect_story_state for each story,
# removes completed stories (UAT/done), and updates Status + Next Command
# columns for stories that have progressed.
#
# Usage:
#   ./scripts/sync-work-order.sh                  # Dry run (default)
#   ./scripts/sync-work-order.sh --dry-run        # Explicit dry run
#   ./scripts/sync-work-order.sh --apply          # Actually modify the file
#   ./scripts/sync-work-order.sh --work-order X   # Custom work order path
#
# All functions are bash 3.2 safe (no associative arrays, no readarray).
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Source libraries
source "$SCRIPT_DIR/lib/work-order-parser.sh"
source "$SCRIPT_DIR/lib/detect-state.sh"

# ── Defaults ──────────────────────────────────────────────────────────
WORK_ORDER="$REPO_ROOT/plans/future/platform/WORK-ORDER-BY-BATCH.md"
DRY_RUN=true
LOCK_DIR=""

# ── Parse arguments ───────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --apply)      DRY_RUN=false; shift ;;
    --dry-run)    DRY_RUN=true; shift ;;
    --work-order) WORK_ORDER="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: $0 [--dry-run|--apply] [--work-order PATH]"
      echo ""
      echo "  --dry-run    Show what would change (default)"
      echo "  --apply      Actually modify the work order file"
      echo "  --work-order Custom path to work order file"
      exit 0
      ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

# ── State → display status mapping ───────────────────────────────────
state_to_wo_status() {
  case "$1" in
    NOT_FOUND)      echo "backlog" ;;
    GENERATED)      echo "backlog" ;;
    ELABORATED)     echo "ready-to-work" ;;
    NEEDS_REVIEW)   echo "needs-code-review" ;;
    FAILED_REVIEW)  echo "failed-code-review" ;;
    READY_FOR_QA)   echo "ready-for-qa" ;;
    FAILED_QA)      echo "failed-qa" ;;
    UAT)            echo "UAT" ;;
    NEEDS_SPLIT)    echo "needs-split" ;;
    *)              echo "unknown" ;;
  esac
}

# ── State → next command mapping ─────────────────────────────────────
state_to_wo_command() {
  local state="$1"
  local feat_dir="$2"
  local story_id="$3"

  case "$state" in
    NOT_FOUND)      echo "/pm-story generate ${feat_dir} ${story_id}" ;;
    GENERATED)      echo "/elab-story ${feat_dir} ${story_id}" ;;
    ELABORATED)     echo "/dev-implement-story ${feat_dir} ${story_id}" ;;
    NEEDS_REVIEW)   echo "/dev-code-review ${feat_dir} ${story_id}" ;;
    FAILED_REVIEW)  echo "/dev-fix-story ${feat_dir} ${story_id}" ;;
    READY_FOR_QA)   echo "/qa-verify-story ${feat_dir} ${story_id}" ;;
    FAILED_QA)      echo "/dev-fix-story ${feat_dir} ${story_id}" ;;
    NEEDS_SPLIT)    echo "# needs-split — manual intervention required" ;;
    *)              echo "# unknown state" ;;
  esac
}

# ── Locking (mkdir-based, POSIX-safe) ────────────────────────────────
LOCK_DIR="/tmp/.wo-sync-lock.d"

wo_lock() {
  local max_wait=30
  local waited=0
  while ! mkdir "$LOCK_DIR" 2>/dev/null; do
    sleep 1
    waited=$((waited + 1))
    if [[ $waited -ge $max_wait ]]; then
      echo "WARN: work order lock timeout after ${max_wait}s, proceeding" >&2
      break
    fi
  done
}

wo_unlock() {
  rmdir "$LOCK_DIR" 2>/dev/null || true
}

# Clean up lock on exit
trap 'wo_unlock' EXIT

# ── Validate inputs ──────────────────────────────────────────────────
if [[ ! -f "$WORK_ORDER" ]]; then
  echo "Error: Work order not found: $WORK_ORDER" >&2
  exit 1
fi

echo "=== Sync Work Order ==="
echo "File: $WORK_ORDER"
echo "Mode: $($DRY_RUN && echo 'DRY RUN' || echo 'APPLY')"
echo ""

# ── Parse work order ─────────────────────────────────────────────────
parse_work_order "$WORK_ORDER"

if [[ ${#WO_STORY_IDS[@]} -eq 0 ]]; then
  echo "No stories found in work order."
  wo_cleanup
  exit 0
fi

echo "Found ${#WO_STORY_IDS[@]} stories in work order."
echo ""

# ── Detect real state for each story ─────────────────────────────────
STORIES_TO_REMOVE=()
STORIES_TO_UPDATE=()    # story_id|new_status|new_command
CHANGES=0

for STORY_ID in "${WO_STORY_IDS[@]}"; do
  FEAT_DIR=$(wo_feature_dir "$STORY_ID")
  WO_STATUS=$(wo_status "$STORY_ID")

  if [[ -z "$FEAT_DIR" ]]; then
    echo "  SKIP  $STORY_ID — no feature dir in work order"
    continue
  fi

  # Detect real state from filesystem
  detect_story_state "$STORY_ID" "$FEAT_DIR"
  REAL_STATE="$DETECTED_STATE"
  REAL_WO_STATUS=$(state_to_wo_status "$REAL_STATE")

  if [[ "$REAL_STATE" == "UAT" ]]; then
    echo "  REMOVE  $STORY_ID — completed (state=$REAL_STATE, was=$WO_STATUS)"
    STORIES_TO_REMOVE+=("$STORY_ID")
    CHANGES=$((CHANGES + 1))
  elif [[ "$REAL_WO_STATUS" != "$WO_STATUS" ]]; then
    NEW_CMD=$(state_to_wo_command "$REAL_STATE" "$FEAT_DIR" "$STORY_ID")
    echo "  UPDATE  $STORY_ID — status: $WO_STATUS → $REAL_WO_STATUS, cmd: $NEW_CMD"
    STORIES_TO_UPDATE+=("${STORY_ID}|${REAL_WO_STATUS}|${NEW_CMD}")
    CHANGES=$((CHANGES + 1))
  else
    echo "  OK      $STORY_ID — status matches ($WO_STATUS)"
  fi
done

echo ""
echo "Summary: $CHANGES change(s) needed."

if [[ $CHANGES -eq 0 ]]; then
  echo "Work order is up to date."
  wo_cleanup
  exit 0
fi

if $DRY_RUN; then
  echo ""
  echo "Run with --apply to make these changes."
  wo_cleanup
  exit 0
fi

# ── Apply changes (with lock) ────────────────────────────────────────
echo ""
echo "Applying changes..."

wo_lock

# Work on a temp copy for atomic replacement
TMP_FILE=$(mktemp /tmp/wo-sync-XXXXXX)
cp "$WORK_ORDER" "$TMP_FILE"

# Pass 1: Remove completed stories
for STORY_ID in "${STORIES_TO_REMOVE[@]}"; do
  FILTERED=$(mktemp /tmp/wo-filter-XXXXXX)
  local_in_story=false

  while IFS= read -r line; do
    if [[ "$line" == *"$STORY_ID"* ]]; then
      local_in_story=true
      continue
    fi
    if $local_in_story; then
      # Check if continuation line (story column empty, still a data row)
      local_story_col=$(echo "$line" | awk -F '│' '{print $3}' 2>/dev/null | xargs) || true
      if [[ -z "$local_story_col" && "$line" == *"│"* && "$line" != *"├"* && "$line" != *"┌"* && "$line" != *"└"* ]]; then
        continue
      fi
      # Separator row right after the story
      if [[ "$line" == *"├"* ]]; then
        local_in_story=false
        continue
      fi
      local_in_story=false
    fi
    echo "$line"
  done < "$TMP_FILE" > "$FILTERED"

  mv "$FILTERED" "$TMP_FILE"
  echo "  Removed: $STORY_ID"
done

# Pass 2: Update status and command columns for progressed stories
for ENTRY in "${STORIES_TO_UPDATE[@]}"; do
  STORY_ID=$(echo "$ENTRY" | cut -d'|' -f1)
  NEW_STATUS=$(echo "$ENTRY" | cut -d'|' -f2)
  NEW_CMD=$(echo "$ENTRY" | cut -d'|' -f3-)

  UPDATED=$(mktemp /tmp/wo-update-XXXXXX)
  local_in_story=false

  while IFS= read -r line; do
    if [[ "$line" == *"$STORY_ID"* && "$line" == *"│"* ]]; then
      # This is the main data row — rewrite Status and Command columns
      # Split into columns, preserve # and Story and Title, replace Status and Command
      local_col1=$(echo "$line" | awk -F '│' '{print $2}')  # #
      local_col2=$(echo "$line" | awk -F '│' '{print $3}')  # Story
      local_col3=$(echo "$line" | awk -F '│' '{print $4}')  # Title
      # Measure original column widths for padding
      local_status_width=${#local_col1}  # reuse width calc
      local_orig_status=$(echo "$line" | awk -F '│' '{print $5}')
      local_orig_cmd=$(echo "$line" | awk -F '│' '{print $6}')
      local_sw=${#local_orig_status}
      local_cw=${#local_orig_cmd}

      # Pad new values to original column widths
      local_padded_status=$(printf "%-${local_sw}s" " $NEW_STATUS")
      local_padded_cmd=$(printf "%-${local_cw}s" " $NEW_CMD")

      echo "│${local_col1}│${local_col2}│${local_col3}│${local_padded_status}│${local_padded_cmd}│"
      local_in_story=true
    elif $local_in_story; then
      # Continuation row — blank out status/command continuation
      local_story_col=$(echo "$line" | awk -F '│' '{print $3}' 2>/dev/null | xargs) || true
      if [[ -z "$local_story_col" && "$line" == *"│"* && "$line" != *"├"* && "$line" != *"┌"* && "$line" != *"└"* ]]; then
        # Continuation line — rewrite with empty status/command
        local_col1=$(echo "$line" | awk -F '│' '{print $2}')
        local_col2=$(echo "$line" | awk -F '│' '{print $3}')
        local_col3=$(echo "$line" | awk -F '│' '{print $4}')
        local_orig_status=$(echo "$line" | awk -F '│' '{print $5}')
        local_orig_cmd=$(echo "$line" | awk -F '│' '{print $6}')
        local_sw=${#local_orig_status}
        local_cw=${#local_orig_cmd}
        local_padded_status=$(printf "%-${local_sw}s" " ")
        local_padded_cmd=$(printf "%-${local_cw}s" " ")
        echo "│${local_col1}│${local_col2}│${local_col3}│${local_padded_status}│${local_padded_cmd}│"
      else
        local_in_story=false
        echo "$line"
      fi
    else
      echo "$line"
    fi
  done < "$TMP_FILE" > "$UPDATED"

  mv "$UPDATED" "$TMP_FILE"
  echo "  Updated: $STORY_ID → $NEW_STATUS"
done

# Atomic replace
mv "$TMP_FILE" "$WORK_ORDER"

wo_unlock

echo ""
echo "Done. Work order updated."

# Cleanup parser cache
wo_cleanup
