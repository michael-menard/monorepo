#!/usr/bin/env bash
#
# Unified Story Orchestrator — One script to rule them all.
#
# Reads a work order (cross-plan: WINT, KBAR, TELE, AUDT, etc.), detects
# each story's REAL state via filesystem artifacts + KB cache, and drives
# every story from wherever it is to UAT — handling errors, missing
# artifacts, and wrong states automatically.
#
# State machine per story:
#   NOT_FOUND       → /pm-story generate        → GENERATED
#   GENERATED       → /elab-story --autonomous   → ELABORATED
#   ELABORATED      → /dev-implement-story       → NEEDS_REVIEW
#   NEEDS_REVIEW    → /dev-code-review           → READY_FOR_QA | FAILED_REVIEW
#   FAILED_REVIEW   → /dev-fix-story             → NEEDS_REVIEW (retry--)
#   READY_FOR_QA    → /qa-verify-story           → UAT | FAILED_QA
#   FAILED_QA       → /dev-fix-story             → READY_FOR_QA (retry--)
#   UAT / DONE      → skip
#
# Self-healing:
#   - Artifacts over directories: if stage says "review" but no EVIDENCE.yaml,
#     state is really ELABORATED and we re-implement.
#   - Duplicate stage dirs: keep most-progressed copy with valid artifacts.
#   - KB vs filesystem mismatch: trust filesystem artifacts, log discrepancy.
#   - Empty logs / agent crashes: count as failure, retry if budget allows.
#   - needs-split stories: skip with clear message.
#
# Usage:
#   ./scripts/orchestrate-stories.sh                                # Run all (3 parallel)
#   ./scripts/orchestrate-stories.sh --parallel 5                   # 5 at a time
#   ./scripts/orchestrate-stories.sh --dry-run                      # Show detected states
#   ./scripts/orchestrate-stories.sh --only WINT-0040,KBAR-0190    # Specific stories
#   ./scripts/orchestrate-stories.sh --from WINT-0040               # Resume from row
#   ./scripts/orchestrate-stories.sh --max-retries 2                # More retry budget
#   ./scripts/orchestrate-stories.sh --work-order path/to/file.md   # Custom work order
#   ./scripts/orchestrate-stories.sh --autonomy moderate            # Pass to dev agents
#   ./scripts/orchestrate-stories.sh --plan code-audit --dry-run    # All stories for a plan
#

set -eo pipefail

# Allow running from within a Claude Code session
unset CLAUDECODE 2>/dev/null || true

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Source shared libraries ──────────────────────────────────────────
source "$SCRIPT_DIR/lib/work-order-parser.sh"
source "$SCRIPT_DIR/lib/detect-state.sh"
source "$SCRIPT_DIR/lib/kb-cache.sh"

# ── Defaults ─────────────────────────────────────────────────────────
WORK_ORDER="$REPO_ROOT/plans/future/platform/WORK-ORDER-BY-BATCH.md"
DRY_RUN=false
RESUME_FROM=""
PARALLEL=3
AUTONOMY="aggressive"
ONLY_LIST=""
MAX_RETRIES=1
LOG_DIR=""
PLAN_SLUG_ARG=""

# All tools needed across all phases — pre-allow everything
ALLOWED_TOOLS="Read,Write,Edit,Glob,Grep,Bash,Task,mcp__knowledge-base__kb_get,mcp__knowledge-base__kb_search,mcp__knowledge-base__kb_get_story,mcp__knowledge-base__kb_list_stories,mcp__knowledge-base__kb_update_story,mcp__knowledge-base__kb_update_story_status,mcp__knowledge-base__kb_write_artifact,mcp__knowledge-base__kb_read_artifact,mcp__knowledge-base__kb_list_artifacts,mcp__knowledge-base__kb_add,mcp__knowledge-base__kb_list,mcp__knowledge-base__kb_get_related,mcp__knowledge-base__kb_get_plan,mcp__knowledge-base__kb_list_plans,mcp__knowledge-base__kb_log_tokens,mcp__knowledge-base__kb_get_work_state,mcp__knowledge-base__kb_update_work_state,mcp__knowledge-base__kb_get_next_story,mcp__knowledge-base__kb_add_decision,mcp__knowledge-base__kb_add_lesson,mcp__knowledge-base__worktree_register,mcp__knowledge-base__worktree_get_by_story,mcp__knowledge-base__worktree_list_active,mcp__knowledge-base__worktree_mark_complete,mcp__knowledge-base__artifact_search"

# Common claude flags for fully autonomous execution
CLAUDE_FLAGS="--allowedTools $ALLOWED_TOOLS --permission-mode bypassPermissions"

# ── Parse CLI args ───────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)        DRY_RUN=true; shift ;;
    --from)           RESUME_FROM="$2"; shift 2 ;;
    --parallel)       PARALLEL="$2"; shift 2 ;;
    --sequential)     PARALLEL=1; shift ;;
    --only)           ONLY_LIST="$2"; shift 2 ;;
    --max-retries)    MAX_RETRIES="$2"; shift 2 ;;
    --work-order)     WORK_ORDER="$2"; shift 2 ;;
    --plan)           PLAN_SLUG_ARG="$2"; shift 2 ;;
    --autonomy)       AUTONOMY="$2"; shift 2 ;;
    --help|-h)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --parallel N          Run N stories in parallel (default 3)"
      echo "  --sequential          Run one at a time"
      echo "  --dry-run             Show detected states + planned actions"
      echo "  --from STORY-ID       Resume from a specific story in work order"
      echo "  --only ID,ID,...      Process only specific stories"
      echo "  --max-retries N       Retry failed phases with fix (default 1)"
      echo "  --work-order FILE     Custom work order file"
      echo "  --plan SLUG           Discover stories from a KB plan (mutually exclusive with --work-order)"
      echo "  --autonomy LEVEL      Set autonomy level (default aggressive)"
      exit 0
      ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

# ── Set up logging ───────────────────────────────────────────────────
LOG_DIR="/tmp/orchestrator-$(date '+%Y%m%d-%H%M%S')"
mkdir -p "$LOG_DIR/.state" "$LOG_DIR/.results"

# ── Mutual exclusion: --plan vs --work-order ───────────────────────────
if [[ -n "$PLAN_SLUG_ARG" && "$WORK_ORDER" != "$REPO_ROOT/plans/future/platform/WORK-ORDER-BY-BATCH.md" ]]; then
  echo "Error: --plan and --work-order are mutually exclusive"
  exit 1
fi

# ── Story source: plan-based or work-order-based ──────────────────────
if [[ -n "$PLAN_SLUG_ARG" ]]; then
  # ── Plan-based mode ──────────────────────────────────────────────
  source "$SCRIPT_DIR/lib/resolve-plan.sh"

  echo "Resolving plan: $PLAN_SLUG_ARG"
  resolve_plan "$PLAN_SLUG_ARG"
  echo "  Feature dir: $FEATURE_DIR"
  echo "  Story prefix: ${STORY_PREFIX:-<none>}"

  # Discover stories (KB-first, stories.index.md fallback)
  discover_stories

  if [[ ${#DISCOVERED_STORIES[@]} -eq 0 ]]; then
    echo "No stories found for plan '$PLAN_SLUG_ARG'."
    echo "  Run: ./scripts/generate-stories.sh $PLAN_SLUG_ARG"
    exit 0
  fi

  # Build a synthetic WO_CACHE_FILE so wo_feature_dir/wo_status work
  WO_CACHE_FILE=$(mktemp /tmp/wo-cache-$$.XXXXXX)
  WO_STORY_IDS=()
  for sid in "${DISCOVERED_STORIES[@]}"; do
    printf '%s\t%s\tbacklog\t\n' "$sid" "$FEATURE_DIR" >> "$WO_CACHE_FILE"
    WO_STORY_IDS+=("$sid")
  done

  # Populate KB states from cache
  kb_fetch_stories "$PLAN_SLUG_ARG"

  echo "Found ${#WO_STORY_IDS[@]} stories for plan '$PLAN_SLUG_ARG'"
else
  # ── Work order mode (existing) ──────────────────────────────────
  echo "Parsing work order: $WORK_ORDER"
  parse_work_order "$WORK_ORDER"

  if [[ ${#WO_STORY_IDS[@]} -eq 0 ]]; then
    echo "Error: No stories found in work order"
    exit 1
  fi
  echo "Found ${#WO_STORY_IDS[@]} stories in work order"
fi

# ── Filter stories ───────────────────────────────────────────────────
ONLY_SET=""
if [[ -n "$ONLY_LIST" ]]; then
  ONLY_SET=",$ONLY_LIST,"
fi

FILTERED_STORIES=()
SKIPPING=true
[[ -z "$RESUME_FROM" ]] && SKIPPING=false

SKIPPED_COUNT=0
FILTER_LOG="$LOG_DIR/filter.log"
{
  echo "=== Filter Log ==="
  echo "Timestamp: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  if [[ -n "$PLAN_SLUG_ARG" ]]; then
    echo "Plan: $PLAN_SLUG_ARG"
  else
    echo "Work order: $WORK_ORDER"
  fi
  echo "Resume from: ${RESUME_FROM:-<none>}"
  echo "Only list: ${ONLY_LIST:-<none>}"
  echo "Total stories in work order: ${#WO_STORY_IDS[@]}"
  echo "---"
} > "$FILTER_LOG"

for STORY_ID in "${WO_STORY_IDS[@]}"; do
  # Handle --from resume
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

if [[ $TOTAL -eq 0 ]]; then
  echo "No stories to process."
  echo "  Skipped: $SKIPPED_COUNT"
  exit 0
fi

# ── Bulk-fetch KB states for all filtered stories ─────────────────────
# In plan mode, kb_fetch_stories already ran. In work-order mode, we need
# to fetch by explicit IDs since stories span multiple plans/prefixes.
if [[ -z "$PLAN_SLUG_ARG" ]]; then
  echo "Fetching KB states..."
  kb_fetch_by_ids "$(IFS=,; echo "${FILTERED_STORIES[*]}")"
  echo "  KB cache: ${#KB_STORY_IDS[@]} stories found"
fi

# ── Detect states for all stories ────────────────────────────────────
echo ""
echo "Detecting story states..."
echo ""

# Per-story state file format: feature_dir|current_state|retries_left|phases_run|last_result
write_state_file() {
  local story_id="$1" feat_dir="$2" state="$3" retries="$4" phases="$5" result="$6"
  echo "${feat_dir}|${state}|${retries}|${phases}|${result}" > "$LOG_DIR/.state/${story_id}"
}

read_state_field() {
  local story_id="$1" field="$2"
  local line
  line=$(cat "$LOG_DIR/.state/${story_id}" 2>/dev/null) || true
  if [[ -z "$line" ]]; then return; fi
  case "$field" in
    feature_dir)    echo "$line" | cut -d'|' -f1 ;;
    current_state)  echo "$line" | cut -d'|' -f2 ;;
    retries_left)   echo "$line" | cut -d'|' -f3 ;;
    phases_run)     echo "$line" | cut -d'|' -f4 ;;
    last_result)    echo "$line" | cut -d'|' -f5 ;;
  esac
}

STATE_SUMMARY=""
for STORY_ID in "${FILTERED_STORIES[@]}"; do
  FEAT_DIR=$(wo_feature_dir "$STORY_ID")
  WO_STATUS=$(wo_status "$STORY_ID")

  if [[ -z "$FEAT_DIR" ]]; then
    echo "  $STORY_ID: SKIP (no feature dir in work order command)"
    write_state_file "$STORY_ID" "" "NOT_FOUND" "$MAX_RETRIES" "" ""
    continue
  fi

  kb_st=$(kb_story_state "$STORY_ID")
  detect_story_state "$STORY_ID" "$FEAT_DIR" "" "$kb_st"
  action=$(state_to_action "$DETECTED_STATE")

  printf "  %-14s state=%-14s stage=%-22s next=%s\n" \
    "$STORY_ID" "$DETECTED_STATE" "${DETECTED_STAGE:-<none>}" "$action"

  if [[ -n "$DETECTED_DUPLICATES" ]]; then
    echo "    ⚠ duplicate dirs (would cleanup on real run): $DETECTED_DUPLICATES"
  fi

  write_state_file "$STORY_ID" "$FEAT_DIR" "$DETECTED_STATE" "$MAX_RETRIES" "" ""

  STATE_SUMMARY="${STATE_SUMMARY}${STORY_ID}=${DETECTED_STATE} "
done

# ── Banner ───────────────────────────────────────────────────────────
echo ""
echo "======================================"
echo " Unified Story Orchestrator"
echo "======================================"
if [[ -n "$PLAN_SLUG_ARG" ]]; then
  echo " Plan:          $PLAN_SLUG_ARG"
  echo " Feature dir:   $FEATURE_DIR"
else
  echo " Work order:    $WORK_ORDER"
fi
echo " Stories:       $TOTAL"
echo " Skipped:       $SKIPPED_COUNT"
echo " Parallel:      $PARALLEL"
echo " Autonomy:      $AUTONOMY"
echo " Max retries:   $MAX_RETRIES"
echo " Dry run:       $DRY_RUN"
[[ -n "$ONLY_LIST" ]] && echo " Only:          $ONLY_LIST"
echo " Logs:          $LOG_DIR/"
echo "======================================"

# ── Persist run metadata ─────────────────────────────────────────────
RUN_LOG="$LOG_DIR/run.log"
{
  echo "=== Run Log ==="
  echo "Start: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  if [[ -n "$PLAN_SLUG_ARG" ]]; then
    echo "Plan: $PLAN_SLUG_ARG"
    echo "Feature dir: $FEATURE_DIR"
  else
    echo "Work order: $WORK_ORDER"
  fi
  echo "Parallel: $PARALLEL"
  echo "Autonomy: $AUTONOMY"
  echo "Max retries: $MAX_RETRIES"
  echo "Dry run: $DRY_RUN"
  [[ -n "$ONLY_LIST" ]] && echo "Only: $ONLY_LIST"
  [[ -n "$RESUME_FROM" ]] && echo "Resume from: $RESUME_FROM"
  echo "Stories: $TOTAL"
  echo "Skipped: $SKIPPED_COUNT"
  echo "---"
  echo "Initial states: $STATE_SUMMARY"
  echo "---"
} > "$RUN_LOG"

# ── Log failure detection (reused from implement-stories.sh) ─────────
check_log_for_failure() {
  local LOG_FILE="$1"
  local PHASE="$2"

  if [[ ! -f "$LOG_FILE" ]]; then
    echo "FAIL:signal:no-log-file"
    return 0
  fi
  local FILE_SIZE
  FILE_SIZE=$(wc -c < "$LOG_FILE" 2>/dev/null) || FILE_SIZE=0
  if [[ $FILE_SIZE -lt 100 ]]; then
    echo "FAIL:signal:truncated-log"
    return 0
  fi

  local MATCH
  MATCH=$(grep -oEi "HARD STOP|SETUP BLOCKED|Phase 0 Validation Failed|blocked at Phase 0|precondition.* failure|cannot proceed|PLANNING BLOCKED|PLANNING FAILED|EXECUTION BLOCKED|DOCUMENTATION BLOCKED" "$LOG_FILE" | head -1) || true
  if [[ -n "$MATCH" ]]; then
    echo "FAIL:signal:$MATCH"
    return 0
  fi

  MATCH=$(grep -oEi "VERIFICATION (BLOCKED|FAILED)|FIX (BLOCKED|FAILED)|REVIEW (BLOCKED|FAILED)" "$LOG_FILE" | head -1) || true
  if [[ -n "$MATCH" ]]; then
    echo "FAIL:agent:$MATCH"
    return 0
  fi

  MATCH=$(grep -oEi "E2E.*FAIL|TEST.*FAIL|tests failed" "$LOG_FILE" | head -1) || true
  if [[ -n "$MATCH" ]]; then
    echo "FAIL:test:$MATCH"
    return 0
  fi

  MATCH=$(grep -oEi "ABORT|TIMEOUT|context limit|token budget" "$LOG_FILE" | head -1) || true
  if [[ -n "$MATCH" ]]; then
    echo "FAIL:resource:$MATCH"
    return 0
  fi

  echo "OK"
}

# ── Git lifecycle helpers ────────────────────────────────────────────
#
# WORKTREE CONTEXT: All code work happens in git worktrees at tree/story/<ID>.
# Agents spawned via `claude -p` run from the main repo root and may not
# automatically find code in worktrees. The orchestrator compensates by:
#   1. Ensuring worktrees exist before every code-touching phase
#   2. Committing+pushing changes so agents can see code via `git diff`
#   3. Passing worktree path context in the prompt preamble
#   4. Running lint/typecheck/build commands from within the worktree
#
# Known gap: /dev-code-review, /qa-verify-story, and /dev-fix-story don't
# auto-resolve worktrees (see .claude/agents/_shared/worktree-resolution.md).
# The orchestrator ensures the worktree is ready and code is pushed so agents
# can at least discover changes via git branch inspection.
#

WORKTREE_BASE="tree/story"

# Resolve the absolute worktree path for a story (returns "" if none)
resolve_worktree_root() {
  local STORY_ID="$1"
  local WT_PATH="${WORKTREE_BASE}/${STORY_ID}"

  # Check conventional path first (fast)
  if [[ -d "$WT_PATH" ]]; then
    echo "$(cd "$WT_PATH" && pwd)"
    return 0
  fi

  # Fallback: query git worktree list
  local wt_line
  wt_line=$(git worktree list 2>/dev/null | grep "story/${STORY_ID}" | head -1) || true
  if [[ -n "$wt_line" ]]; then
    echo "$wt_line" | awk '{print $1}'
    return 0
  fi

  echo ""
}

# Ensure code in worktree is committed, pushed, and branch is up-to-date.
# Call before review/QA phases so agents can see changes via git.
sync_worktree_for_agents() {
  local STORY_ID="$1"
  local TAG="$2"
  local WT_PATH
  WT_PATH=$(resolve_worktree_root "$STORY_ID")

  if [[ -z "$WT_PATH" ]]; then
    echo "$TAG WT   SYNC:    $STORY_ID (no worktree — agents will use main)"
    return 0
  fi

  local BRANCH="story/${STORY_ID}"

  # Stage and commit any uncommitted changes
  git -C "$WT_PATH" add -A 2>/dev/null || true
  local CHANGES
  CHANGES=$(git -C "$WT_PATH" status --porcelain 2>/dev/null) || true
  if [[ -n "$CHANGES" ]]; then
    git -C "$WT_PATH" commit -m "chore(${STORY_ID}): sync before agent handoff" --no-verify 2>/dev/null || true
    echo "$TAG WT   SYNC:    $STORY_ID (committed uncommitted changes)"
  fi

  # Push so agents can see the branch
  git -C "$WT_PATH" push -u origin "$BRANCH" --quiet 2>/dev/null || true
  echo "$TAG WT   SYNC:    $STORY_ID (pushed to origin/$BRANCH)"
}

ensure_worktree() {
  local STORY_ID="$1"
  local TAG="$2"
  local BRANCH="story/${STORY_ID}"
  local WT_PATH="${WORKTREE_BASE}/${STORY_ID}"

  if [[ -d "$WT_PATH" ]]; then
    echo "$TAG WT   EXISTS:  $STORY_ID ($WT_PATH)"
    git -C "$WT_PATH" fetch origin main --quiet 2>/dev/null || true
    if ! git -C "$WT_PATH" rebase origin/main --quiet 2>/dev/null; then
      echo "$TAG WT   WARN:    $STORY_ID (rebase conflicts — aborting)"
      git -C "$WT_PATH" rebase --abort 2>/dev/null || true
    fi
    return 0
  fi

  git fetch origin --quiet 2>/dev/null || true
  mkdir -p "$(dirname "$WT_PATH")"

  if git show-ref --verify --quiet "refs/heads/${BRANCH}" 2>/dev/null; then
    git worktree add "$WT_PATH" "$BRANCH" 2>/dev/null || true
  else
    git worktree add -b "$BRANCH" "$WT_PATH" origin/main 2>/dev/null || true
  fi

  if [[ -d "$WT_PATH" ]]; then
    echo "$TAG WT   CREATE:  $STORY_ID ($WT_PATH)"
    return 0
  else
    echo "$TAG WT   FAIL:    $STORY_ID (could not create worktree)"
    return 1
  fi
}

commit_and_push() {
  local STORY_ID="$1"
  local TITLE="$2"
  local TAG="$3"
  local BRANCH="story/${STORY_ID}"
  local WT_PATH="${WORKTREE_BASE}/${STORY_ID}"

  if [[ ! -d "$WT_PATH" ]]; then
    return 0
  fi

  git -C "$WT_PATH" add -A 2>/dev/null || true
  local CHANGES
  CHANGES=$(git -C "$WT_PATH" status --porcelain 2>/dev/null) || true

  if [[ -n "$CHANGES" ]]; then
    git -C "$WT_PATH" commit -m "feat(${STORY_ID}): ${TITLE}" --no-verify 2>/dev/null || true
    echo "$TAG COMMIT OK:   $STORY_ID"
  fi

  git -C "$WT_PATH" push -u origin "$BRANCH" --quiet 2>/dev/null || true
}

ensure_pr() {
  local STORY_ID="$1"
  local TITLE="$2"
  local TAG="$3"
  local BRANCH="story/${STORY_ID}"

  local EXISTING_PR
  EXISTING_PR=$(gh pr list --head "$BRANCH" --state open --json number,url --jq '.[0].url' 2>/dev/null) || true

  if [[ -n "$EXISTING_PR" ]]; then
    echo "$TAG PR   EXISTS:  $STORY_ID ($EXISTING_PR)"
    return 0
  fi

  local PR_URL
  PR_URL=$(gh pr create \
    --title "${STORY_ID}: ${TITLE}" \
    --body "Automated implementation of ${STORY_ID}: ${TITLE}" \
    --base main \
    --head "$BRANCH" 2>/dev/null) || true

  if [[ -n "$PR_URL" ]]; then
    echo "$TAG PR   CREATE:  $STORY_ID ($PR_URL)"
  else
    echo "$TAG PR   FAIL:    $STORY_ID (could not create PR)"
  fi
}

merge_and_cleanup() {
  local STORY_ID="$1"
  local TAG="$2"
  local BRANCH="story/${STORY_ID}"
  local WT_PATH="${WORKTREE_BASE}/${STORY_ID}"

  local PR_NUMBER
  PR_NUMBER=$(gh pr list --head "$BRANCH" --state open --json number --jq '.[0].number' 2>/dev/null) || true

  if [[ -n "$PR_NUMBER" ]]; then
    gh pr merge "$PR_NUMBER" --squash --delete-branch 2>/dev/null || true
    echo "$TAG MERGE  OK:   $STORY_ID (PR #$PR_NUMBER)"
  fi

  if [[ -d "$WT_PATH" ]]; then
    git worktree remove "$WT_PATH" 2>/dev/null || \
      git worktree remove "$WT_PATH" --force 2>/dev/null || true
  fi
  git branch -D "$BRANCH" 2>/dev/null || true
  git worktree prune 2>/dev/null || true
}

get_story_title() {
  local STORY_DIR="$1"
  grep -m1 "^title:" "${STORY_DIR}/story.yaml" 2>/dev/null | sed 's/^title: *//' | sed 's/^["'"'"']//;s/["'"'"']$//' || echo "Implementation"
}

# ── Status sync helpers ──────────────────────────────────────────────
#
# Keep three sources of truth in sync after each state transition:
#   1. KB (via kb_update_story_status) — the primary store
#   2. stories.index.md (via /story-update skill) — per-plan index
#   3. WORK-ORDER-BY-BATCH.md — remove completed/UAT rows
#
# These are best-effort: failures are logged but don't block the pipeline.
#

# Map orchestrator states to KB state strings and story-update status strings
state_to_kb_state() {
  local state="$1"
  case "$state" in
    NOT_FOUND)      echo "backlog" ;;
    GENERATED)      echo "created" ;;
    ELABORATED)     echo "ready_to_work" ;;
    NEEDS_REVIEW)   echo "needs_code_review" ;;
    FAILED_REVIEW)  echo "failed_code_review" ;;
    READY_FOR_QA)   echo "ready_for_qa" ;;
    FAILED_QA)      echo "failed_qa" ;;
    UAT)            echo "uat" ;;
    *)              echo "" ;;
  esac
}

state_to_index_status() {
  local state="$1"
  case "$state" in
    NOT_FOUND)      echo "backlog" ;;
    GENERATED)      echo "created" ;;
    ELABORATED)     echo "ready-to-work" ;;
    NEEDS_REVIEW)   echo "needs-code-review" ;;
    FAILED_REVIEW)  echo "failed-code-review" ;;
    READY_FOR_QA)   echo "ready-for-qa" ;;
    FAILED_QA)      echo "failed-qa" ;;
    UAT)            echo "uat" ;;
    *)              echo "" ;;
  esac
}

# Update KB story status (best-effort, non-blocking)
update_kb_status() {
  local STORY_ID="$1"
  local NEW_STATE="$2"
  local PHASE="$3"
  local TAG="$4"

  local kb_state
  kb_state=$(state_to_kb_state "$NEW_STATE")
  if [[ -z "$kb_state" ]]; then
    return 0
  fi

  claude -p "Call kb_update_story_status with story_id '${STORY_ID}', state '${kb_state}', phase '${PHASE}'. Output only 'OK' or 'ERROR: <reason>'. No explanation." \
    --allowedTools "mcp__knowledge-base__kb_update_story_status" \
    --output-format text \
    --permission-mode bypassPermissions \
    > /dev/null 2>&1 || true

  echo "$TAG KB   UPDATE:  $STORY_ID → $kb_state (phase=$PHASE)"
}

# Update stories.index.md status (best-effort, non-blocking)
update_index_status() {
  local FEAT_DIR="$1"
  local STORY_ID="$2"
  local NEW_STATE="$3"
  local TAG="$4"

  local index_status
  index_status=$(state_to_index_status "$NEW_STATE")
  if [[ -z "$index_status" ]]; then
    return 0
  fi

  claude -p "/story-update $FEAT_DIR $STORY_ID $index_status" \
    $CLAUDE_FLAGS \
    > /dev/null 2>&1 || true

  echo "$TAG IDX  UPDATE:  $STORY_ID → $index_status"
}

# Remove a completed/UAT story row from the work order file.
# Uses sed to delete lines containing the story ID from the table.
remove_from_work_order() {
  local STORY_ID="$1"
  local WO_FILE="$2"
  local TAG="$3"

  if [[ ! -f "$WO_FILE" ]]; then
    return 0
  fi

  # Check if story is in the file
  if ! grep -q "$STORY_ID" "$WO_FILE" 2>/dev/null; then
    return 0
  fi

  # Remove all lines containing this story ID (data rows + continuation rows)
  # Create temp file (macOS sed doesn't support -i without extension)
  local TMP_FILE
  TMP_FILE=$(mktemp /tmp/wo-edit-XXXXXX)

  # Strategy: remove the data row(s) for this story.
  # A story row starts with │ and contains the story ID.
  # Continuation rows have empty story column (│     │                       │)
  # Also remove the separator row that follows.
  local in_story=false
  while IFS= read -r line; do
    if [[ "$line" == *"$STORY_ID"* ]]; then
      in_story=true
      continue  # skip this line
    fi
    if $in_story; then
      # Check if this is a continuation line (story column is empty/whitespace)
      local story_col
      story_col=$(echo "$line" | awk -F '│' '{print $3}' 2>/dev/null | xargs) || true
      if [[ -z "$story_col" && "$line" == *"│"* && "$line" != *"├"* && "$line" != *"┌"* && "$line" != *"└"* ]]; then
        continue  # skip continuation row
      fi
      # Check if this is a separator row immediately after
      if [[ "$line" == *"├"* ]]; then
        in_story=false
        continue  # skip separator
      fi
      in_story=false
    fi
    echo "$line"
  done < "$WO_FILE" > "$TMP_FILE"

  mv "$TMP_FILE" "$WO_FILE"
  echo "$TAG WO   REMOVE:  $STORY_ID (removed from work order)"
}

# Combined sync: update KB + index + work order after a state transition.
# Called after each successful phase completion in the state machine.
sync_status_after_transition() {
  local STORY_ID="$1"
  local NEW_STATE="$2"
  local PHASE="$3"
  local FEAT_DIR="$4"
  local TAG="$5"

  # Update KB (best-effort, in background to not slow down pipeline)
  update_kb_status "$STORY_ID" "$NEW_STATE" "$PHASE" "$TAG" &

  # Update stories.index.md (best-effort, in background)
  update_index_status "$FEAT_DIR" "$STORY_ID" "$NEW_STATE" "$TAG" &

  # If completed/UAT, remove from work order
  if [[ "$NEW_STATE" == "UAT" ]]; then
    remove_from_work_order "$STORY_ID" "$WORK_ORDER" "$TAG"
  fi

  # Don't wait for background jobs here — they're best-effort
}

# ── Move story directory between stages ──────────────────────────────
move_story_to() {
  local STORY_ID="$1"
  local FROM_STAGE="$2"
  local TO_STAGE="$3"
  local FEAT_DIR="$4"
  local TAG="$5"

  if [[ "$FROM_STAGE" == "$TO_STAGE" ]]; then
    return 0
  fi
  if [[ -d "$FEAT_DIR/$TO_STAGE/$STORY_ID" ]]; then
    rm -rf "$FEAT_DIR/$FROM_STAGE/$STORY_ID"
    return 0
  fi
  mkdir -p "$FEAT_DIR/$TO_STAGE"
  mv "$FEAT_DIR/$FROM_STAGE/$STORY_ID" "$FEAT_DIR/$TO_STAGE/$STORY_ID"
  echo "$TAG MOVE:        $STORY_ID → $TO_STAGE/"
}

# ── Dry run ──────────────────────────────────────────────────────────
if $DRY_RUN; then
  echo ""
  echo "=== Dry Run — Planned Actions ==="
  echo ""
  for STORY_ID in "${FILTERED_STORIES[@]}"; do
    STATE=$(read_state_field "$STORY_ID" "current_state")
    FEAT_DIR=$(read_state_field "$STORY_ID" "feature_dir")
    ACTION=$(state_to_action "$STATE")
    case "$ACTION" in
      generate)   CMD="/pm-story generate $FEAT_DIR $STORY_ID" ;;
      elaborate)  CMD="/elab-story $FEAT_DIR $STORY_ID --autonomous" ;;
      implement)  CMD="/dev-implement-story $FEAT_DIR $STORY_ID --autonomous=$AUTONOMY --skip-worktree" ;;
      review)     CMD="/dev-code-review $FEAT_DIR $STORY_ID" ;;
      fix-review) CMD="/dev-fix-story $FEAT_DIR $STORY_ID" ;;
      qa)         CMD="/qa-verify-story $FEAT_DIR $STORY_ID" ;;
      fix-qa)     CMD="/dev-fix-story $FEAT_DIR $STORY_ID" ;;
      done)       CMD="(skip — already in UAT)" ;;
      skip)       CMD="(skip — needs-split)" ;;
      *)          CMD="(unknown state: $STATE)" ;;
    esac
    printf "  %-14s %-14s → %s\n" "$STORY_ID" "$STATE" "$CMD"
  done
  echo ""
  echo "Dry run complete. $TOTAL stories detected, $PARALLEL would run in parallel."
  # Cleanup
  wo_cleanup
  exit 0
fi

# ── Worker function (runs in subshell for each story) ─────────────────
process_story() {
  local STORY_ID="$1"
  local IDX="$2"
  local RESULT_FILE="$LOG_DIR/.results/${STORY_ID}"
  local FINAL_RESULT="ok"
  local PHASES_RUN=""

  local TAG="[${IDX}/${TOTAL}]"

  local FEAT_DIR
  FEAT_DIR=$(read_state_field "$STORY_ID" "feature_dir")
  local RETRIES_LEFT=$MAX_RETRIES    # Budget for code-quality fix cycles (review/QA failures)
  local MAX_TRANSITIONS=20           # Safety limit (increased — self-healing uses more transitions)
  local TRANSITION_LOG=""
  local PREV_STATE=""
  local PHASE_ATTEMPTS=0             # Consecutive failures on same phase (agent crashes)
  local MAX_PHASE_ATTEMPTS=2         # Retry a crashed agent once before giving up

  # Re-detect state at the start of processing (with duplicate cleanup)
  refresh_state() {
    local kb_st
    kb_st=$(kb_story_state "$STORY_ID")
    detect_story_state "$STORY_ID" "$FEAT_DIR" "cleanup" "$kb_st"
    # DETECTED_STATE, DETECTED_STAGE, DETECTED_STORY_DIR now set
    if [[ -n "$DETECTED_DUPLICATES" ]]; then
      echo "$TAG CLEANUP:     $STORY_ID removed stale dirs: $DETECTED_DUPLICATES"
    fi
  }

  refresh_state

  if [[ -z "$FEAT_DIR" ]]; then
    echo "$TAG SKIP:        $STORY_ID (no feature dir)"
    echo "result=skip reason=no-feature-dir" > "$RESULT_FILE"
    return 0
  fi

  echo "$TAG PICK UP:     $STORY_ID (state=$DETECTED_STATE, stage=${DETECTED_STAGE:-<none>})"

  # ── State machine loop ─────────────────────────────────────────
  while [[ $MAX_TRANSITIONS -gt 0 ]]; do
    ((MAX_TRANSITIONS--))
    refresh_state

    local CURRENT_STATE="$DETECTED_STATE"
    local CURRENT_STAGE="$DETECTED_STAGE"
    local STORY_DIR="$DETECTED_STORY_DIR"

    # Cycle detection
    if [[ -n "$PREV_STATE" && "$PREV_STATE" == "$CURRENT_STATE" && "$CURRENT_STATE" != "NEEDS_REVIEW" && "$CURRENT_STATE" != "ELABORATED" ]]; then
      # Same state twice with no progress — likely stuck
      # (NEEDS_REVIEW and ELABORATED can legitimately repeat after a fix)
      :
    fi
    if [[ -n "$PREV_STATE" && -n "$CURRENT_STATE" ]]; then
      local PAIR="${PREV_STATE}→${CURRENT_STATE}"
      # Count occurrences of this transition
      local pair_count
      pair_count=$(echo "$TRANSITION_LOG" | grep -o "|${PAIR}|" | wc -l) || pair_count=0
      pair_count=$(echo "$pair_count" | xargs)
      if [[ $pair_count -ge 2 ]]; then
        echo "$TAG CYCLE:       $STORY_ID (repeated transition: $PAIR, count=$pair_count)"
        FINAL_RESULT="stuck"
        break
      fi
      TRANSITION_LOG="${TRANSITION_LOG}|${PAIR}|"
    fi
    PREV_STATE="$CURRENT_STATE"

    case "$CURRENT_STATE" in

      # ── Already done ──────────────────────────────────────────
      UAT)
        sync_status_after_transition "$STORY_ID" "UAT" "done" "$FEAT_DIR" "$TAG"
        merge_and_cleanup "$STORY_ID" "$TAG"
        echo "$TAG DONE:        $STORY_ID"
        break
        ;;

      # ── Not found → generate story ────────────────────────────
      NOT_FOUND)
        local GEN_LOG="$LOG_DIR/${STORY_ID}-generate.log"
        echo "$TAG GEN  START:  $STORY_ID"
        PHASES_RUN="${PHASES_RUN}generate,"

        claude -p "/pm-story generate $FEAT_DIR $STORY_ID" \
             $CLAUDE_FLAGS \
             > "$GEN_LOG" 2>&1 || true

        local LOG_CHECK
        LOG_CHECK=$(check_log_for_failure "$GEN_LOG" "generate")

        if [[ "$LOG_CHECK" != "OK" ]]; then
          ((PHASE_ATTEMPTS++))
          if [[ $PHASE_ATTEMPTS -ge $MAX_PHASE_ATTEMPTS ]]; then
            FINAL_RESULT="stuck"
            echo "$TAG GEN  STUCK:  $STORY_ID ($LOG_CHECK) — agent failed $PHASE_ATTEMPTS times (see $GEN_LOG)"
            break
          fi
          echo "$TAG GEN  RETRY:  $STORY_ID ($LOG_CHECK) — retrying ($PHASE_ATTEMPTS/$MAX_PHASE_ATTEMPTS) (see $GEN_LOG)"
          sleep 5
          continue
        fi

        PHASE_ATTEMPTS=0
        echo "$TAG GEN  OK:     $STORY_ID"
        sync_status_after_transition "$STORY_ID" "GENERATED" "generate" "$FEAT_DIR" "$TAG"
        continue
        ;;

      # ── Generated → elaborate ─────────────────────────────────
      GENERATED)
        local ELAB_LOG="$LOG_DIR/${STORY_ID}-elaborate.log"
        echo "$TAG ELAB START:  $STORY_ID"
        PHASES_RUN="${PHASES_RUN}elaborate,"

        claude -p "/elab-story $FEAT_DIR $STORY_ID --autonomous" \
             $CLAUDE_FLAGS \
             > "$ELAB_LOG" 2>&1 || true

        local LOG_CHECK
        LOG_CHECK=$(check_log_for_failure "$ELAB_LOG" "elaborate")

        if [[ "$LOG_CHECK" != "OK" ]]; then
          ((PHASE_ATTEMPTS++))
          if [[ $PHASE_ATTEMPTS -ge $MAX_PHASE_ATTEMPTS ]]; then
            FINAL_RESULT="stuck"
            echo "$TAG ELAB STUCK:  $STORY_ID ($LOG_CHECK) — agent failed $PHASE_ATTEMPTS times (see $ELAB_LOG)"
            break
          fi
          echo "$TAG ELAB RETRY:  $STORY_ID ($LOG_CHECK) — retrying ($PHASE_ATTEMPTS/$MAX_PHASE_ATTEMPTS) (see $ELAB_LOG)"
          sleep 5
          continue
        fi

        PHASE_ATTEMPTS=0
        echo "$TAG ELAB OK:     $STORY_ID"
        sync_status_after_transition "$STORY_ID" "ELABORATED" "elaborate" "$FEAT_DIR" "$TAG"
        continue
        ;;

      # ── Elaborated → implement ────────────────────────────────
      ELABORATED)
        # If story is in wrong stage dir, move it to ready-to-work first
        if [[ -n "$CURRENT_STAGE" && "$CURRENT_STAGE" != "ready-to-work" && "$CURRENT_STAGE" != "backlog" && "$CURRENT_STAGE" != "in-progress" ]]; then
          echo "$TAG SELF-HEAL:  $STORY_ID (state=ELABORATED but stage=$CURRENT_STAGE — moving to ready-to-work)"
          move_story_to "$STORY_ID" "$CURRENT_STAGE" "ready-to-work" "$FEAT_DIR" "$TAG"
          continue
        fi

        # Create worktree (retry-safe)
        if ! ensure_worktree "$STORY_ID" "$TAG"; then
          ((PHASE_ATTEMPTS++))
          if [[ $PHASE_ATTEMPTS -ge $MAX_PHASE_ATTEMPTS ]]; then
            FINAL_RESULT="stuck"
            echo "$TAG IMPL STUCK:  $STORY_ID (worktree creation failed $PHASE_ATTEMPTS times)"
            break
          fi
          echo "$TAG IMPL RETRY:  $STORY_ID (worktree creation failed — retrying)"
          sleep 5
          continue
        fi

        local IMPL_LOG="$LOG_DIR/${STORY_ID}-implement.log"
        echo "$TAG IMPL START:  $STORY_ID"
        PHASES_RUN="${PHASES_RUN}implement,"

        claude -p "/dev-implement-story $FEAT_DIR $STORY_ID --autonomous=$AUTONOMY --skip-worktree" \
             $CLAUDE_FLAGS \
             > "$IMPL_LOG" 2>&1 || true

        local LOG_CHECK
        LOG_CHECK=$(check_log_for_failure "$IMPL_LOG" "implement")

        if [[ "$LOG_CHECK" != "OK" ]]; then
          ((PHASE_ATTEMPTS++))
          if [[ $PHASE_ATTEMPTS -ge $MAX_PHASE_ATTEMPTS ]]; then
            FINAL_RESULT="stuck"
            echo "$TAG IMPL STUCK:  $STORY_ID ($LOG_CHECK) — agent failed $PHASE_ATTEMPTS times (see $IMPL_LOG)"
            break
          fi
          echo "$TAG IMPL RETRY:  $STORY_ID ($LOG_CHECK) — retrying ($PHASE_ATTEMPTS/$MAX_PHASE_ATTEMPTS) (see $IMPL_LOG)"
          sleep 5
          continue
        fi

        PHASE_ATTEMPTS=0

        # Post-implementation: commit, push, PR
        refresh_state
        if [[ -n "$DETECTED_STORY_DIR" ]]; then
          local TITLE
          TITLE=$(get_story_title "$DETECTED_STORY_DIR")
          commit_and_push "$STORY_ID" "$TITLE" "$TAG"
          ensure_pr "$STORY_ID" "$TITLE" "$TAG"
        fi

        echo "$TAG IMPL OK:     $STORY_ID"
        sync_status_after_transition "$STORY_ID" "NEEDS_REVIEW" "implement" "$FEAT_DIR" "$TAG"
        continue
        ;;

      # ── Needs review ──────────────────────────────────────────
      NEEDS_REVIEW)
        # Self-heal: if in wrong stage dir, move to needs-code-review
        if [[ -n "$CURRENT_STAGE" && "$CURRENT_STAGE" != "needs-code-review" ]]; then
          echo "$TAG SELF-HEAL:  $STORY_ID (state=NEEDS_REVIEW but stage=$CURRENT_STAGE — moving to needs-code-review)"
          move_story_to "$STORY_ID" "$CURRENT_STAGE" "needs-code-review" "$FEAT_DIR" "$TAG"
          continue
        fi

        # Ensure worktree exists and code is pushed so review agents can find it
        ensure_worktree "$STORY_ID" "$TAG" || true
        sync_worktree_for_agents "$STORY_ID" "$TAG"

        local REVIEW_LOG="$LOG_DIR/${STORY_ID}-review.log"
        echo "$TAG REVW START:  $STORY_ID"
        PHASES_RUN="${PHASES_RUN}review,"

        # Note: review agents discover code via git branch and KB evidence artifact.
        # The worktree is at tree/story/$STORY_ID — agents may use git worktree list
        # or the conventional path to find it (see worktree-resolution.md).
        claude -p "/dev-code-review $FEAT_DIR $STORY_ID" \
             $CLAUDE_FLAGS \
             > "$REVIEW_LOG" 2>&1 || true

        local LOG_CHECK
        LOG_CHECK=$(check_log_for_failure "$REVIEW_LOG" "review")

        if [[ "$LOG_CHECK" != "OK" ]]; then
          # Review agent crashed or hit precondition — NOT a code quality issue.
          # Move to failed-code-review so the fix path can handle it.
          # This does NOT consume retry budget — the fix cycle does.
          echo "$TAG REVW ISSUE:  $STORY_ID ($LOG_CHECK) — routing to fix path (see $REVIEW_LOG)"
          if [[ "$CURRENT_STAGE" != "failed-code-review" ]]; then
            move_story_to "$STORY_ID" "$CURRENT_STAGE" "failed-code-review" "$FEAT_DIR" "$TAG"
          fi
          PHASE_ATTEMPTS=0
          continue
        fi

        PHASE_ATTEMPTS=0
        echo "$TAG REVW OK:     $STORY_ID"
        # Review agent moves story to ready-for-qa or failed-code-review — sync whichever it landed on
        refresh_state
        sync_status_after_transition "$STORY_ID" "$DETECTED_STATE" "review" "$FEAT_DIR" "$TAG"
        continue
        ;;

      # ── Failed review → fix then re-review ────────────────────
      #
      # This is the ONLY place review retries are consumed.
      # Self-healing (wrong dir, missing artifacts) is free.
      # Only "the code itself is bad" costs a retry.
      #
      FAILED_REVIEW)
        if [[ $RETRIES_LEFT -le 0 ]]; then
          FINAL_RESULT="stuck"
          echo "$TAG FIX  STOP:   $STORY_ID (failed-code-review, exhausted $MAX_RETRIES fix retries)"
          break
        fi
        ((RETRIES_LEFT--))

        # Fix agent needs worktree to modify code
        if ! ensure_worktree "$STORY_ID" "$TAG"; then
          # Worktree failure — don't consume retry, just loop back
          ((RETRIES_LEFT++))
          echo "$TAG FIX  HEAL:   $STORY_ID (worktree failed — will retry worktree creation)"
          sleep 5
          continue
        fi
        sync_worktree_for_agents "$STORY_ID" "$TAG"

        local FIX_LOG="$LOG_DIR/${STORY_ID}-fix-review.log"
        echo "$TAG FIX  START:  $STORY_ID (fixing review failures, fix $((MAX_RETRIES - RETRIES_LEFT))/$MAX_RETRIES)"
        PHASES_RUN="${PHASES_RUN}fix-review,"

        claude -p "/dev-fix-story $FEAT_DIR $STORY_ID" \
             $CLAUDE_FLAGS \
             > "$FIX_LOG" 2>&1 || true

        local LOG_CHECK
        LOG_CHECK=$(check_log_for_failure "$FIX_LOG" "fix")

        if [[ "$LOG_CHECK" != "OK" ]]; then
          # Fix agent crashed — self-heal by moving back to ready-to-work
          # for fresh implementation. Does NOT consume extra retry.
          echo "$TAG FIX  HEAL:   $STORY_ID ($LOG_CHECK) — moving back to ready-to-work for re-impl (see $FIX_LOG)"
          move_story_to "$STORY_ID" "failed-code-review" "ready-to-work" "$FEAT_DIR" "$TAG"
          continue
        fi

        # Commit fix
        refresh_state
        if [[ -n "$DETECTED_STORY_DIR" ]]; then
          local TITLE
          TITLE=$(get_story_title "$DETECTED_STORY_DIR")
          commit_and_push "$STORY_ID" "$TITLE" "$TAG"
        fi

        PHASE_ATTEMPTS=0
        echo "$TAG FIX  OK:     $STORY_ID"
        # Fix should move back to needs-code-review — sync
        refresh_state
        sync_status_after_transition "$STORY_ID" "$DETECTED_STATE" "fix" "$FEAT_DIR" "$TAG"
        continue
        ;;

      # ── Ready for QA ──────────────────────────────────────────
      READY_FOR_QA)
        # Ensure worktree is synced so QA agents can run tests against story code
        ensure_worktree "$STORY_ID" "$TAG" || true
        sync_worktree_for_agents "$STORY_ID" "$TAG"

        local QA_LOG="$LOG_DIR/${STORY_ID}-qa.log"
        echo "$TAG QA   START:  $STORY_ID"
        PHASES_RUN="${PHASES_RUN}qa,"

        claude -p "/qa-verify-story $FEAT_DIR $STORY_ID" \
             $CLAUDE_FLAGS \
             > "$QA_LOG" 2>&1 || true

        local LOG_CHECK
        LOG_CHECK=$(check_log_for_failure "$QA_LOG" "qa")

        refresh_state

        if [[ "$DETECTED_STATE" == "UAT" ]]; then
          PHASE_ATTEMPTS=0
          echo "$TAG QA   OK:     $STORY_ID → UAT"
          sync_status_after_transition "$STORY_ID" "UAT" "qa" "$FEAT_DIR" "$TAG"
          merge_and_cleanup "$STORY_ID" "$TAG"
          break
        elif [[ "$LOG_CHECK" != "OK" ]]; then
          # QA agent crashed or found issues — route to fix path (no retry cost here)
          echo "$TAG QA   ISSUE:  $STORY_ID ($LOG_CHECK) — routing to fix path (see $QA_LOG)"
          if [[ "$DETECTED_STAGE" != "failed-qa" ]]; then
            move_story_to "$STORY_ID" "$CURRENT_STAGE" "failed-qa" "$FEAT_DIR" "$TAG"
          fi
          sync_status_after_transition "$STORY_ID" "FAILED_QA" "qa" "$FEAT_DIR" "$TAG"
          PHASE_ATTEMPTS=0
          continue
        else
          PHASE_ATTEMPTS=0
          echo "$TAG QA   OK:     $STORY_ID (now state=$DETECTED_STATE)"
          sync_status_after_transition "$STORY_ID" "$DETECTED_STATE" "qa" "$FEAT_DIR" "$TAG"
          continue
        fi
        ;;

      # ── Failed QA → fix then re-QA ────────────────────────────
      #
      # Like FAILED_REVIEW: only fix retries are consumed here.
      #
      FAILED_QA)
        if [[ $RETRIES_LEFT -le 0 ]]; then
          FINAL_RESULT="stuck"
          echo "$TAG FIX  STOP:   $STORY_ID (failed-qa, exhausted $MAX_RETRIES fix retries)"
          break
        fi
        ((RETRIES_LEFT--))

        # Fix agent needs worktree to modify code
        if ! ensure_worktree "$STORY_ID" "$TAG"; then
          ((RETRIES_LEFT++))
          echo "$TAG FIX  HEAL:   $STORY_ID (worktree failed — will retry)"
          sleep 5
          continue
        fi
        sync_worktree_for_agents "$STORY_ID" "$TAG"

        local FIX_LOG="$LOG_DIR/${STORY_ID}-fix-qa.log"
        echo "$TAG FIX  START:  $STORY_ID (fixing QA failures, fix $((MAX_RETRIES - RETRIES_LEFT))/$MAX_RETRIES)"
        PHASES_RUN="${PHASES_RUN}fix-qa,"

        claude -p "/dev-fix-story $FEAT_DIR $STORY_ID" \
             $CLAUDE_FLAGS \
             > "$FIX_LOG" 2>&1 || true

        local LOG_CHECK
        LOG_CHECK=$(check_log_for_failure "$FIX_LOG" "fix")

        if [[ "$LOG_CHECK" != "OK" ]]; then
          # Fix agent crashed — self-heal by moving back to ready-to-work
          echo "$TAG FIX  HEAL:   $STORY_ID ($LOG_CHECK) — moving back to ready-to-work for re-impl (see $FIX_LOG)"
          move_story_to "$STORY_ID" "failed-qa" "ready-to-work" "$FEAT_DIR" "$TAG"
          continue
        fi

        # Commit fix
        refresh_state
        if [[ -n "$DETECTED_STORY_DIR" ]]; then
          local TITLE
          TITLE=$(get_story_title "$DETECTED_STORY_DIR")
          commit_and_push "$STORY_ID" "$TITLE" "$TAG"
        fi

        PHASE_ATTEMPTS=0
        echo "$TAG FIX  OK:     $STORY_ID"
        # Fix should move back to ready-for-qa — sync
        refresh_state
        sync_status_after_transition "$STORY_ID" "$DETECTED_STATE" "fix" "$FEAT_DIR" "$TAG"
        continue
        ;;

      # ── Needs split — skip ────────────────────────────────────
      NEEDS_SPLIT)
        echo "$TAG SKIP:        $STORY_ID (needs-split — cannot process)"
        FINAL_RESULT="skip"
        break
        ;;

      # ── Unknown ────────────────────────────────────────────────
      *)
        echo "$TAG SKIP:        $STORY_ID (unhandled state: $CURRENT_STATE)"
        FINAL_RESULT="skip"
        break
        ;;
    esac
  done

  if [[ $MAX_TRANSITIONS -le 0 ]]; then
    FINAL_RESULT="stuck"
    echo "$TAG STUCK:       $STORY_ID (hit max transitions, state=$CURRENT_STATE)"
    echo "$TAG TRANSITIONS: ${TRANSITION_LOG:-none}"
  fi

  echo "result=$FINAL_RESULT phases=$PHASES_RUN state=${CURRENT_STATE:-unknown} transitions=${TRANSITION_LOG:-none}" > "$RESULT_FILE"
}

# ── Parallel execution with job pool ──────────────────────────────────
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

echo ""
echo "Starting $TOTAL stories with parallelism=$PARALLEL..."
echo ""

for i in "${!FILTERED_STORIES[@]}"; do
  STORY_ID="${FILTERED_STORIES[$i]}"
  IDX=$((i + 1))

  wait_for_slot

  process_story "$STORY_ID" "$IDX" &
  RUNNING_PIDS+=($!)

  # Stagger launches to avoid thundering herd
  sleep 3
done

echo ""
echo "All stories launched. Waiting for remaining jobs to complete..."
wait

# ── Wait for any background sync jobs to complete ─────────────────────
# sync_status_after_transition fires KB/index updates in background
wait 2>/dev/null || true

# ── Final reconciliation pass ─────────────────────────────────────────
# Scan for any stories that reached UAT during this run but weren't
# removed from the work order yet (background sync may have raced).
echo ""
echo "Final work order cleanup..."
WO_CLEANUP_COUNT=0
for STORY_ID in "${FILTERED_STORIES[@]}"; do
  RESULT_FILE="$LOG_DIR/.results/${STORY_ID}"
  if [[ -f "$RESULT_FILE" ]]; then
    RESULT=$(cat "$RESULT_FILE")
    if [[ "$RESULT" == *"result=ok"* ]]; then
      # Re-detect: if story is now in UAT, ensure it's removed from work order
      local_feat_dir=$(read_state_field "$STORY_ID" "feature_dir")
      if [[ -n "$local_feat_dir" ]]; then
        kb_st=$(kb_story_state "$STORY_ID")
        detect_story_state "$STORY_ID" "$local_feat_dir" "" "$kb_st"
        if [[ "$DETECTED_STATE" == "UAT" ]]; then
          if grep -q "$STORY_ID" "$WORK_ORDER" 2>/dev/null; then
            remove_from_work_order "$STORY_ID" "$WORK_ORDER" "  "
            ((WO_CLEANUP_COUNT++))
          fi
        fi
      fi
    fi
  fi
done
if [[ $WO_CLEANUP_COUNT -gt 0 ]]; then
  echo "  Removed $WO_CLEANUP_COUNT completed stories from work order."
else
  echo "  Work order already clean."
fi

# ── Collect results ──────────────────────────────────────────────────
RESULT_OK=0
RESULT_FAIL=0
RESULT_SKIP=0
RESULT_STUCK=0
MISSING=0

for STORY_ID in "${FILTERED_STORIES[@]}"; do
  RESULT_FILE="$LOG_DIR/.results/${STORY_ID}"
  if [[ -f "$RESULT_FILE" ]]; then
    RESULT=$(cat "$RESULT_FILE")
    [[ "$RESULT" == *"result=ok"* ]]    && ((RESULT_OK++))    || true
    [[ "$RESULT" == *"result=fail"* ]]  && ((RESULT_FAIL++))  || true
    [[ "$RESULT" == *"result=skip"* ]]  && ((RESULT_SKIP++))  || true
    [[ "$RESULT" == *"result=stuck"* ]] && ((RESULT_STUCK++)) || true
  else
    ((MISSING++))
  fi
done

# ── Append final summary to run.log ─────────────────────────────────
{
  echo ""
  echo "=== Final Summary ==="
  echo "End: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo "OK: $RESULT_OK  FAIL: $RESULT_FAIL  STUCK: $RESULT_STUCK  SKIP: $RESULT_SKIP  Missing: $MISSING"
  echo "---"
  echo "Per-story results:"
  for SID in "${FILTERED_STORIES[@]}"; do
    local_rf="$LOG_DIR/.results/${SID}"
    if [[ -f "$local_rf" ]]; then
      echo "  $SID: $(cat "$local_rf")"
    else
      echo "  $SID: no result (crashed?)"
    fi
  done
} >> "$RUN_LOG"

# ── Print summary ────────────────────────────────────────────────────
echo ""
echo "======================================"
echo " Summary"
echo "======================================"
echo " Total stories:     $TOTAL"
echo " Parallelism:       $PARALLEL"
echo " Max retries:       $MAX_RETRIES"
echo " OK:                $RESULT_OK"
echo " FAILED:            $RESULT_FAIL"
echo " STUCK:             $RESULT_STUCK"
echo " SKIPPED:           $RESULT_SKIP"
[[ $MISSING -gt 0 ]] && echo " Missing results:   $MISSING"
echo " Logs:              $LOG_DIR/"
echo "======================================"

echo ""
echo "Per-story results:"
for STORY_ID in "${FILTERED_STORIES[@]}"; do
  RESULT_FILE="$LOG_DIR/.results/${STORY_ID}"
  if [[ -f "$RESULT_FILE" ]]; then
    echo "  $STORY_ID: $(cat "$RESULT_FILE")"
  else
    echo "  $STORY_ID: no result (crashed?)"
  fi
done

# ── Retry suggestions ────────────────────────────────────────────────
TOTAL_FAIL=$((RESULT_FAIL + RESULT_STUCK + MISSING))
if [[ $TOTAL_FAIL -gt 0 ]]; then
  echo ""
  FAILED_IDS=""
  for STORY_ID in "${FILTERED_STORIES[@]}"; do
    RESULT_FILE="$LOG_DIR/.results/${STORY_ID}"
    if [[ -f "$RESULT_FILE" ]]; then
      RESULT=$(cat "$RESULT_FILE")
      if [[ "$RESULT" == *"result=fail"* || "$RESULT" == *"result=stuck"* ]]; then
        [[ -n "$FAILED_IDS" ]] && FAILED_IDS="${FAILED_IDS},"
        FAILED_IDS="${FAILED_IDS}${STORY_ID}"
      fi
    else
      [[ -n "$FAILED_IDS" ]] && FAILED_IDS="${FAILED_IDS},"
      FAILED_IDS="${FAILED_IDS}${STORY_ID}"
    fi
  done
  if [[ -n "$FAILED_IDS" ]]; then
    echo "Retry failed: $0 --only $FAILED_IDS --max-retries $((MAX_RETRIES + 1))"
  fi
fi

# ── Cleanup ──────────────────────────────────────────────────────────
wo_cleanup
