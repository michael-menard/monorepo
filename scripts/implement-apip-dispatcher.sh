#!/usr/bin/env bash
#
# APIP Implementation Dispatcher
#
# Watches for stories that become ready (elaborated) and dispatches them
# through implement → review → QA as slots open up. Run this alongside
# the generate-apip-stories.sh script — it picks up stories as they
# finish elaboration and starts implementing immediately.
#
# Usage:
#   ./scripts/implement-apip-dispatcher.sh                  # Watch + dispatch (6 slots)
#   ./scripts/implement-apip-dispatcher.sh --parallel 4     # 4 slots
#   ./scripts/implement-apip-dispatcher.sh --poll 30        # Check every 30s (default 20s)
#   ./scripts/implement-apip-dispatcher.sh --timeout 7200   # Stop after 2 hours
#   ./scripts/implement-apip-dispatcher.sh --dry-run        # Show what would dispatch
#   ./scripts/implement-apip-dispatcher.sh --impl-only      # Implement only, skip review+QA
#   ./scripts/implement-apip-dispatcher.sh --skip-worktree  # No worktrees
#
# Lifecycle:
#   1. Polls FEATURE_DIR every POLL_INTERVAL seconds
#   2. Finds stories that are elaborated but not yet in-flight or done
#   3. Launches up to PARALLEL stories concurrently
#   4. As each finishes, the slot opens for the next ready story
#   5. Exits when all stories are done/failed and nothing is in-flight
#

set -eo pipefail

# Allow running from within a Claude Code session
unset CLAUDECODE 2>/dev/null || true

FEATURE_DIR="plans/future/platform/autonomous-pipeline"
LOG_DIR="/tmp/apip-impl-logs"

# Create log dir early so piping to tee works
mkdir -p "$LOG_DIR"
DRY_RUN=false
PARALLEL=6
POLL_INTERVAL=20
TIMEOUT=0  # 0 = no timeout
IMPL_ONLY=false
QA_ONLY=false
REVIEW_ONLY=false
AUTONOMY="aggressive"
SKIP_WORKTREE=false

# All tools needed — pre-allow everything
ALLOWED_TOOLS="Read,Write,Edit,Glob,Grep,Bash,Task,mcp__knowledge-base__kb_get,mcp__knowledge-base__kb_search,mcp__knowledge-base__kb_get_story,mcp__knowledge-base__kb_list_stories,mcp__knowledge-base__kb_update_story,mcp__knowledge-base__kb_update_story_status,mcp__knowledge-base__kb_write_artifact,mcp__knowledge-base__kb_read_artifact,mcp__knowledge-base__kb_list_artifacts,mcp__knowledge-base__kb_add,mcp__knowledge-base__kb_list,mcp__knowledge-base__kb_get_related,mcp__knowledge-base__kb_get_plan,mcp__knowledge-base__kb_list_plans,mcp__knowledge-base__kb_log_tokens,mcp__knowledge-base__kb_get_work_state,mcp__knowledge-base__kb_update_work_state,mcp__knowledge-base__kb_get_next_story,mcp__knowledge-base__kb_add_decision,mcp__knowledge-base__kb_add_lesson,mcp__knowledge-base__worktree_register,mcp__knowledge-base__worktree_get_by_story,mcp__knowledge-base__worktree_list_active,mcp__knowledge-base__worktree_mark_complete,mcp__knowledge-base__artifact_search"

CLAUDE_FLAGS="--allowedTools $ALLOWED_TOOLS --permission-mode bypassPermissions"

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)        DRY_RUN=true; shift ;;
    --parallel)       PARALLEL="$2"; shift 2 ;;
    --poll)           POLL_INTERVAL="$2"; shift 2 ;;
    --timeout)        TIMEOUT="$2"; shift 2 ;;
    --impl-only)      IMPL_ONLY=true; shift ;;
    --review-only)    REVIEW_ONLY=true; shift ;;
    --qa-only)        QA_ONLY=true; shift ;;
    --autonomy)       AUTONOMY="$2"; shift 2 ;;
    --skip-worktree)  SKIP_WORKTREE=true; shift ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

mkdir -p "$LOG_DIR"

# ── State tracking ──────────────────────────────────────────────────
STATE_DIR="$LOG_DIR/.dispatch-state"
mkdir -p "$STATE_DIR"

# States: pending | in-flight | done | failed
# Written as files: $STATE_DIR/APIP-0010 contains the state

# All known stories
ALL_STORIES=(
  "APIP-5006" "APIP-0010" "APIP-0020" "APIP-0040"
  "APIP-5001" "APIP-5007" "APIP-0030" "APIP-5000"
  "APIP-5004" "APIP-5003"
  "APIP-1010" "APIP-1020" "APIP-1030" "APIP-1040"
  "APIP-1050" "APIP-1060" "APIP-1070" "APIP-5005"
  "APIP-5002"
  "APIP-2010" "APIP-2020" "APIP-2030"
  "APIP-3010" "APIP-3020" "APIP-3030" "APIP-3040"
  "APIP-3050" "APIP-3060" "APIP-3070" "APIP-3080"
  "APIP-3090"
  "APIP-4010" "APIP-4020" "APIP-4030" "APIP-4040"
  "APIP-4050" "APIP-4060" "APIP-4070"
)

TOTAL=${#ALL_STORIES[@]}

# Build impl flags
IMPL_FLAGS="--autonomous=$AUTONOMY"
$SKIP_WORKTREE && IMPL_FLAGS="$IMPL_FLAGS --skip-worktree"

# ── Helper functions ────────────────────────────────────────────────

find_story_dir() {
  local STORY_ID="$1"
  for stage_dir in "$FEATURE_DIR"/ready-to-work "$FEATURE_DIR"/backlog "$FEATURE_DIR"/in-progress "$FEATURE_DIR"/elaboration "$FEATURE_DIR"/ready-for-qa "$FEATURE_DIR"/UAT "$FEATURE_DIR"/needs-code-review "$FEATURE_DIR"/done; do
    if [[ -d "${stage_dir}/${STORY_ID}" ]]; then
      echo "${stage_dir}/${STORY_ID}"
      return 0
    fi
  done
  return 1
}

is_elaborated() {
  local STORY_DIR="$1"
  [[ -d "${STORY_DIR}/_implementation" ]] || [[ -f "${STORY_DIR}/_implementation/ELAB.yaml" ]]
}

is_completed() {
  local STORY_ID="$1"
  [[ -d "$FEATURE_DIR/UAT/${STORY_ID}" ]] || [[ -d "$FEATURE_DIR/done/${STORY_ID}" ]]
}

get_state() {
  local STORY_ID="$1"
  if [[ -f "$STATE_DIR/$STORY_ID" ]]; then
    cat "$STATE_DIR/$STORY_ID"
  else
    echo "pending"
  fi
}

set_state() {
  local STORY_ID="$1"
  local STATE="$2"
  echo "$STATE" > "$STATE_DIR/$STORY_ID"
}

count_in_flight() {
  if [[ ${#RUNNING_PIDS[@]} -gt 0 ]]; then
    echo "${#RUNNING_PIDS[@]}"
  else
    echo "0"
  fi
}

count_by_state() {
  local TARGET_STATE="$1"
  local COUNT=0
  for STORY_ID in "${ALL_STORIES[@]}"; do
    if [[ "$(get_state "$STORY_ID")" == "$TARGET_STATE" ]]; then
      ((COUNT++))
    fi
  done
  echo "$COUNT"
}

# ── Worker function (runs in background for each story) ─────────────
process_story() {
  local STORY_ID="$1"
  local IMPL_RESULT="skip"
  local REVIEW_RESULT="skip"
  local QA_RESULT="skip"

  # ── Implement ─────────────────────────────────────────────────
  if ! $REVIEW_ONLY && ! $QA_ONLY; then
    local IMPL_LOG="$LOG_DIR/${STORY_ID}-impl.log"
    echo "[dispatch] IMPL START:  $STORY_ID"

    if claude -p "/dev-implement-story $FEATURE_DIR $STORY_ID $IMPL_FLAGS" \
         $CLAUDE_FLAGS \
         > "$IMPL_LOG" 2>&1; then
      IMPL_RESULT="ok"
      echo "[dispatch] IMPL OK:     $STORY_ID"
    else
      IMPL_RESULT="fail"
      echo "[dispatch] IMPL FAIL:   $STORY_ID (see $IMPL_LOG)"
      set_state "$STORY_ID" "failed:impl"
      return 1
    fi
  fi

  # ── Code Review ───────────────────────────────────────────────
  if ! $IMPL_ONLY && ! $QA_ONLY; then
    local REVIEW_LOG="$LOG_DIR/${STORY_ID}-review.log"
    echo "[dispatch] REVW START:  $STORY_ID"

    if claude -p "/dev-code-review $FEATURE_DIR $STORY_ID" \
         $CLAUDE_FLAGS \
         > "$REVIEW_LOG" 2>&1; then
      REVIEW_RESULT="ok"
      echo "[dispatch] REVW OK:     $STORY_ID"
    else
      REVIEW_RESULT="fail"
      echo "[dispatch] REVW FAIL:   $STORY_ID (see $REVIEW_LOG)"
      # Continue to QA anyway
    fi
  fi

  # ── QA Verification ──────────────────────────────────────────
  if ! $IMPL_ONLY; then
    local QA_LOG="$LOG_DIR/${STORY_ID}-qa.log"
    echo "[dispatch] QA   START:  $STORY_ID"

    if claude -p "/qa-verify-story $FEATURE_DIR $STORY_ID" \
         $CLAUDE_FLAGS \
         > "$QA_LOG" 2>&1; then
      QA_RESULT="ok"
      echo "[dispatch] QA   OK:     $STORY_ID"
    else
      QA_RESULT="fail"
      echo "[dispatch] QA   FAIL:   $STORY_ID (see $QA_LOG)"
    fi
  fi

  # Record final state
  if [[ "$IMPL_RESULT" == "fail" ]] || [[ "$REVIEW_RESULT" == "fail" ]] || [[ "$QA_RESULT" == "fail" ]]; then
    set_state "$STORY_ID" "failed:impl=$IMPL_RESULT,review=$REVIEW_RESULT,qa=$QA_RESULT"
  else
    set_state "$STORY_ID" "done"
  fi
}

# ── Reaper: clean up finished background jobs ───────────────────────
# Track PIDs in a simple array (bash 3.2 compatible — no associative arrays)
RUNNING_PIDS=()

reap_finished() {
  local STILL_RUNNING=()
  if [[ ${#RUNNING_PIDS[@]} -gt 0 ]]; then
    for pid in "${RUNNING_PIDS[@]}"; do
      if kill -0 "$pid" 2>/dev/null; then
        STILL_RUNNING+=("$pid")
      fi
    done
  fi
  RUNNING_PIDS=()
  if [[ ${#STILL_RUNNING[@]} -gt 0 ]]; then
    RUNNING_PIDS=("${STILL_RUNNING[@]}")
  fi
}

# ── Main dispatch loop ──────────────────────────────────────────────

echo "======================================"
echo " APIP Implementation Dispatcher"
echo "======================================"
echo " Feature dir:   $FEATURE_DIR"
echo " Total stories: $TOTAL"
echo " Parallel:      $PARALLEL"
echo " Poll interval: ${POLL_INTERVAL}s"
echo " Autonomy:      $AUTONOMY"
echo " Skip worktree: $SKIP_WORKTREE"
echo " Impl only:     $IMPL_ONLY"
echo " Review only:   $REVIEW_ONLY"
echo " QA only:       $QA_ONLY"
[[ $TIMEOUT -gt 0 ]] && echo " Timeout:       ${TIMEOUT}s"
echo " Logs:          $LOG_DIR/"
echo "======================================"
echo ""

START_TIME=$(date +%s)
DISPATCH_COUNT=0
IDLE_CYCLES=0
MAX_IDLE_CYCLES=15  # Exit after 15 consecutive idle polls (5 min at 20s interval)

while true; do
  # Check timeout
  if [[ $TIMEOUT -gt 0 ]]; then
    ELAPSED=$(( $(date +%s) - START_TIME ))
    if [[ $ELAPSED -ge $TIMEOUT ]]; then
      echo ""
      echo "[dispatch] TIMEOUT after ${ELAPSED}s"
      break
    fi
  fi

  # Reap finished jobs
  reap_finished

  IN_FLIGHT=$(count_in_flight)
  DONE_COUNT=$(count_by_state "done")
  FAILED_COUNT=0
  for STORY_ID in "${ALL_STORIES[@]}"; do
    [[ "$(get_state "$STORY_ID")" == failed* ]] && ((FAILED_COUNT++)) || true
  done

  # Find stories ready to dispatch
  READY=()
  for STORY_ID in "${ALL_STORIES[@]}"; do
    STATE=$(get_state "$STORY_ID")
    [[ "$STATE" != "pending" ]] && continue

    # Check if story is ready
    STORY_DIR=$(find_story_dir "$STORY_ID" 2>/dev/null) || continue

    # Skip already completed
    is_completed "$STORY_ID" && { set_state "$STORY_ID" "done"; continue; }

    # Check readiness based on mode
    if $REVIEW_ONLY || $QA_ONLY; then
      # For review/qa-only modes, check for implementation artifacts
      [[ -f "${STORY_DIR}/_implementation/EVIDENCE.yaml" ]] || continue
    else
      # Default: needs elaboration
      is_elaborated "$STORY_DIR" || continue
    fi

    READY+=("$STORY_ID")
  done

  AVAILABLE_SLOTS=$(( PARALLEL - IN_FLIGHT ))

  # Status line
  TIMESTAMP=$(date '+%H:%M:%S')
  echo "[$TIMESTAMP] in-flight=$IN_FLIGHT done=$DONE_COUNT failed=$FAILED_COUNT ready=${#READY[@]} slots=$AVAILABLE_SLOTS"

  # Dispatch ready stories into available slots
  DISPATCHED_THIS_CYCLE=0
  for STORY_ID in "${READY[@]}"; do
    [[ $AVAILABLE_SLOTS -le 0 ]] && break

    if $DRY_RUN; then
      echo "  [dry-run] Would dispatch: $STORY_ID"
      ((AVAILABLE_SLOTS--))
      ((DISPATCHED_THIS_CYCLE++))
      continue
    fi

    echo "  -> Dispatching: $STORY_ID"
    set_state "$STORY_ID" "in-flight"

    process_story "$STORY_ID" &
    RUNNING_PIDS+=($!)

    ((AVAILABLE_SLOTS--))
    ((DISPATCH_COUNT++))
    ((DISPATCHED_THIS_CYCLE++))

    # Stagger launches
    sleep 2
  done

  # Check exit conditions
  PENDING_COUNT=$(count_by_state "pending")

  if [[ $IN_FLIGHT -eq 0 ]] && [[ ${#READY[@]} -eq 0 ]] && [[ $PENDING_COUNT -eq 0 ]]; then
    echo ""
    echo "[dispatch] All stories processed. Exiting."
    break
  fi

  if [[ $IN_FLIGHT -eq 0 ]] && [[ ${#READY[@]} -eq 0 ]] && [[ $PENDING_COUNT -gt 0 ]]; then
    ((IDLE_CYCLES++))
    if [[ $IDLE_CYCLES -ge $MAX_IDLE_CYCLES ]]; then
      echo ""
      echo "[dispatch] $PENDING_COUNT stories still pending but none becoming ready."
      echo "[dispatch] Idle for $((IDLE_CYCLES * POLL_INTERVAL))s. Exiting."
      echo "[dispatch] Pending stories may not have been elaborated yet."
      break
    fi
  else
    IDLE_CYCLES=0
  fi

  # Wait before next poll
  sleep "$POLL_INTERVAL"
done

# Wait for any remaining in-flight jobs
IN_FLIGHT=$(count_in_flight)
if [[ $IN_FLIGHT -gt 0 ]]; then
  echo ""
  echo "[dispatch] Waiting for $IN_FLIGHT in-flight stories to finish..."
  wait
fi

# ── Final summary ───────────────────────────────────────────────────
DONE_COUNT=$(count_by_state "done")
FAILED_COUNT=0
FAILED_LIST=()
for STORY_ID in "${ALL_STORIES[@]}"; do
  STATE=$(get_state "$STORY_ID")
  if [[ "$STATE" == failed* ]]; then
    ((FAILED_COUNT++))
    FAILED_LIST+=("$STORY_ID")
  fi
done
PENDING_COUNT=$(count_by_state "pending")

echo ""
echo "======================================"
echo " Dispatcher Summary"
echo "======================================"
echo " Total stories:  $TOTAL"
echo " Dispatched:     $DISPATCH_COUNT"
echo " Done:           $DONE_COUNT"
echo " Failed:         $FAILED_COUNT"
echo " Still pending:  $PENDING_COUNT"
echo " Logs:           $LOG_DIR/"
echo "======================================"

if [[ $FAILED_COUNT -gt 0 ]]; then
  echo ""
  echo "Failed stories:"
  for STORY_ID in "${FAILED_LIST[@]}"; do
    echo "  $STORY_ID: $(get_state "$STORY_ID")"
  done
fi

if [[ $PENDING_COUNT -gt 0 ]]; then
  echo ""
  echo "Pending stories (not yet elaborated):"
  for STORY_ID in "${ALL_STORIES[@]}"; do
    [[ "$(get_state "$STORY_ID")" == "pending" ]] && echo "  $STORY_ID"
  done
fi

[[ $FAILED_COUNT -gt 0 ]] && exit 1
exit 0
