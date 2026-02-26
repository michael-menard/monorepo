#!/usr/bin/env bash
#
# Implement, review, and QA all APIP (autonomous-pipeline) stories.
#
# Picks up stories that have passed elaboration (ready-to-work) and runs
# three separate claude -p calls per story (fresh context each time):
#   1. claude -p "/dev-implement-story ..." → implements the story
#   2. claude -p "/dev-code-review ..."     → reviews the implementation
#   3. claude -p "/qa-verify-story ..."     → QA verification
#
# Runs up to N stories in parallel (default 4, lower than gen/elab because
# implementation is heavier — each story gets a worktree + builds + tests).
#
# Usage:
#   ./scripts/implement-apip-stories.sh                    # Run all ready stories (4 parallel)
#   ./scripts/implement-apip-stories.sh --parallel 2       # Run 2 at a time
#   ./scripts/implement-apip-stories.sh --dry-run          # Print what would run
#   ./scripts/implement-apip-stories.sh --from APIP-1030   # Resume from story
#   ./scripts/implement-apip-stories.sh --impl-only        # Implement only, skip review+QA
#   ./scripts/implement-apip-stories.sh --review-only      # Review + QA only (already implemented)
#   ./scripts/implement-apip-stories.sh --qa-only          # QA only (already reviewed)
#   ./scripts/implement-apip-stories.sh --sequential       # One at a time
#   ./scripts/implement-apip-stories.sh --autonomy moderate  # Set autonomy level
#   ./scripts/implement-apip-stories.sh --skip-worktree    # Pass --skip-worktree to impl
#

set -eo pipefail

# Allow running from within a Claude Code session
unset CLAUDECODE 2>/dev/null || true

FEATURE_DIR="plans/future/platform/autonomous-pipeline"
LOG_DIR="/tmp/apip-impl-logs"
DRY_RUN=false
RESUME_FROM=""
PARALLEL=4
IMPL_ONLY=false
REVIEW_ONLY=false
QA_ONLY=false
AUTONOMY="aggressive"
SKIP_WORKTREE=false

# All tools needed for implement, review, and QA — pre-allow everything
ALLOWED_TOOLS="Read,Write,Edit,Glob,Grep,Bash,Task,mcp__knowledge-base__kb_get,mcp__knowledge-base__kb_search,mcp__knowledge-base__kb_get_story,mcp__knowledge-base__kb_list_stories,mcp__knowledge-base__kb_update_story,mcp__knowledge-base__kb_update_story_status,mcp__knowledge-base__kb_write_artifact,mcp__knowledge-base__kb_read_artifact,mcp__knowledge-base__kb_list_artifacts,mcp__knowledge-base__kb_add,mcp__knowledge-base__kb_list,mcp__knowledge-base__kb_get_related,mcp__knowledge-base__kb_get_plan,mcp__knowledge-base__kb_list_plans,mcp__knowledge-base__kb_log_tokens,mcp__knowledge-base__kb_get_work_state,mcp__knowledge-base__kb_update_work_state,mcp__knowledge-base__kb_get_next_story,mcp__knowledge-base__kb_add_decision,mcp__knowledge-base__kb_add_lesson,mcp__knowledge-base__worktree_register,mcp__knowledge-base__worktree_get_by_story,mcp__knowledge-base__worktree_list_active,mcp__knowledge-base__worktree_mark_complete,mcp__knowledge-base__artifact_search"

# Common claude flags for fully autonomous execution
CLAUDE_FLAGS="--allowedTools $ALLOWED_TOOLS --permission-mode bypassPermissions"

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)        DRY_RUN=true; shift ;;
    --from)           RESUME_FROM="$2"; shift 2 ;;
    --parallel)       PARALLEL="$2"; shift 2 ;;
    --sequential)     PARALLEL=1; shift ;;
    --impl-only)      IMPL_ONLY=true; shift ;;
    --review-only)    REVIEW_ONLY=true; shift ;;
    --qa-only)        QA_ONLY=true; shift ;;
    --autonomy)       AUTONOMY="$2"; shift 2 ;;
    --skip-worktree)  SKIP_WORKTREE=true; shift ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

mkdir -p "$LOG_DIR"

# ── Result tracking via files (safe for subshells) ──────────────────
RESULT_DIR="$LOG_DIR/.results"
rm -rf "$RESULT_DIR"
mkdir -p "$RESULT_DIR"

# Stories in dependency/phase order (same as generate script)
ALL_STORIES=(
  # Phase 0: Foundation
  "APIP-5006"  "APIP-0010"  "APIP-0020"  "APIP-0040"
  "APIP-5001"  "APIP-5007"  "APIP-0030"  "APIP-5000"
  "APIP-5004"  "APIP-5003"
  # Phase 1: Full Worker Graphs
  "APIP-1010"  "APIP-1020"  "APIP-1030"  "APIP-1040"
  "APIP-1050"  "APIP-1060"  "APIP-1070"  "APIP-5005"
  "APIP-5002"
  # Phase 2: Resilience & Monitoring
  "APIP-2010"  "APIP-2020"  "APIP-2030"
  # Phase 3: Learning System & Optimization
  "APIP-3010"  "APIP-3020"  "APIP-3030"  "APIP-3040"
  "APIP-3050"  "APIP-3060"  "APIP-3070"  "APIP-3080"
  "APIP-3090"
  # Phase 4: Long-Term Quality
  "APIP-4010"  "APIP-4020"  "APIP-4030"  "APIP-4040"
  "APIP-4050"  "APIP-4060"  "APIP-4070"
)

# ── Build filtered list: only stories ready for implementation ──────
# A story is ready if it has been elaborated (has _implementation/ or ELAB artifacts)
# and is in ready-to-work/ or backlog/ with elaboration done.
#
# Detection heuristic:
#   - Has story.yaml with acceptance_criteria (generated)
#   - Has _implementation/ dir or ELAB.yaml (elaborated)
#   - NOT already in UAT/ or done/ (already completed)

find_story_dir() {
  local STORY_ID="$1"
  for stage_dir in "$FEATURE_DIR"/ready-to-work "$FEATURE_DIR"/backlog "$FEATURE_DIR"/in-progress "$FEATURE_DIR"/elaboration "$FEATURE_DIR"/ready-for-qa "$FEATURE_DIR"/UAT "$FEATURE_DIR"/needs-code-review; do
    if [[ -d "${stage_dir}/${STORY_ID}" ]]; then
      echo "${stage_dir}/${STORY_ID}"
      return 0
    fi
  done
  return 1
}

is_elaborated() {
  local STORY_DIR="$1"
  # Check for elaboration artifacts
  [[ -d "${STORY_DIR}/_implementation" ]] || [[ -f "${STORY_DIR}/_implementation/ELAB.yaml" ]]
}

is_implemented() {
  local STORY_DIR="$1"
  # Check for evidence of implementation (evidence artifact or source changes)
  [[ -f "${STORY_DIR}/_implementation/EVIDENCE.yaml" ]] || \
    grep -q "in.progress\|ready.for.review\|ready.for.qa" "${STORY_DIR}/story.yaml" 2>/dev/null
}

is_reviewed() {
  local STORY_DIR="$1"
  # Check for review artifact
  [[ -f "${STORY_DIR}/_implementation/REVIEW.yaml" ]]
}

is_completed() {
  local STORY_DIR="$1"
  local STORY_ID="$2"
  # In UAT/ or done/
  [[ -d "$FEATURE_DIR/UAT/${STORY_ID}" ]] || [[ -d "$FEATURE_DIR/done/${STORY_ID}" ]]
}

# ── Filter stories based on mode ────────────────────────────────────
FILTERED_STORIES=()
SKIPPING=true
[[ -z "$RESUME_FROM" ]] && SKIPPING=false

SKIPPED_COUNT=0
NOT_READY_COUNT=0

for STORY_ID in "${ALL_STORIES[@]}"; do
  # Handle --from resume
  if $SKIPPING; then
    if [[ "$STORY_ID" == "$RESUME_FROM" ]]; then
      SKIPPING=false
    else
      ((SKIPPED_COUNT++))
      continue
    fi
  fi

  # Find story directory
  STORY_DIR=$(find_story_dir "$STORY_ID" 2>/dev/null) || true

  if [[ -z "$STORY_DIR" ]]; then
    ((NOT_READY_COUNT++))
    continue
  fi

  # Skip completed stories
  if is_completed "$STORY_DIR" "$STORY_ID"; then
    ((SKIPPED_COUNT++))
    continue
  fi

  # For default mode: must be elaborated
  if ! $REVIEW_ONLY && ! $QA_ONLY; then
    if ! is_elaborated "$STORY_DIR"; then
      ((NOT_READY_COUNT++))
      continue
    fi
  fi

  # For review-only: must be implemented
  if $REVIEW_ONLY; then
    if ! is_implemented "$STORY_DIR"; then
      ((NOT_READY_COUNT++))
      continue
    fi
  fi

  # For qa-only: must be reviewed
  if $QA_ONLY; then
    if ! is_reviewed "$STORY_DIR"; then
      ((NOT_READY_COUNT++))
      continue
    fi
  fi

  FILTERED_STORIES+=("$STORY_ID")
done

TOTAL=${#FILTERED_STORIES[@]}

if [[ $TOTAL -eq 0 ]]; then
  echo "No stories ready for processing."
  echo "  Skipped (--from/done): $SKIPPED_COUNT"
  echo "  Not ready:             $NOT_READY_COUNT"
  echo ""
  echo "Run ./scripts/generate-apip-stories.sh first to generate and elaborate stories."
  exit 0
fi

# Build impl flags
IMPL_FLAGS="--autonomous=$AUTONOMY"
if $SKIP_WORKTREE; then
  IMPL_FLAGS="$IMPL_FLAGS --skip-worktree"
fi

echo "======================================"
echo " APIP Implementation Pipeline"
echo "======================================"
echo " Feature dir:  $FEATURE_DIR"
echo " Ready stories: $TOTAL"
echo " Not ready:    $NOT_READY_COUNT"
echo " Skipped:      $SKIPPED_COUNT"
echo " Parallel:     $PARALLEL"
echo " Autonomy:     $AUTONOMY"
echo " Skip worktree: $SKIP_WORKTREE"
echo " Dry run:      $DRY_RUN"
echo " Impl only:    $IMPL_ONLY"
echo " Review only:  $REVIEW_ONLY"
echo " QA only:      $QA_ONLY"
echo " Logs:         $LOG_DIR/"
echo "======================================"
echo ""
echo "Stories to process:"
for s in "${FILTERED_STORIES[@]}"; do
  echo "  - $s"
done
echo ""

# ── Worker function (runs in subshell for each story) ───────────────
process_story() {
  local STORY_ID="$1"
  local IDX="$2"
  local STATUS_FILE="$RESULT_DIR/${STORY_ID}"
  local IMPL_RESULT="skip"
  local REVIEW_RESULT="skip"
  local QA_RESULT="skip"

  local TAG="[${IDX}/${TOTAL}]"

  # ── Implement ─────────────────────────────────────────────────
  if ! $REVIEW_ONLY && ! $QA_ONLY; then
    local IMPL_LOG="$LOG_DIR/${STORY_ID}-impl.log"

    # Check if already implemented
    local STORY_DIR
    STORY_DIR=$(find_story_dir "$STORY_ID" 2>/dev/null) || true
    if [[ -n "$STORY_DIR" ]] && is_implemented "$STORY_DIR"; then
      IMPL_RESULT="ok"
      echo "$TAG IMPL SKIP:   $STORY_ID (already implemented)"
    else
      echo "$TAG IMPL START:  $STORY_ID"

      if claude -p "/dev-implement-story $FEATURE_DIR $STORY_ID $IMPL_FLAGS" \
           $CLAUDE_FLAGS \
           > "$IMPL_LOG" 2>&1; then
        IMPL_RESULT="ok"
        echo "$TAG IMPL OK:     $STORY_ID"
      else
        IMPL_RESULT="fail"
        echo "$TAG IMPL FAIL:   $STORY_ID (see $IMPL_LOG)"
        echo "impl=$IMPL_RESULT review=skip qa=skip" > "$STATUS_FILE"
        return 1
      fi
    fi
  fi

  # ── Code Review ───────────────────────────────────────────────
  if ! $IMPL_ONLY && ! $QA_ONLY; then
    local REVIEW_LOG="$LOG_DIR/${STORY_ID}-review.log"

    # Check if already reviewed
    local STORY_DIR
    STORY_DIR=$(find_story_dir "$STORY_ID" 2>/dev/null) || true
    if [[ -n "$STORY_DIR" ]] && is_reviewed "$STORY_DIR"; then
      REVIEW_RESULT="ok"
      echo "$TAG REVW SKIP:   $STORY_ID (already reviewed)"
    else
      echo "$TAG REVW START:  $STORY_ID"

      if claude -p "/dev-code-review $FEATURE_DIR $STORY_ID" \
           $CLAUDE_FLAGS \
           > "$REVIEW_LOG" 2>&1; then
        REVIEW_RESULT="ok"
        echo "$TAG REVW OK:     $STORY_ID"
      else
        REVIEW_RESULT="fail"
        echo "$TAG REVW FAIL:   $STORY_ID (see $REVIEW_LOG)"
        # Continue to QA anyway — review failure shouldn't block QA attempt
      fi
    fi
  fi

  # ── QA Verification ──────────────────────────────────────────
  if ! $IMPL_ONLY; then
    local QA_LOG="$LOG_DIR/${STORY_ID}-qa.log"
    echo "$TAG QA   START:  $STORY_ID"

    if claude -p "/qa-verify-story $FEATURE_DIR $STORY_ID" \
         $CLAUDE_FLAGS \
         > "$QA_LOG" 2>&1; then
      QA_RESULT="ok"
      echo "$TAG QA   OK:     $STORY_ID"
    else
      QA_RESULT="fail"
      echo "$TAG QA   FAIL:   $STORY_ID (see $QA_LOG)"
    fi
  fi

  echo "impl=$IMPL_RESULT review=$REVIEW_RESULT qa=$QA_RESULT" > "$STATUS_FILE"
}

# ── Dry run ─────────────────────────────────────────────────────────
if $DRY_RUN; then
  for i in "${!FILTERED_STORIES[@]}"; do
    STORY_ID="${FILTERED_STORIES[$i]}"
    IDX=$((i + 1))
    if ! $REVIEW_ONLY && ! $QA_ONLY; then
      echo "[${IDX}/${TOTAL}] DRY impl:   claude -p '/dev-implement-story $FEATURE_DIR $STORY_ID $IMPL_FLAGS'"
    fi
    if ! $IMPL_ONLY && ! $QA_ONLY; then
      echo "[${IDX}/${TOTAL}] DRY review: claude -p '/dev-code-review $FEATURE_DIR $STORY_ID'"
    fi
    if ! $IMPL_ONLY; then
      echo "[${IDX}/${TOTAL}] DRY qa:     claude -p '/qa-verify-story $FEATURE_DIR $STORY_ID'"
    fi
  done
  echo ""
  echo "Dry run complete. $TOTAL stories would be processed, $PARALLEL at a time."
  exit 0
fi

# ── Parallel execution with job pool ────────────────────────────────
RUNNING_PIDS=()

wait_for_slot() {
  while [[ ${#RUNNING_PIDS[@]} -ge $PARALLEL ]]; do
    local STILL_RUNNING=()
    for pid in "${RUNNING_PIDS[@]}"; do
      if kill -0 "$pid" 2>/dev/null; then
        STILL_RUNNING+=("$pid")
      fi
    done
    RUNNING_PIDS=("${STILL_RUNNING[@]}")
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

  wait_for_slot

  process_story "$STORY_ID" "$IDX" &
  RUNNING_PIDS+=($!)

  # Stagger launches (longer than gen/elab — impl is heavier)
  sleep 3
done

echo ""
echo "All stories launched. Waiting for remaining jobs to complete..."
wait

# ── Collect results ─────────────────────────────────────────────────
IMPL_OK=0; IMPL_FAIL=0
REVIEW_OK=0; REVIEW_FAIL=0
QA_OK=0; QA_FAIL=0
MISSING=0

for STORY_ID in "${FILTERED_STORIES[@]}"; do
  STATUS_FILE="$RESULT_DIR/${STORY_ID}"
  if [[ -f "$STATUS_FILE" ]]; then
    RESULT=$(cat "$STATUS_FILE")
    [[ "$RESULT" == *"impl=ok"* ]]     && ((IMPL_OK++))    || true
    [[ "$RESULT" == *"impl=fail"* ]]   && ((IMPL_FAIL++))  || true
    [[ "$RESULT" == *"review=ok"* ]]   && ((REVIEW_OK++))  || true
    [[ "$RESULT" == *"review=fail"* ]] && ((REVIEW_FAIL++)) || true
    [[ "$RESULT" == *"qa=ok"* ]]       && ((QA_OK++))      || true
    [[ "$RESULT" == *"qa=fail"* ]]     && ((QA_FAIL++))    || true
  else
    ((MISSING++))
  fi
done

echo ""
echo "======================================"
echo " Summary"
echo "======================================"
echo " Total stories:     $TOTAL"
echo " Parallelism:       $PARALLEL"
if ! $REVIEW_ONLY && ! $QA_ONLY; then
  echo " Implement OK:      $IMPL_OK"
  echo " Implement FAILED:  $IMPL_FAIL"
fi
if ! $IMPL_ONLY && ! $QA_ONLY; then
  echo " Review OK:         $REVIEW_OK"
  echo " Review FAILED:     $REVIEW_FAIL"
fi
if ! $IMPL_ONLY; then
  echo " QA OK:             $QA_OK"
  echo " QA FAILED:         $QA_FAIL"
fi
[[ $MISSING -gt 0 ]] && echo " Missing results:   $MISSING"
echo " Logs:              $LOG_DIR/"
echo "======================================"

# ── List failures ───────────────────────────────────────────────────
TOTAL_FAIL=$((IMPL_FAIL + REVIEW_FAIL + QA_FAIL + MISSING))
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
  echo "Retry: $0 --from <STORY_ID>"
  exit 1
fi

echo ""
echo "All stories processed successfully!"
