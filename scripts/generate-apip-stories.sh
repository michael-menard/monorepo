#!/usr/bin/env bash
#
# Generate and elaborate all APIP (autonomous-pipeline) stories.
#
# Each story gets TWO separate claude -p calls (fresh context each time):
#   1. claude -p "/pm-story generate ..." → creates the story YAML
#   2. claude -p "/elab-story ... --autonomous" → elaborates it
#
# Runs up to N stories in parallel (default 8). Each story's gen+elab
# pair runs sequentially, but multiple stories run concurrently.
#
# Usage:
#   ./scripts/generate-apip-stories.sh                    # Run all (8 parallel)
#   ./scripts/generate-apip-stories.sh --parallel 4       # Run 4 at a time
#   ./scripts/generate-apip-stories.sh --dry-run          # Print commands
#   ./scripts/generate-apip-stories.sh --from APIP-1030   # Resume from story
#   ./scripts/generate-apip-stories.sh --gen-only         # Generate only
#   ./scripts/generate-apip-stories.sh --elab-only        # Elaborate only
#   ./scripts/generate-apip-stories.sh --sequential       # One at a time (old behavior)
#

set -eo pipefail

# Allow running from within a Claude Code session
unset CLAUDECODE 2>/dev/null || true

FEATURE_DIR="plans/future/platform/autonomous-pipeline"
LOG_DIR="/tmp/apip-logs"
DRY_RUN=false
RESUME_FROM=""
PARALLEL=8
GEN_ONLY=false
ELAB_ONLY=false

# All tools that pm-story and elab-story need — pre-allow to prevent prompts
ALLOWED_TOOLS="Read,Write,Edit,Glob,Grep,Bash,Task,mcp__knowledge-base__kb_get,mcp__knowledge-base__kb_search,mcp__knowledge-base__kb_get_story,mcp__knowledge-base__kb_list_stories,mcp__knowledge-base__kb_update_story,mcp__knowledge-base__kb_update_story_status,mcp__knowledge-base__kb_write_artifact,mcp__knowledge-base__kb_read_artifact,mcp__knowledge-base__kb_list_artifacts,mcp__knowledge-base__kb_add,mcp__knowledge-base__kb_list,mcp__knowledge-base__kb_get_related,mcp__knowledge-base__kb_get_plan,mcp__knowledge-base__kb_list_plans,mcp__knowledge-base__kb_log_tokens,mcp__knowledge-base__kb_get_work_state,mcp__knowledge-base__kb_update_work_state,mcp__knowledge-base__kb_get_next_story"

# Common claude flags for fully autonomous execution
CLAUDE_FLAGS="--allowedTools $ALLOWED_TOOLS --permission-mode bypassPermissions"

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)      DRY_RUN=true; shift ;;
    --from)         RESUME_FROM="$2"; shift 2 ;;
    --parallel)     PARALLEL="$2"; shift 2 ;;
    --sequential)   PARALLEL=1; shift ;;
    --gen-only)     GEN_ONLY=true; shift ;;
    --elab-only)    ELAB_ONLY=true; shift ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

mkdir -p "$LOG_DIR"

# ── Result tracking via files (safe for subshells) ──────────────────
RESULT_DIR="$LOG_DIR/.results"
rm -rf "$RESULT_DIR"
mkdir -p "$RESULT_DIR"

# Stories in dependency/phase order
STORIES=(
  # Phase 0: Foundation
  "APIP-5006"  # LangGraph Server Infrastructure Baseline (no deps)
  "APIP-0010"  # Work Queue Table and Repository (no deps)
  "APIP-0020"  # Supervisor Graph (depends: 0010)
  "APIP-0040"  # Model Router v1 (depends: 0010)
  "APIP-5001"  # Test Database Setup (depends: 0010)
  "APIP-5007"  # Database Schema Versioning (depends: 0010)
  "APIP-0030"  # LangGraph Platform Docker Deployment (depends: 0020)
  "APIP-5000"  # Test Infrastructure Setup (depends: 0010, 0020)
  "APIP-5004"  # Secrets Engine (depends: 0040)
  "APIP-5003"  # Security Hardening (depends: 0030)

  # Phase 1: Full Worker Graphs
  "APIP-1010"  # Structurer Node in Elaboration Graph (depends: 0020)
  "APIP-1020"  # Diff Planner Node (depends: 1010)
  "APIP-1030"  # Implementation Graph (depends: 1020, 0040)
  "APIP-1040"  # Documentation Graph (depends: 1030)
  "APIP-1050"  # Review Graph (depends: 1030)
  "APIP-1060"  # QA Graph (depends: 1050)
  "APIP-1070"  # Merge Graph (depends: 1060)
  "APIP-5005"  # Minimal Operator CLI (depends: 0010, 0020, 1070)
  "APIP-5002"  # E2E Test Plan (depends: many Phase 1 stories)

  # Phase 2: Resilience & Monitoring
  "APIP-2010"  # Blocked Queue (depends: 0020)
  "APIP-2020"  # Monitor UI v1 (depends: 2010)
  "APIP-2030"  # Graceful Shutdown (depends: 0030)

  # Phase 3: Learning System & Optimization
  "APIP-3010"  # Change Telemetry (depends: 1030)
  "APIP-3020"  # Model Affinity Profiles (depends: 3010)
  "APIP-3030"  # Learning-Aware Diff Planner (depends: 3020, 1020)
  "APIP-3040"  # Learning-Aware Model Router (depends: 3020, 0040)
  "APIP-3050"  # Story Structurer Feedback (depends: 3020, 1010)
  "APIP-3060"  # Bake-Off Engine (depends: 3020)
  "APIP-3070"  # Cold Start Bootstrapping (depends: 3040)
  "APIP-3080"  # Parallel Story Concurrency (depends: 0020, 0040)
  "APIP-3090"  # Cron Job Infrastructure (depends: 0030, 3020)

  # Phase 4: Long-Term Quality
  "APIP-4010"  # Codebase Health Gate (depends: 1070, 3090)
  "APIP-4020"  # Cohesion Scanner (depends: 4010)
  "APIP-4030"  # Dependency Auditor (depends: 2010)
  "APIP-4040"  # Test Quality Monitor (depends: 3090)
  "APIP-4050"  # Dead Code Reaper (depends: 3090)
  "APIP-4060"  # KB Freshness Check (depends: 3090)
  "APIP-4070"  # Weekly Pipeline Health Report (depends: 4010, 3020, 2010)
)

# ── Build filtered list (handle --from) ─────────────────────────────
FILTERED_STORIES=()
SKIPPING=true
[[ -z "$RESUME_FROM" ]] && SKIPPING=false

SKIPPED_COUNT=0
for STORY_ID in "${STORIES[@]}"; do
  if $SKIPPING; then
    if [[ "$STORY_ID" == "$RESUME_FROM" ]]; then
      SKIPPING=false
    else
      ((SKIPPED_COUNT++))
      continue
    fi
  fi
  FILTERED_STORIES+=("$STORY_ID")
done

TOTAL=${#FILTERED_STORIES[@]}

echo "======================================"
echo " APIP Story Generation + Elaboration"
echo "======================================"
echo " Feature dir:  $FEATURE_DIR"
echo " Total stories: $TOTAL (skipped: $SKIPPED_COUNT)"
echo " Parallel:     $PARALLEL"
echo " Dry run:      $DRY_RUN"
echo " Gen only:     $GEN_ONLY"
echo " Elab only:    $ELAB_ONLY"
[[ -n "$RESUME_FROM" ]] && echo " Resuming from: $RESUME_FROM"
echo " Logs:         $LOG_DIR/"
echo "======================================"
echo ""

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
  for stage_dir in "$FEATURE_DIR"/backlog "$FEATURE_DIR"/in-progress "$FEATURE_DIR"/ready-to-work "$FEATURE_DIR"/elaboration "$FEATURE_DIR"/ready-for-qa "$FEATURE_DIR"/UAT; do
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

      if claude -p "/pm-story generate $FEATURE_DIR $STORY_ID" \
           $CLAUDE_FLAGS \
           > "$GEN_LOG" 2>&1; then
        GEN_RESULT="ok"
        echo "[${IDX}/${TOTAL}] GEN  OK:    $STORY_ID"
      else
        GEN_RESULT="fail"
        echo "[${IDX}/${TOTAL}] GEN  FAIL:  $STORY_ID (see $GEN_LOG)"
        # Write result and bail — skip elab if gen failed
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

      if claude -p "/elab-story $FEATURE_DIR $STORY_ID --autonomous" \
           $CLAUDE_FLAGS \
           > "$ELAB_LOG" 2>&1; then
        ELAB_RESULT="ok"
        echo "[${IDX}/${TOTAL}] ELAB OK:    $STORY_ID"
      else
        ELAB_RESULT="fail"
        echo "[${IDX}/${TOTAL}] ELAB FAIL:  $STORY_ID (see $ELAB_LOG)"
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

echo ""
echo "======================================"
echo " Summary"
echo "======================================"
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
  echo "Retry failed stories with: $0 --from <STORY_ID>"
  exit 1
fi

echo ""
echo "All stories processed successfully!"
