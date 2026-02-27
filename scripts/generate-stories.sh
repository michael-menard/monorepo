#!/usr/bin/env bash
#
# Generate and elaborate all stories for a given plan.
#
# Each story gets TWO separate claude -p calls (fresh context each time):
#   1. claude -p "/pm-story generate ..." → creates the story YAML
#   2. claude -p "/elab-story ... --autonomous" → elaborates it
#
# Runs up to N stories in parallel (default 8). Each story's gen+elab
# pair runs sequentially, but multiple stories run concurrently.
#
# Stories are discovered from the plan's stories.index.md in phase order.
#
# Usage:
#   ./scripts/generate-stories.sh <plan-slug>                     # Run all (8 parallel)
#   ./scripts/generate-stories.sh <plan-slug> --parallel 4        # Run 4 at a time
#   ./scripts/generate-stories.sh <plan-slug> --dry-run           # Print commands
#   ./scripts/generate-stories.sh <plan-slug> --from APIP-1030    # Resume from story
#   ./scripts/generate-stories.sh <plan-slug> --gen-only          # Generate only
#   ./scripts/generate-stories.sh <plan-slug> --elab-only         # Elaborate only
#   ./scripts/generate-stories.sh <plan-slug> --sequential        # One at a time (old behavior)
#   ./scripts/generate-stories.sh <plan-slug> --only APIP-2010,APIP-2020  # Retry specific stories
#
# The plan-slug can be either:
#   - A slug name (e.g., "autonomous-pipeline") — resolved via stories.index.md
#   - A direct feature dir path (e.g., "plans/future/platform/autonomous-pipeline")
#

set -eo pipefail

# Allow running from within a Claude Code session
unset CLAUDECODE 2>/dev/null || true

# ── Resolve plan slug → FEATURE_DIR ─────────────────────────────────
PLAN_SLUG=""
FEATURE_DIR=""
POSITIONAL_ARGS=()

# Extract first positional arg as plan slug, pass rest through
for arg in "$@"; do
  if [[ -z "$PLAN_SLUG" ]] && [[ "$arg" != --* ]]; then
    PLAN_SLUG="$arg"
  else
    POSITIONAL_ARGS+=("$arg")
  fi
done

if [[ -z "$PLAN_SLUG" ]]; then
  echo "Usage: $0 <plan-slug> [options]"
  echo ""
  echo "  plan-slug: Plan slug (e.g., 'autonomous-pipeline') or feature dir path"
  echo ""
  echo "Options:"
  echo "  --parallel N      Run N stories in parallel (default 8)"
  echo "  --sequential      Run one at a time"
  echo "  --dry-run         Print commands without running"
  echo "  --from STORY-ID   Resume from a specific story"
  echo "  --gen-only        Generate only, skip elaboration"
  echo "  --elab-only       Elaborate only, skip generation"
  echo "  --only ID,ID,...  Process only specific stories"
  exit 1
fi

source "$(dirname "$0")/lib/resolve-plan.sh"
resolve_plan "$PLAN_SLUG"

LOG_DIR="/tmp/${PLAN_SLUG}-logs"
DRY_RUN=false
RESUME_FROM=""
PARALLEL=8
GEN_ONLY=false
ELAB_ONLY=false
ONLY_LIST=""

# All tools that pm-story and elab-story need — pre-allow to prevent prompts
ALLOWED_TOOLS="Read,Write,Edit,Glob,Grep,Bash,Task,mcp__knowledge-base__kb_get,mcp__knowledge-base__kb_search,mcp__knowledge-base__kb_get_story,mcp__knowledge-base__kb_list_stories,mcp__knowledge-base__kb_update_story,mcp__knowledge-base__kb_update_story_status,mcp__knowledge-base__kb_write_artifact,mcp__knowledge-base__kb_read_artifact,mcp__knowledge-base__kb_list_artifacts,mcp__knowledge-base__kb_add,mcp__knowledge-base__kb_list,mcp__knowledge-base__kb_get_related,mcp__knowledge-base__kb_get_plan,mcp__knowledge-base__kb_list_plans,mcp__knowledge-base__kb_log_tokens,mcp__knowledge-base__kb_get_work_state,mcp__knowledge-base__kb_update_work_state,mcp__knowledge-base__kb_get_next_story"

# Common claude flags for fully autonomous execution
CLAUDE_FLAGS="--allowedTools $ALLOWED_TOOLS --permission-mode bypassPermissions"

# Parse args
set -- "${POSITIONAL_ARGS[@]}"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)      DRY_RUN=true; shift ;;
    --from)         RESUME_FROM="$2"; shift 2 ;;
    --parallel)     PARALLEL="$2"; shift 2 ;;
    --sequential)   PARALLEL=1; shift ;;
    --gen-only)     GEN_ONLY=true; shift ;;
    --elab-only)    ELAB_ONLY=true; shift ;;
    --only)         ONLY_LIST="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

mkdir -p "$LOG_DIR"

# ── Result tracking via files (safe for subshells) ──────────────────
RESULT_DIR="$LOG_DIR/.results"
rm -rf "$RESULT_DIR"
mkdir -p "$RESULT_DIR"

# ── Discover stories (from index file or KB) ────────────────────────
DISCOVERED_STORIES=()
discover_stories
STORIES=("${DISCOVERED_STORIES[@]}")

# ── Build --only set (comma-separated → lookup string) ───────────────
ONLY_SET=""
if [[ -n "$ONLY_LIST" ]]; then
  ONLY_SET=",$ONLY_LIST,"
fi

# ── Build filtered list (handle --from and --only) ───────────────────
FILTERED_STORIES=()
SKIPPING=true
[[ -z "$RESUME_FROM" ]] && SKIPPING=false

SKIPPED_COUNT=0

FILTER_LOG="$LOG_DIR/filter.log"
{
  echo "=== Filter Log ==="
  echo "Timestamp: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo "Mode: gen_only=$GEN_ONLY elab_only=$ELAB_ONLY"
  echo "Resume from: ${RESUME_FROM:-<none>}"
  echo "Only list: ${ONLY_LIST:-<none>}"
  echo "Total stories in index: ${#STORIES[@]}"
  echo "---"
} > "$FILTER_LOG"

for STORY_ID in "${STORIES[@]}"; do
  if $SKIPPING; then
    if [[ "$STORY_ID" == "$RESUME_FROM" ]]; then
      SKIPPING=false
    else
      ((SKIPPED_COUNT++))
      echo "SKIP $STORY_ID reason=before-resume-point" >> "$FILTER_LOG"
      continue
    fi
  fi
  # If --only is set, skip stories not in the list
  if [[ -n "$ONLY_SET" ]] && [[ "$ONLY_SET" != *",$STORY_ID,"* ]]; then
    ((SKIPPED_COUNT++))
    echo "SKIP $STORY_ID reason=not-in-only-list" >> "$FILTER_LOG"
    continue
  fi
  echo "INCLUDE $STORY_ID" >> "$FILTER_LOG"
  FILTERED_STORIES+=("$STORY_ID")
done

TOTAL=${#FILTERED_STORIES[@]}

echo "======================================"
echo " Story Generation + Elaboration"
echo "======================================"
echo " Plan slug:    $PLAN_SLUG"
echo " Feature dir:  $FEATURE_DIR"
echo " Total stories: $TOTAL (skipped: $SKIPPED_COUNT)"
echo " Parallel:     $PARALLEL"
echo " Dry run:      $DRY_RUN"
echo " Gen only:     $GEN_ONLY"
echo " Elab only:    $ELAB_ONLY"
[[ -n "$ONLY_LIST" ]]   && echo " Only:         $ONLY_LIST"
[[ -n "$RESUME_FROM" ]] && echo " Resuming from: $RESUME_FROM"
echo " Logs:         $LOG_DIR/"
echo "======================================"
echo ""

# ── Persist run metadata ──────────────────────────────────────────────
RUN_LOG="$LOG_DIR/run.log"
{
  echo "=== Run Log ==="
  echo "Start: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo "Plan slug: $PLAN_SLUG"
  echo "Feature dir: $FEATURE_DIR"
  echo "Mode: gen_only=$GEN_ONLY elab_only=$ELAB_ONLY"
  echo "Parallel: $PARALLEL"
  echo "Dry run: $DRY_RUN"
  [[ -n "$ONLY_LIST" ]] && echo "Only: $ONLY_LIST"
  [[ -n "$RESUME_FROM" ]] && echo "Resume from: $RESUME_FROM"
  echo "Total stories: $TOTAL"
  echo "Skipped: $SKIPPED_COUNT"
  echo "---"
  echo "Stories to process:"
  for s in "${FILTERED_STORIES[@]}"; do
    echo "  - $s"
  done
  echo "---"
} > "$RUN_LOG"

check_log_for_failure() {
  local LOG_FILE="$1"
  local PHASE="$2"
  if [[ ! -f "$LOG_FILE" ]]; then
    echo "FAIL:signal:no-log-file"
    return 0
  fi
  local MATCH
  MATCH=$(grep -oEi "HARD STOP|SETUP BLOCKED|Phase 0 Validation Failed|cannot proceed|PLANNING BLOCKED|PLANNING FAILED|EXECUTION BLOCKED|DOCUMENTATION BLOCKED" "$LOG_FILE" | head -1) || true
  if [[ -n "$MATCH" ]]; then
    echo "FAIL:signal:$MATCH"
  else
    echo "OK"
  fi
}

# ── Worker function (runs in subshell for each story) ───────────────
process_story() {
  local STORY_ID="$1"
  local IDX="$2"
  local STATUS_FILE="$RESULT_DIR/${STORY_ID}"
  local GEN_RESULT="skip"
  local ELAB_RESULT="skip"

  # ── Detect story state ──────────────────────────────────────────
  # Find story directory across all stage folders (backlog/, in-progress/, etc.)
  local STORY_DIR=""
  for stage_dir in "$FEATURE_DIR"/backlog "$FEATURE_DIR"/in-progress "$FEATURE_DIR"/ready-to-work "$FEATURE_DIR"/elaboration "$FEATURE_DIR"/needs-code-review "$FEATURE_DIR"/ready-for-qa "$FEATURE_DIR"/failed-code-review "$FEATURE_DIR"/failed-qa "$FEATURE_DIR"/UAT "$FEATURE_DIR"/done; do
    if [[ -d "${stage_dir}/${STORY_ID}" ]]; then
      STORY_DIR="${stage_dir}/${STORY_ID}"
      break
    fi
  done

  # Check if story.yaml has acceptance_criteria (indicates full generation done)
  local ALREADY_GENERATED=false
  if [[ -n "$STORY_DIR" ]] && [[ -f "${STORY_DIR}/story.yaml" ]]; then
    if grep -q "acceptance_criteria" "${STORY_DIR}/story.yaml" 2>/dev/null; then
      ALREADY_GENERATED=true
    fi
  fi

  # Check if _implementation/ or ELAB.yaml exists (indicates elaboration done)
  local ALREADY_ELABORATED=false
  if [[ -n "$STORY_DIR" ]]; then
    if [[ -d "${STORY_DIR}/_implementation" ]] || [[ -f "${STORY_DIR}/_implementation/ELAB.yaml" ]]; then
      ALREADY_ELABORATED=true
    fi
  fi

  # ── Generate ────────────────────────────────────────────────────
  if ! $ELAB_ONLY; then
    local GEN_LOG="$LOG_DIR/${STORY_ID}-gen.log"

    if $ALREADY_GENERATED; then
      GEN_RESULT="ok"
      echo "[${IDX}/${TOTAL}] GEN  SKIP:  $STORY_ID (already generated)"
    else
      echo "[${IDX}/${TOTAL}] GEN  START: $STORY_ID"

      claude -p "/pm-story generate $FEATURE_DIR $STORY_ID" \
           $CLAUDE_FLAGS \
           > "$GEN_LOG" 2>&1 || true

      local LOG_CHECK
      LOG_CHECK=$(check_log_for_failure "$GEN_LOG" "generate")
      if [[ "$LOG_CHECK" == "OK" ]]; then
        GEN_RESULT="ok"
        echo "[${IDX}/${TOTAL}] GEN  OK:    $STORY_ID"
      else
        GEN_RESULT="fail"
        echo "[${IDX}/${TOTAL}] GEN  FAIL:  $STORY_ID ($LOG_CHECK) (see $GEN_LOG)"
        echo "gen=$GEN_RESULT elab=skip" > "$STATUS_FILE"
        return 1
      fi
    fi
  fi

  # ── Elaborate ───────────────────────────────────────────────────
  if ! $GEN_ONLY; then
    local ELAB_LOG="$LOG_DIR/${STORY_ID}-elab.log"

    if $ALREADY_ELABORATED; then
      ELAB_RESULT="ok"
      echo "[${IDX}/${TOTAL}] ELAB SKIP:  $STORY_ID (already elaborated)"
    else
      echo "[${IDX}/${TOTAL}] ELAB START: $STORY_ID"

      claude -p "/elab-story $FEATURE_DIR $STORY_ID --autonomous" \
           $CLAUDE_FLAGS \
           > "$ELAB_LOG" 2>&1 || true

      local LOG_CHECK
      LOG_CHECK=$(check_log_for_failure "$ELAB_LOG" "elaborate")
      if [[ "$LOG_CHECK" == "OK" ]]; then
        ELAB_RESULT="ok"
        echo "[${IDX}/${TOTAL}] ELAB OK:    $STORY_ID"
      else
        ELAB_RESULT="fail"
        echo "[${IDX}/${TOTAL}] ELAB FAIL:  $STORY_ID ($LOG_CHECK) (see $ELAB_LOG)"
      fi
    fi
  fi

  echo "gen=$GEN_RESULT elab=$ELAB_RESULT" > "$STATUS_FILE"
}

# ── Dry run ─────────────────────────────────────────────────────────
if $DRY_RUN; then
  for i in "${!FILTERED_STORIES[@]}"; do
    STORY_ID="${FILTERED_STORIES[$i]}"
    IDX=$((i + 1))
    if ! $ELAB_ONLY; then
      echo "[${IDX}/${TOTAL}] DRY gen:  claude -p '/pm-story generate $FEATURE_DIR $STORY_ID'"
    fi
    if ! $GEN_ONLY; then
      echo "[${IDX}/${TOTAL}] DRY elab: claude -p '/elab-story $FEATURE_DIR $STORY_ID --autonomous'"
    fi
  done
  echo ""
  echo "Dry run complete. $TOTAL stories would be processed, $PARALLEL at a time."
  exit 0
fi

# ── Parallel execution with job pool ────────────────────────────────
RUNNING_PIDS=()

wait_for_slot() {
  # Wait until we have fewer than $PARALLEL jobs running
  while [[ ${#RUNNING_PIDS[@]} -ge $PARALLEL ]]; do
    # Check which PIDs are still alive
    local STILL_RUNNING=()
    for pid in "${RUNNING_PIDS[@]}"; do
      if kill -0 "$pid" 2>/dev/null; then
        STILL_RUNNING+=("$pid")
      fi
    done
    RUNNING_PIDS=("${STILL_RUNNING[@]}")

    # If still full, sleep briefly and check again
    if [[ ${#RUNNING_PIDS[@]} -ge $PARALLEL ]]; then
      sleep 2
    fi
  done
}

echo "Starting $TOTAL stories with parallelism=$PARALLEL..."
echo ""

for i in "${!FILTERED_STORIES[@]}"; do
  STORY_ID="${FILTERED_STORIES[$i]}"
  IDX=$((i + 1))

  # Wait for a slot to open up
  wait_for_slot

  # Launch story processing in background
  process_story "$STORY_ID" "$IDX" &
  RUNNING_PIDS+=($!)

  # Stagger launches slightly to avoid thundering herd on API
  sleep 1
done

# Wait for all remaining jobs to finish
echo ""
echo "All stories launched. Waiting for remaining jobs to complete..."
wait

# ── Collect results ─────────────────────────────────────────────────
GEN_OK=0
GEN_FAIL=0
ELAB_OK=0
ELAB_FAIL=0
MISSING=0

for STORY_ID in "${FILTERED_STORIES[@]}"; do
  STATUS_FILE="$RESULT_DIR/${STORY_ID}"
  if [[ -f "$STATUS_FILE" ]]; then
    RESULT=$(cat "$STATUS_FILE")
    [[ "$RESULT" == *"gen=ok"* ]]   && ((GEN_OK++))   || true
    [[ "$RESULT" == *"gen=fail"* ]] && ((GEN_FAIL++))  || true
    [[ "$RESULT" == *"elab=ok"* ]]   && ((ELAB_OK++))  || true
    [[ "$RESULT" == *"elab=fail"* ]] && ((ELAB_FAIL++)) || true
  else
    ((MISSING++))
  fi
done

# ── Append final summary to run.log ────────────────────────────────
{
  echo ""
  echo "=== Final Summary ==="
  echo "End: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo "Generate OK: $GEN_OK  FAIL: $GEN_FAIL"
  echo "Elaborate OK: $ELAB_OK  FAIL: $ELAB_FAIL"
  echo "Missing: $MISSING"
  echo "---"
  echo "Per-story results:"
  for SID in "${FILTERED_STORIES[@]}"; do
    local_sf="$RESULT_DIR/${SID}"
    if [[ -f "$local_sf" ]]; then
      echo "  $SID: $(cat "$local_sf")"
    else
      echo "  $SID: no result (crashed?)"
    fi
  done
} >> "$RUN_LOG"

echo ""
echo "======================================"
echo " Summary"
echo "======================================"
echo " Plan:             $PLAN_SLUG"
echo " Total stories:    $TOTAL"
echo " Parallelism:      $PARALLEL"
echo " Skipped (--from): $SKIPPED_COUNT"
if ! $ELAB_ONLY; then
  echo " Generate OK:      $GEN_OK"
  echo " Generate FAILED:  $GEN_FAIL"
fi
if ! $GEN_ONLY; then
  echo " Elaborate OK:     $ELAB_OK"
  echo " Elaborate FAILED: $ELAB_FAIL"
fi
[[ $MISSING -gt 0 ]] && echo " Missing results:  $MISSING"
echo " Logs:             $LOG_DIR/"
echo "======================================"

# ── List failures ───────────────────────────────────────────────────
TOTAL_FAIL=$((GEN_FAIL + ELAB_FAIL + MISSING))
if [[ $TOTAL_FAIL -gt 0 ]]; then
  echo ""
  echo "Failed stories:"
  for STORY_ID in "${FILTERED_STORIES[@]}"; do
    STATUS_FILE="$RESULT_DIR/${STORY_ID}"
    if [[ -f "$STATUS_FILE" ]]; then
      RESULT=$(cat "$STATUS_FILE")
      if [[ "$RESULT" == *"fail"* ]]; then
        echo "  $STORY_ID: $RESULT"
      fi
    else
      echo "  $STORY_ID: no result (crashed?)"
    fi
  done
  echo ""
  echo "Retry failed stories with: $0 $PLAN_SLUG --from <STORY_ID>"
  exit 1
fi

echo ""
echo "All stories processed successfully!"
