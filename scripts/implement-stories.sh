#!/usr/bin/env bash
#
# State-machine pipeline: advance all stories for a given plan.
#
# Picks up each story from WHATEVER stage it's currently in and drives it
# forward through the pipeline until it reaches UAT or hits an unrecoverable
# failure. Each story is processed independently as a state machine:
#
#   ready-to-work / backlog  →  implement  →  needs-code-review
#   needs-code-review        →  review     →  ready-for-qa | failed-code-review
#   failed-code-review       →  fix + re-review (if --max-retries > 0)
#   ready-for-qa             →  QA         →  UAT | failed-qa
#   failed-qa                →  fix + re-QA    (if --max-retries > 0)
#
# Stories with no EVIDENCE.yaml in review/QA stages are auto-corrected back
# to ready-to-work for fresh implementation. Duplicate stage directories are
# cleaned up before processing.
#
# Runs up to N stories in parallel (default 2).
# Stories are discovered from the plan's stories.index.md in phase order.
#
# Usage:
#   ./scripts/implement-stories.sh <plan-slug>                    # Run all ready stories (2 parallel)
#   ./scripts/implement-stories.sh <plan-slug> --parallel 2       # Run 2 at a time
#   ./scripts/implement-stories.sh <plan-slug> --dry-run          # Print what would run
#   ./scripts/implement-stories.sh <plan-slug> --from APIP-1030   # Resume from story
#   ./scripts/implement-stories.sh <plan-slug> --impl-only        # Implement only, skip review+QA
#   ./scripts/implement-stories.sh <plan-slug> --review-only      # Review + QA only (already implemented)
#   ./scripts/implement-stories.sh <plan-slug> --qa-only          # QA only (already reviewed)
#   ./scripts/implement-stories.sh <plan-slug> --sequential       # One at a time
#   ./scripts/implement-stories.sh <plan-slug> --autonomy moderate  # Set autonomy level
#   (worktree lifecycle is managed automatically: create → commit → PR → merge → cleanup)
#   ./scripts/implement-stories.sh <plan-slug> --only APIP-0010,APIP-0020  # Retry specific stories
#   ./scripts/implement-stories.sh <plan-slug> --max-retries 1    # Retry failed phases (default 0)
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
  echo "  --parallel N        Run N stories in parallel (default 2)"
  echo "  --sequential        Run one at a time"
  echo "  --dry-run           Print what would run"
  echo "  --from STORY-ID     Resume from a specific story"
  echo "  --impl-only         Implement only, skip review+QA"
  echo "  --review-only       Review + QA only (already implemented)"
  echo "  --qa-only           QA only (already reviewed)"
  echo "  --autonomy LEVEL    Set autonomy level (default aggressive)"
  echo "  --skip-worktree     (ignored — worktrees always managed by script)"
  echo "  --only ID,ID,...    Process only specific stories"
  echo "  --max-retries N     Retry failed phases with fix (default 0)"
  exit 1
fi

source "$(dirname "$0")/lib/resolve-plan.sh"
resolve_plan "$PLAN_SLUG"

LOG_DIR="/tmp/${PLAN_SLUG}-impl-logs"
DRY_RUN=false
RESUME_FROM=""
PARALLEL=2
IMPL_ONLY=false
REVIEW_ONLY=false
QA_ONLY=false
AUTONOMY="aggressive"
# Note: worktree lifecycle is managed by this script (ensure_worktree/merge_and_cleanup)
# --skip-worktree is always passed to dev-implement-story
ONLY_LIST=""
MAX_RETRIES=0

# All tools needed for implement, review, and QA — pre-allow everything
ALLOWED_TOOLS="Read,Write,Edit,Glob,Grep,Bash,Task,mcp__knowledge-base__kb_get,mcp__knowledge-base__kb_search,mcp__knowledge-base__kb_get_story,mcp__knowledge-base__kb_list_stories,mcp__knowledge-base__kb_update_story,mcp__knowledge-base__kb_update_story_status,mcp__knowledge-base__kb_write_artifact,mcp__knowledge-base__kb_read_artifact,mcp__knowledge-base__kb_list_artifacts,mcp__knowledge-base__kb_add,mcp__knowledge-base__kb_list,mcp__knowledge-base__kb_get_related,mcp__knowledge-base__kb_get_plan,mcp__knowledge-base__kb_list_plans,mcp__knowledge-base__kb_log_tokens,mcp__knowledge-base__kb_get_work_state,mcp__knowledge-base__kb_update_work_state,mcp__knowledge-base__kb_get_next_story,mcp__knowledge-base__kb_add_decision,mcp__knowledge-base__kb_add_lesson,mcp__knowledge-base__worktree_register,mcp__knowledge-base__worktree_get_by_story,mcp__knowledge-base__worktree_list_active,mcp__knowledge-base__worktree_mark_complete,mcp__knowledge-base__artifact_search"

# Common claude flags for fully autonomous execution
CLAUDE_FLAGS="--allowedTools $ALLOWED_TOOLS --permission-mode bypassPermissions"

# Parse args
set -- "${POSITIONAL_ARGS[@]}"
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
    --skip-worktree)  shift ;;  # Accepted but ignored — worktrees always managed by script
    --only)           ONLY_LIST="$2"; shift 2 ;;
    --max-retries)    MAX_RETRIES="$2"; shift 2 ;;
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
ALL_STORIES=("${DISCOVERED_STORIES[@]}")

# ── Build filtered list: stories that can be advanced ─────────────────
# Includes any story that is elaborated and not yet completed (UAT/done).
# The state machine in process_story() handles picking the right action.

find_story_dir() {
  local STORY_ID="$1"
  # Search all pipeline stages in progression order (most-progressed first for accuracy)
  for stage_dir in "$FEATURE_DIR"/done "$FEATURE_DIR"/UAT "$FEATURE_DIR"/failed-qa "$FEATURE_DIR"/ready-for-qa "$FEATURE_DIR"/failed-code-review "$FEATURE_DIR"/needs-code-review "$FEATURE_DIR"/in-progress "$FEATURE_DIR"/ready-to-work "$FEATURE_DIR"/backlog "$FEATURE_DIR"/elaboration; do
    if [[ -d "${stage_dir}/${STORY_ID}" ]]; then
      echo "${stage_dir}/${STORY_ID}"
      return 0
    fi
  done
  return 1
}

# Returns the stage name (directory basename) for a story
get_story_stage() {
  local STORY_DIR="$1"
  basename "$(dirname "$STORY_DIR")"
}

is_elaborated() {
  local STORY_DIR="$1"
  # Check for elaboration artifacts
  [[ -d "${STORY_DIR}/_implementation" ]] || [[ -f "${STORY_DIR}/_implementation/ELAB.yaml" ]]
}

is_implemented() {
  local STORY_DIR="$1"
  # Require EVIDENCE.yaml — the definitive proof of implementation
  [[ -f "${STORY_DIR}/_implementation/EVIDENCE.yaml" ]]
}

# Check if the story is past implementation (already in a later stage)
is_past_implementation() {
  local STORY_ID="$1"
  # If the story is already in needs-code-review, ready-for-qa, failed-code-review, UAT, done
  # AND has EVIDENCE.yaml, it's past implementation
  for stage in needs-code-review ready-for-qa failed-code-review failed-qa UAT done; do
    local dir="$FEATURE_DIR/${stage}/${STORY_ID}"
    if [[ -d "$dir" ]] && [[ -f "$dir/_implementation/EVIDENCE.yaml" ]]; then
      return 0
    fi
  done
  return 1
}

is_reviewed() {
  local STORY_DIR="$1"
  # Check for review/verification artifact indicating review passed
  [[ -f "${STORY_DIR}/_implementation/REVIEW.yaml" ]] || \
    [[ -f "${STORY_DIR}/_implementation/VERIFICATION.yaml" ]]
}

is_completed() {
  local STORY_DIR="$1"
  local STORY_ID="$2"
  # In UAT/ or done/
  [[ -d "$FEATURE_DIR/UAT/${STORY_ID}" ]] || [[ -d "$FEATURE_DIR/done/${STORY_ID}" ]]
}

# Stages that are valid starting points for implementation
is_ready_for_impl() {
  local stage="$1"
  [[ "$stage" == "ready-to-work" || "$stage" == "backlog" || "$stage" == "in-progress" ]]
}

# Stages that are valid for code review
is_ready_for_review() {
  local stage="$1"
  [[ "$stage" == "needs-code-review" || "$stage" == "failed-code-review" ]]
}

# Stages that are valid for QA
is_ready_for_qa() {
  local stage="$1"
  [[ "$stage" == "ready-for-qa" || "$stage" == "failed-qa" ]]
}

check_log_for_failure() {
  local LOG_FILE="$1"
  local PHASE="$2"

  # ── File-level checks ──────────────────────────────────────────
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

  # ── Hard stops (original patterns) ─────────────────────────────
  local MATCH
  MATCH=$(grep -oEi "HARD STOP|SETUP BLOCKED|Phase 0 Validation Failed|blocked at Phase 0|precondition.* failure|cannot proceed|PLANNING BLOCKED|PLANNING FAILED|EXECUTION BLOCKED|DOCUMENTATION BLOCKED" "$LOG_FILE" | head -1) || true
  if [[ -n "$MATCH" ]]; then
    echo "FAIL:signal:$MATCH"
    return 0
  fi

  # ── Agent phase failures ───────────────────────────────────────
  MATCH=$(grep -oEi "VERIFICATION (BLOCKED|FAILED)|FIX (BLOCKED|FAILED)|REVIEW (BLOCKED|FAILED)" "$LOG_FILE" | head -1) || true
  if [[ -n "$MATCH" ]]; then
    echo "FAIL:agent:$MATCH"
    return 0
  fi

  # ── Test failures ──────────────────────────────────────────────
  MATCH=$(grep -oEi "E2E.*FAIL|TEST.*FAIL|tests failed" "$LOG_FILE" | head -1) || true
  if [[ -n "$MATCH" ]]; then
    echo "FAIL:test:$MATCH"
    return 0
  fi

  # ── Resource exhaustion ────────────────────────────────────────
  MATCH=$(grep -oEi "ABORT|TIMEOUT|context limit|token budget" "$LOG_FILE" | head -1) || true
  if [[ -n "$MATCH" ]]; then
    echo "FAIL:resource:$MATCH"
    return 0
  fi

  echo "OK"
}

verify_stage_transition() {
  local STORY_ID="$1"
  shift
  # Remaining args are acceptable stage directory names
  for stage in "$@"; do
    if [[ -d "$FEATURE_DIR/${stage}/${STORY_ID}" ]]; then
      return 0
    fi
  done
  return 1
}

# ── Git lifecycle helpers ────────────────────────────────────────────

WORKTREE_BASE="tree/story"

# Generate EVIDENCE.yaml by running validation commands in the story worktree.
# Returns 0 on success (evidence file written), 1 on failure.
generate_evidence() {
  local STORY_ID="$1"
  local STORY_DIR="$2"
  local TAG="${3:-}"
  local WT_PATH="${WORKTREE_BASE}/${STORY_ID}"
  local IMPL_DIR="${STORY_DIR}/_implementation"
  local EVIDENCE_FILE="${IMPL_DIR}/EVIDENCE.yaml"

  # Already has evidence — nothing to do
  if [[ -f "$EVIDENCE_FILE" ]]; then
    return 0
  fi

  if [[ ! -d "$WT_PATH" ]]; then
    echo "${TAG:+$TAG }EVID FAIL:   $STORY_ID (no worktree at $WT_PATH)"
    return 1
  fi

  echo "${TAG:+$TAG }EVID GEN:    $STORY_ID (generating EVIDENCE.yaml from worktree)"

  # Rebase worktree on main before running checks — stale worktrees cause false failures
  echo "${TAG:+$TAG }EVID SYNC:   $STORY_ID (rebasing worktree on main)"
  if ! git -C "$WT_PATH" fetch origin main 2>/dev/null; then
    echo "${TAG:+$TAG }EVID WARN:   $STORY_ID (fetch failed — continuing with current state)"
  else
    if ! git -C "$WT_PATH" rebase origin/main 2>/dev/null; then
      echo "${TAG:+$TAG }EVID WARN:   $STORY_ID (rebase conflicts — aborting rebase, continuing with current state)"
      git -C "$WT_PATH" rebase --abort 2>/dev/null || true
    fi
  fi

  # Collect touched files
  local TOUCHED_FILES
  TOUCHED_FILES=$(git -C "$WT_PATH" diff --name-only main..HEAD 2>/dev/null) || TOUCHED_FILES=""

  if [[ -z "$TOUCHED_FILES" ]]; then
    echo "${TAG:+$TAG }EVID FAIL:   $STORY_ID (no changed files vs main)"
    return 1
  fi

  # Run validation commands and capture results
  local TYPE_CHECK_STATUS="pass" LINT_STATUS="pass" TEST_STATUS="pass" BUILD_STATUS="pass"
  local TYPE_CHECK_OUT="" LINT_OUT="" TEST_OUT="" BUILD_OUT=""

  TYPE_CHECK_OUT=$(cd "$WT_PATH" && pnpm check-types 2>&1) || TYPE_CHECK_STATUS="fail"
  LINT_OUT=$(cd "$WT_PATH" && pnpm lint 2>&1 | tail -20) || LINT_STATUS="fail"
  TEST_OUT=$(cd "$WT_PATH" && pnpm test 2>&1 | tail -20) || TEST_STATUS="fail"
  BUILD_OUT=$(cd "$WT_PATH" && pnpm build 2>&1 | tail -20) || BUILD_STATUS="fail"

  # Count touched files
  local FILE_COUNT
  FILE_COUNT=$(echo "$TOUCHED_FILES" | wc -l | xargs)

  mkdir -p "$IMPL_DIR"
  cat > "$EVIDENCE_FILE" <<YAML
# Auto-generated by implement-stories.sh — evidence recovery
schema: 1
story_id: "${STORY_ID}"
timestamp: "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
generated_by: implement-stories-recovery
touched_files_count: ${FILE_COUNT}
touched_files:
$(echo "$TOUCHED_FILES" | sed 's/^/  - /')
commands_run:
  - command: "pnpm check-types"
    status: "${TYPE_CHECK_STATUS}"
  - command: "pnpm lint"
    status: "${LINT_STATUS}"
  - command: "pnpm test"
    status: "${TEST_STATUS}"
  - command: "pnpm build"
    status: "${BUILD_STATUS}"
overall_status: "$(if [[ "$TYPE_CHECK_STATUS" == "pass" && "$BUILD_STATUS" == "pass" ]]; then echo "pass"; else echo "partial"; fi)"
YAML

  if [[ ! -f "$EVIDENCE_FILE" ]]; then
    echo "${TAG:+$TAG }EVID FAIL:   $STORY_ID (could not write EVIDENCE.yaml)"
    return 1
  fi

  # Evidence file written — but check if the code actually works
  if [[ "$TYPE_CHECK_STATUS" == "fail" && "$BUILD_STATUS" == "fail" && "$TEST_STATUS" == "fail" && "$LINT_STATUS" == "fail" ]]; then
    echo "${TAG:+$TAG }EVID FAIL:   $STORY_ID (EVIDENCE.yaml generated but all checks failed: types=$TYPE_CHECK_STATUS lint=$LINT_STATUS test=$TEST_STATUS build=$BUILD_STATUS — code is broken)"
    rm -f "$EVIDENCE_FILE"  # remove bad evidence so it doesn't gate-pass later
    return 1
  fi

  echo "${TAG:+$TAG }EVID OK:     $STORY_ID (EVIDENCE.yaml generated: types=$TYPE_CHECK_STATUS lint=$LINT_STATUS test=$TEST_STATUS build=$BUILD_STATUS)"
  return 0
}

# Check if a story's worktree has commits beyond main (i.e., code was implemented)
has_worktree_commits() {
  local STORY_ID="$1"
  local WT_PATH="${WORKTREE_BASE}/${STORY_ID}"
  if [[ ! -d "$WT_PATH" ]]; then
    return 1
  fi
  local COMMIT_COUNT
  COMMIT_COUNT=$(git -C "$WT_PATH" rev-list --count main..HEAD 2>/dev/null) || return 1
  [[ "$COMMIT_COUNT" -gt 0 ]]
}

# Check if EVIDENCE.yaml exists and isn't all-fail (code is actually working)
evidence_is_healthy() {
  local EVIDENCE_FILE="$1"
  if [[ ! -f "$EVIDENCE_FILE" ]]; then
    return 1
  fi
  # Check for all-fail pattern: every status line says "fail"
  local fail_count pass_count
  fail_count=$(grep -c 'status:.*fail' "$EVIDENCE_FILE" 2>/dev/null) || fail_count=0
  pass_count=$(grep -c 'status:.*pass' "$EVIDENCE_FILE" 2>/dev/null) || pass_count=0
  # If there are status lines and ALL of them are fail, evidence is unhealthy
  if [[ $fail_count -gt 0 && $pass_count -eq 0 ]]; then
    return 1
  fi
  return 0
}

# Check worktree sync: uncommitted changes + unpushed commits (informational only)
check_worktree_sync() {
  local STORY_ID="$1"
  local TAG="$2"
  local CURRENT_STAGE="$3"
  local WT_PATH="${WORKTREE_BASE}/${STORY_ID}"

  if [[ ! -d "$WT_PATH" ]]; then
    return 0
  fi

  # Check for uncommitted changes
  local DIRTY_COUNT
  DIRTY_COUNT=$(git -C "$WT_PATH" status --porcelain 2>/dev/null | wc -l) || DIRTY_COUNT=0
  DIRTY_COUNT=$(echo "$DIRTY_COUNT" | xargs)  # trim whitespace
  if [[ "$DIRTY_COUNT" -gt 0 ]]; then
    echo "$TAG DRIFT WARN:  $STORY_ID ($DIRTY_COUNT uncommitted changes in worktree)"
  fi

  # For post-implementation stages, check for unpushed commits
  case "$CURRENT_STAGE" in
    needs-code-review|failed-code-review|ready-for-qa|failed-qa|UAT)
      local BRANCH="story/${STORY_ID}"
      local UNPUSHED
      UNPUSHED=$(git -C "$WT_PATH" log "origin/${BRANCH}..HEAD" --oneline 2>/dev/null | wc -l) || UNPUSHED=0
      UNPUSHED=$(echo "$UNPUSHED" | xargs)
      if [[ "$UNPUSHED" -gt 0 ]]; then
        echo "$TAG DRIFT WARN:  $STORY_ID ($UNPUSHED unpushed commits)"
      fi
      ;;
  esac
}

# Validate an artifact file: check existence, non-empty, and required field presence
# Returns: OK, MISSING, EMPTY, FIELD_MISSING:<name>, or FIELD_MISMATCH:<name>=<actual>
validate_artifact() {
  local FILE_PATH="$1"
  local FIELD_NAME="${2:-}"
  local EXPECTED_VALUE="${3:-}"

  if [[ ! -f "$FILE_PATH" ]]; then
    echo "MISSING"
    return 0
  fi

  local FILE_SIZE
  FILE_SIZE=$(wc -c < "$FILE_PATH" 2>/dev/null) || FILE_SIZE=0
  if [[ $FILE_SIZE -lt 10 ]]; then
    echo "EMPTY"
    return 0
  fi

  if [[ -n "$FIELD_NAME" ]]; then
    local FIELD_VALUE
    FIELD_VALUE=$(grep -m1 "^${FIELD_NAME}:" "$FILE_PATH" 2>/dev/null | sed "s/^${FIELD_NAME}: *//" | sed 's/^["'"'"']//;s/["'"'"']$//') || true
    if [[ -z "$FIELD_VALUE" ]]; then
      echo "FIELD_MISSING:${FIELD_NAME}"
      return 0
    fi
    if [[ -n "$EXPECTED_VALUE" && "$FIELD_VALUE" != "$EXPECTED_VALUE" ]]; then
      echo "FIELD_MISMATCH:${FIELD_NAME}=${FIELD_VALUE}"
      return 0
    fi
  fi

  echo "OK"
}

# Create worktree for a story if it doesn't exist
ensure_worktree() {
  local STORY_ID="$1"
  local TAG="$2"
  local BRANCH="story/${STORY_ID}"
  local WT_PATH="${WORKTREE_BASE}/${STORY_ID}"

  # Already exists? Sync it with main
  if [[ -d "$WT_PATH" ]]; then
    echo "$TAG WT   EXISTS:  $STORY_ID ($WT_PATH)"
    # Rebase on main to avoid stale worktree failures
    git -C "$WT_PATH" fetch origin main --quiet 2>/dev/null || true
    if ! git -C "$WT_PATH" rebase origin/main --quiet 2>/dev/null; then
      echo "$TAG WT   WARN:    $STORY_ID (rebase conflicts — aborting, will continue with current state)"
      git -C "$WT_PATH" rebase --abort 2>/dev/null || true
    fi
    return 0
  fi

  git fetch origin --quiet 2>/dev/null || true
  mkdir -p "$(dirname "$WT_PATH")"

  # Branch may already exist (e.g., from a previous partial run)
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

# Commit all changes in a story worktree and push
commit_and_push() {
  local STORY_ID="$1"
  local TITLE="$2"
  local TAG="$3"
  local BRANCH="story/${STORY_ID}"
  local WT_PATH="${WORKTREE_BASE}/${STORY_ID}"

  if [[ ! -d "$WT_PATH" ]]; then
    echo "$TAG COMMIT SKIP: $STORY_ID (no worktree)"
    return 0
  fi

  # Stage and commit
  git -C "$WT_PATH" add -A 2>/dev/null || true
  local CHANGES
  CHANGES=$(git -C "$WT_PATH" status --porcelain 2>/dev/null) || true

  if [[ -z "$CHANGES" ]]; then
    echo "$TAG COMMIT SKIP: $STORY_ID (no changes)"
  else
    git -C "$WT_PATH" commit -m "feat(${STORY_ID}): ${TITLE}" --no-verify 2>/dev/null || true
    echo "$TAG COMMIT OK:   $STORY_ID"
  fi

  # Push (set upstream)
  git -C "$WT_PATH" push -u origin "$BRANCH" --quiet 2>/dev/null || true
  echo "$TAG PUSH   OK:   $STORY_ID"
}

# Create or update a GitHub PR for a story branch
ensure_pr() {
  local STORY_ID="$1"
  local TITLE="$2"
  local TAG="$3"
  local BRANCH="story/${STORY_ID}"

  # Check for existing PR
  local EXISTING_PR
  EXISTING_PR=$(gh pr list --head "$BRANCH" --state open --json number,url --jq '.[0].url' 2>/dev/null) || true

  if [[ -n "$EXISTING_PR" ]]; then
    echo "$TAG PR   EXISTS:  $STORY_ID ($EXISTING_PR)"
    return 0
  fi

  # Create new PR
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

# Squash-merge PR, delete branch, remove worktree
merge_and_cleanup() {
  local STORY_ID="$1"
  local TAG="$2"
  local BRANCH="story/${STORY_ID}"
  local WT_PATH="${WORKTREE_BASE}/${STORY_ID}"

  # Find the PR number
  local PR_NUMBER
  PR_NUMBER=$(gh pr list --head "$BRANCH" --state open --json number --jq '.[0].number' 2>/dev/null) || true

  if [[ -n "$PR_NUMBER" ]]; then
    gh pr merge "$PR_NUMBER" --squash --delete-branch 2>/dev/null || true
    echo "$TAG MERGE  OK:   $STORY_ID (PR #$PR_NUMBER squash-merged)"
  else
    echo "$TAG MERGE  SKIP: $STORY_ID (no open PR)"
  fi

  # Remove worktree
  if [[ -d "$WT_PATH" ]]; then
    git worktree remove "$WT_PATH" 2>/dev/null || \
      git worktree remove "$WT_PATH" --force 2>/dev/null || true
    echo "$TAG WT   REMOVE: $STORY_ID"
  fi

  # Clean up local branch
  git branch -D "$BRANCH" 2>/dev/null || true
  git worktree prune 2>/dev/null || true
}

# Get story title from story.yaml
get_story_title() {
  local STORY_DIR="$1"
  grep -m1 "^title:" "${STORY_DIR}/story.yaml" 2>/dev/null | sed 's/^title: *//' | sed 's/^["'"'"']//;s/["'"'"']$//' || echo "Implementation"
}

# ── Dependency helpers ───────────────────────────────────────────────

# Build dependency map from stories.index.md as a flat file (bash 3.2 compatible)
# Format: STORY_ID<tab>dep1,dep2,... (one line per story)
DEPS_FILE=$(mktemp /tmp/story-deps.XXXXXX)
trap "rm -f $DEPS_FILE" EXIT

parse_dependencies() {
  local index_file="$FEATURE_DIR/stories.index.md"
  > "$DEPS_FILE"  # clear
  if [[ ! -f "$index_file" ]]; then
    return 0
  fi

  # Parse table rows: | STORY_ID | Title | Dependencies | Status |
  while IFS='|' read -r _ story_id _ deps _; do
    story_id=$(echo "$story_id" | xargs)   # trim whitespace
    deps=$(echo "$deps" | xargs)

    # Skip non-story rows
    if [[ ! "$story_id" =~ ^[A-Z]+-[0-9]+$ ]]; then
      continue
    fi

    if [[ "$deps" == "none" || -z "$deps" || "$deps" == "---" ]]; then
      echo "${story_id}	" >> "$DEPS_FILE"
    else
      echo "${story_id}	${deps}" >> "$DEPS_FILE"
    fi
  done < "$index_file"
}

# Look up deps for a story from the flat file
_get_deps() {
  local sid="$1"
  local line
  line=$(grep "^${sid}	" "$DEPS_FILE" 2>/dev/null) || true
  if [[ -n "$line" ]]; then
    echo "${line#*	}"
  fi
}

# Check if all dependencies of a story are completed (in UAT or done)
check_dependencies_met() {
  local STORY_ID="$1"
  local deps
  deps=$(_get_deps "$STORY_ID")

  # No dependencies — always ready
  if [[ -z "$deps" ]]; then
    return 0
  fi

  local unmet=""
  # Split comma-separated deps
  IFS=',' read -ra DEP_LIST <<< "$deps"
  for dep in "${DEP_LIST[@]}"; do
    dep=$(echo "$dep" | xargs)  # trim
    [[ -z "$dep" ]] && continue

    # Check if dep is in UAT or done
    if [[ -d "$FEATURE_DIR/UAT/${dep}" ]] || [[ -d "$FEATURE_DIR/done/${dep}" ]]; then
      continue
    fi
    # Not completed — unmet dependency
    if [[ -n "$unmet" ]]; then
      unmet="${unmet}, ${dep}"
    else
      unmet="$dep"
    fi
  done

  if [[ -n "$unmet" ]]; then
    echo "$unmet"
    return 1
  fi
  return 0
}

# ── Clean up duplicate stage directories ──────────────────────────────
# If a story exists in multiple stage dirs, keep only the most-progressed one
STAGE_ORDER=(elaboration backlog ready-to-work in-progress needs-code-review failed-code-review ready-for-qa failed-qa UAT done)

cleanup_duplicate_stages() {
  local STORY_ID="$1"
  local found_stages=()
  for stage in "${STAGE_ORDER[@]}"; do
    if [[ -d "$FEATURE_DIR/${stage}/${STORY_ID}" ]]; then
      found_stages+=("$stage")
    fi
  done
  if [[ ${#found_stages[@]} -le 1 ]]; then
    return 0
  fi
  # Keep the last one (most progressed) — but validate: if a later stage
  # has no EVIDENCE.yaml and an earlier one does, prefer the one with evidence
  local best_stage="${found_stages[-1]}"
  local best_has_evidence=false
  [[ -f "$FEATURE_DIR/${best_stage}/${STORY_ID}/_implementation/EVIDENCE.yaml" ]] && best_has_evidence=true

  # If the "most progressed" stage has no evidence but a less-progressed one does,
  # the most-progressed copy is a ghost — remove it and keep the one with evidence
  if ! $best_has_evidence; then
    for stage in "${found_stages[@]}"; do
      if [[ -f "$FEATURE_DIR/${stage}/${STORY_ID}/_implementation/EVIDENCE.yaml" ]]; then
        best_stage="$stage"
        best_has_evidence=true
        break
      fi
    done
  fi

  for stage in "${found_stages[@]}"; do
    if [[ "$stage" != "$best_stage" ]]; then
      echo "  DEDUP: Removing $stage/$STORY_ID (keeping $best_stage)"
      rm -rf "$FEATURE_DIR/${stage}/${STORY_ID}"
    fi
  done
}

# Run dedup for all discovered stories
DEDUP_COUNT=0
for STORY_ID in "${ALL_STORIES[@]}"; do
  output=$(cleanup_duplicate_stages "$STORY_ID" 2>&1)
  if [[ -n "$output" ]]; then
    echo "$output"
    ((DEDUP_COUNT++))
  fi
done
[[ $DEDUP_COUNT -gt 0 ]] && echo "Cleaned up $DEDUP_COUNT stories with duplicate stage directories."

# ── Parse dependencies from index ────────────────────────────────────
parse_dependencies

# ── Build --only set (comma-separated → lookup string) ───────────────
ONLY_SET=""
if [[ -n "$ONLY_LIST" ]]; then
  ONLY_SET=",$ONLY_LIST,"
fi

# ── Filter stories based on mode ────────────────────────────────────
FILTERED_STORIES=()
SKIPPING=true
[[ -z "$RESUME_FROM" ]] && SKIPPING=false

SKIPPED_COUNT=0
NOT_READY_COUNT=0

FILTER_LOG="$LOG_DIR/filter.log"
{
  echo "=== Filter Log ==="
  echo "Timestamp: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo "Mode: impl_only=$IMPL_ONLY review_only=$REVIEW_ONLY qa_only=$QA_ONLY"
  echo "Resume from: ${RESUME_FROM:-<none>}"
  echo "Only list: ${ONLY_LIST:-<none>}"
  echo "Total stories in index: ${#ALL_STORIES[@]}"
  echo "---"
} > "$FILTER_LOG"

for STORY_ID in "${ALL_STORIES[@]}"; do
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

  # Find story directory
  STORY_DIR=$(find_story_dir "$STORY_ID" 2>/dev/null) || true

  if [[ -z "$STORY_DIR" ]]; then
    ((NOT_READY_COUNT++))
    echo "SKIP $STORY_ID reason=no-directory-found" >> "$FILTER_LOG"
    continue
  fi

  local_stage=$(basename "$(dirname "$STORY_DIR")")

  # Skip completed stories
  if is_completed "$STORY_DIR" "$STORY_ID"; then
    ((SKIPPED_COUNT++))
    echo "SKIP $STORY_ID reason=completed stage=$local_stage" >> "$FILTER_LOG"
    continue
  fi

  # Skip stories still in elaboration — not ready for any phase
  if [[ "$local_stage" == "elaboration" ]]; then
    ((NOT_READY_COUNT++))
    echo "SKIP $STORY_ID reason=still-in-elaboration stage=$local_stage" >> "$FILTER_LOG"
    continue
  fi

  # Skip stories with needs-split status
  if grep -q "needs.split\|SPLIT_REQUIRED" "${STORY_DIR}/story.yaml" 2>/dev/null; then
    ((NOT_READY_COUNT++))
    echo "SKIP $STORY_ID reason=needs-split stage=$local_stage" >> "$FILTER_LOG"
    continue
  fi

  # Must be elaborated (have _implementation/ dir with ELAB)
  if ! is_elaborated "$STORY_DIR"; then
    ((NOT_READY_COUNT++))
    echo "SKIP $STORY_ID reason=not-elaborated stage=$local_stage" >> "$FILTER_LOG"
    continue
  fi

  # Skip stories with unmet dependencies (deps must be in UAT/done)
  # Only check for stories that haven't started yet — already-in-progress stories continue
  if [[ "$local_stage" == "ready-to-work" || "$local_stage" == "backlog" ]]; then
    unmet_deps=$(check_dependencies_met "$STORY_ID" 2>/dev/null) || true
    if [[ -n "$unmet_deps" ]]; then
      ((NOT_READY_COUNT++))
      echo "SKIP $STORY_ID reason=unmet-dependencies deps=$unmet_deps stage=$local_stage" >> "$FILTER_LOG"
      continue
    fi
  fi

  # Mode filters: narrow to relevant stages when using --*-only flags
  if $REVIEW_ONLY; then
    if [[ "$local_stage" != "needs-code-review" && "$local_stage" != "failed-code-review" ]]; then
      ((SKIPPED_COUNT++))
      echo "SKIP $STORY_ID reason=not-in-review-stage stage=$local_stage" >> "$FILTER_LOG"
      continue
    fi
  fi

  if $QA_ONLY; then
    if [[ "$local_stage" != "ready-for-qa" && "$local_stage" != "failed-qa" ]]; then
      ((SKIPPED_COUNT++))
      echo "SKIP $STORY_ID reason=not-in-qa-stage stage=$local_stage" >> "$FILTER_LOG"
      continue
    fi
  fi

  echo "INCLUDE $STORY_ID stage=$local_stage" >> "$FILTER_LOG"
  FILTERED_STORIES+=("$STORY_ID")
done

TOTAL=${#FILTERED_STORIES[@]}

if [[ $TOTAL -eq 0 ]]; then
  echo "No stories ready for processing."
  echo "  Skipped (--from/done): $SKIPPED_COUNT"
  echo "  Not ready:             $NOT_READY_COUNT"
  echo ""
  echo "Run ./scripts/generate-stories.sh $PLAN_SLUG first to generate and elaborate stories."
  exit 0
fi

# Build impl flags (always --skip-worktree since script manages worktrees)
IMPL_FLAGS="--autonomous=$AUTONOMY --skip-worktree"

echo "======================================"
echo " Implementation Pipeline"
echo "======================================"
echo " Plan slug:    $PLAN_SLUG"
echo " Feature dir:  $FEATURE_DIR"
echo " Ready stories: $TOTAL"
echo " Not ready:    $NOT_READY_COUNT"
echo " Skipped:      $SKIPPED_COUNT"
echo " Parallel:     $PARALLEL"
echo " Autonomy:     $AUTONOMY"
echo " Worktree mgmt: enabled (script-managed)"
echo " Max retries:  $MAX_RETRIES"
echo " Dry run:      $DRY_RUN"
echo " Impl only:    $IMPL_ONLY"
echo " Review only:  $REVIEW_ONLY"
echo " QA only:      $QA_ONLY"
[[ -n "$ONLY_LIST" ]] && echo " Only:         $ONLY_LIST"
echo " Logs:         $LOG_DIR/"
echo "======================================"
echo ""
echo "Stories to process:"
for s in "${FILTERED_STORIES[@]}"; do
  echo "  - $s"
done
echo ""

# ── Persist run metadata ──────────────────────────────────────────────
RUN_LOG="$LOG_DIR/run.log"
{
  echo "=== Run Log ==="
  echo "Start: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo "Plan slug: $PLAN_SLUG"
  echo "Feature dir: $FEATURE_DIR"
  echo "Mode: impl_only=$IMPL_ONLY review_only=$REVIEW_ONLY qa_only=$QA_ONLY"
  echo "Parallel: $PARALLEL"
  echo "Autonomy: $AUTONOMY"
  echo "Worktree mgmt: enabled"
  echo "Dry run: $DRY_RUN"
  [[ -n "$ONLY_LIST" ]] && echo "Only: $ONLY_LIST"
  [[ -n "$RESUME_FROM" ]] && echo "Resume from: $RESUME_FROM"
  echo "Ready stories: $TOTAL"
  echo "Not ready: $NOT_READY_COUNT"
  echo "Skipped: $SKIPPED_COUNT"
  echo "---"
  echo "Stories to process:"
  for s in "${FILTERED_STORIES[@]}"; do
    echo "  - $s"
  done
  echo "---"
} > "$RUN_LOG"

# ── State machine: determine what action a story needs next ───────────
#
# Pipeline stages and the action that advances each:
#
#   ready-to-work / backlog / in-progress  →  /dev-implement-story   →  needs-code-review
#   needs-code-review                      →  /dev-code-review       →  ready-for-qa | failed-code-review
#   failed-code-review                     →  /dev-fix-story         →  needs-code-review  (then re-review)
#   ready-for-qa                           →  /qa-verify-story       →  UAT | failed-qa
#   failed-qa                              →  /dev-fix-story         →  ready-for-qa       (then re-QA)
#   UAT / done                             →  nothing (completed)
#
# The worker loops: resolve stage → pick action → run → re-resolve → repeat
# until the story reaches UAT/done or an action fails.

# Move story directory to a new stage (if not already there)
move_story_to() {
  local STORY_ID="$1"
  local FROM_STAGE="$2"
  local TO_STAGE="$3"
  local TAG="$4"

  if [[ "$FROM_STAGE" == "$TO_STAGE" ]]; then
    return 0
  fi
  if [[ -d "$FEATURE_DIR/$TO_STAGE/$STORY_ID" ]]; then
    # Already there — remove the old one
    rm -rf "$FEATURE_DIR/$FROM_STAGE/$STORY_ID"
    return 0
  fi
  mkdir -p "$FEATURE_DIR/$TO_STAGE"
  mv "$FEATURE_DIR/$FROM_STAGE/$STORY_ID" "$FEATURE_DIR/$TO_STAGE/$STORY_ID"
  echo "$TAG MOVE:        $STORY_ID → $TO_STAGE/"
}

# ── Worker function (runs in subshell for each story) ───────────────
process_story() {
  local STORY_ID="$1"
  local IDX="$2"
  local STATUS_FILE="$RESULT_DIR/${STORY_ID}"
  local FINAL_RESULT="ok"
  local PHASES_RUN=""

  local TAG="[${IDX}/${TOTAL}]"

  # Helper: refresh story dir and stage (story may move between phases)
  refresh_story_state() {
    STORY_DIR=$(find_story_dir "$STORY_ID" 2>/dev/null) || true
    if [[ -n "$STORY_DIR" ]]; then
      CURRENT_STAGE=$(get_story_stage "$STORY_DIR")
    else
      CURRENT_STAGE=""
    fi
  }

  local STORY_DIR="" CURRENT_STAGE=""
  refresh_story_state

  if [[ -z "$STORY_DIR" ]]; then
    echo "$TAG SKIP:        $STORY_ID (no directory found)"
    echo "result=skip reason=no-directory" > "$STATUS_FILE"
    return 0
  fi

  # Has EVIDENCE.yaml that isn't all-fail? (true proof of implementation)
  has_evidence() {
    evidence_is_healthy "$STORY_DIR/_implementation/EVIDENCE.yaml"
  }

  echo "$TAG PICK UP:     $STORY_ID (stage=$CURRENT_STAGE)"

  # ── State machine loop ─────────────────────────────────────────
  local RETRIES_LEFT=$MAX_RETRIES
  local MAX_TRANSITIONS=12  # backstop: increased for legitimate retry paths
  local TRANSITION_LOG=""
  local PREV_STAGE=""

  while [[ $MAX_TRANSITIONS -gt 0 ]]; do
    ((MAX_TRANSITIONS--))
    refresh_story_state

    # ── Cycle detection via transition logging ──────────────────
    if [[ -n "$PREV_STAGE" && -n "$CURRENT_STAGE" && "$PREV_STAGE" != "$CURRENT_STAGE" ]]; then
      local PAIR="${PREV_STAGE}→${CURRENT_STAGE}"
      if [[ "$TRANSITION_LOG" == *"|${PAIR}|"* ]]; then
        echo "$TAG CYCLE:       $STORY_ID (repeated transition: $PAIR)"
        echo "$TAG CYCLE PATH:  ${TRANSITION_LOG}|${PAIR}|"
        FINAL_RESULT="fail"
        break
      fi
      TRANSITION_LOG="${TRANSITION_LOG}|${PAIR}|"
    fi
    PREV_STAGE="$CURRENT_STAGE"

    # ── Worktree drift check (informational) ────────────────────
    check_worktree_sync "$STORY_ID" "$TAG" "$CURRENT_STAGE"

    case "$CURRENT_STAGE" in

      # ── Already done ────────────────────────────────────────
      UAT|done)
        # Story completed — merge PR and clean up worktree
        merge_and_cleanup "$STORY_ID" "$TAG"
        echo "$TAG DONE:        $STORY_ID (stage=$CURRENT_STAGE)"
        break
        ;;

      # ── Needs implementation ────────────────────────────────
      ready-to-work|backlog|in-progress)
        if $REVIEW_ONLY || $QA_ONLY; then
          echo "$TAG SKIP:        $STORY_ID (stage=$CURRENT_STAGE, but running in ${REVIEW_ONLY:+review}${QA_ONLY:+qa}-only mode)"
          FINAL_RESULT="skip"
          break
        fi

        # Check dependencies before starting implementation
        local unmet_deps
        unmet_deps=$(check_dependencies_met "$STORY_ID" 2>/dev/null) || true
        if [[ -n "$unmet_deps" ]]; then
          FINAL_RESULT="skip"
          echo "$TAG SKIP:        $STORY_ID (unmet dependencies: $unmet_deps)"
          break
        fi

        # If it already has evidence (e.g., in-progress but implemented), just move forward
        if has_evidence; then
          echo "$TAG IMPL SKIP:   $STORY_ID (has EVIDENCE.yaml, advancing to needs-code-review)"
          move_story_to "$STORY_ID" "$CURRENT_STAGE" "needs-code-review" "$TAG"
          continue
        fi

        # Create worktree before implementation
        ensure_worktree "$STORY_ID" "$TAG" || {
          FINAL_RESULT="fail"
          echo "$TAG IMPL FAIL:   $STORY_ID (worktree creation failed)"
          break
        }

        local IMPL_LOG="$LOG_DIR/${STORY_ID}-impl.log"
        echo "$TAG IMPL START:  $STORY_ID"
        PHASES_RUN="${PHASES_RUN}impl,"

        claude -p "/dev-implement-story $FEATURE_DIR $STORY_ID $IMPL_FLAGS" \
             $CLAUDE_FLAGS \
             > "$IMPL_LOG" 2>&1 || true

        local LOG_CHECK
        LOG_CHECK=$(check_log_for_failure "$IMPL_LOG" "implement")

        refresh_story_state

        if [[ "$LOG_CHECK" != "OK" ]]; then
          FINAL_RESULT="fail"
          echo "$TAG IMPL FAIL:   $STORY_ID ($LOG_CHECK) (see $IMPL_LOG)"
          break
        fi

        # Verify implementation produced evidence and moved stage
        if ! has_evidence && ! verify_stage_transition "$STORY_ID" needs-code-review; then
          FINAL_RESULT="fail"
          echo "$TAG IMPL FAIL:   $STORY_ID (no EVIDENCE.yaml produced, still in $CURRENT_STAGE) (see $IMPL_LOG)"
          break
        fi

        # Post-impl artifact validation: EVIDENCE.yaml must have touched_files
        local EVID_CHECK
        EVID_CHECK=$(validate_artifact "$STORY_DIR/_implementation/EVIDENCE.yaml" "touched_files")
        if [[ "$EVID_CHECK" != "OK" ]]; then
          echo "$TAG IMPL WARN:   $STORY_ID (EVIDENCE.yaml validation: $EVID_CHECK — attempting recovery)"
          if ! generate_evidence "$STORY_ID" "$STORY_DIR" "$TAG"; then
            FINAL_RESULT="fail"
            echo "$TAG IMPL FAIL:   $STORY_ID (EVIDENCE.yaml invalid and recovery failed)"
            break
          fi
        fi

        # Ensure it's in needs-code-review/
        refresh_story_state
        if [[ "$CURRENT_STAGE" == "in-progress" ]]; then
          move_story_to "$STORY_ID" "in-progress" "needs-code-review" "$TAG"
        fi
        echo "$TAG IMPL OK:     $STORY_ID"

        # Commit + push + create PR after successful implementation
        local TITLE
        TITLE=$(get_story_title "$STORY_DIR")
        commit_and_push "$STORY_ID" "$TITLE" "$TAG"
        ensure_pr "$STORY_ID" "$TITLE" "$TAG"

        if $IMPL_ONLY; then break; fi
        continue  # loop back — next iteration will pick up needs-code-review
        ;;

      # ── Needs code review ───────────────────────────────────
      needs-code-review)
        if $QA_ONLY; then
          echo "$TAG SKIP:        $STORY_ID (stage=$CURRENT_STAGE, but running in qa-only mode)"
          FINAL_RESULT="skip"
          break
        fi

        # Guard: must have EVIDENCE.yaml to review
        if ! has_evidence; then
          if has_worktree_commits "$STORY_ID"; then
            # Code exists — try to generate evidence directly
            echo "$TAG REVW BLOCK:  $STORY_ID (no EVIDENCE.yaml but worktree has commits — generating evidence)"
            if generate_evidence "$STORY_ID" "$STORY_DIR" "$TAG"; then
              # Evidence generated — stay in needs-code-review and proceed to review
              continue
            else
              echo "$TAG REVW BLOCK:  $STORY_ID (evidence generation failed — falling back to ready-to-work)"
              move_story_to "$STORY_ID" "needs-code-review" "ready-to-work" "$TAG"
            fi
          else
            echo "$TAG REVW BLOCK:  $STORY_ID (in needs-code-review but no EVIDENCE.yaml — moving back to ready-to-work)"
            move_story_to "$STORY_ID" "needs-code-review" "ready-to-work" "$TAG"
          fi
          if $REVIEW_ONLY; then
            FINAL_RESULT="fail"
            break
          fi
          continue
        fi

        local REVIEW_LOG="$LOG_DIR/${STORY_ID}-review.log"
        echo "$TAG REVW START:  $STORY_ID"
        PHASES_RUN="${PHASES_RUN}review,"

        claude -p "/dev-code-review $FEATURE_DIR $STORY_ID" \
             $CLAUDE_FLAGS \
             > "$REVIEW_LOG" 2>&1 || true

        local LOG_CHECK
        LOG_CHECK=$(check_log_for_failure "$REVIEW_LOG" "review")

        refresh_story_state

        # Post-review artifact validation (informational)
        local REVW_CHECK
        REVW_CHECK=$(validate_artifact "$STORY_DIR/_implementation/REVIEW.yaml" "verdict")
        if [[ "$REVW_CHECK" != "OK" ]]; then
          echo "$TAG REVW INFO:   $STORY_ID (REVIEW.yaml validation: $REVW_CHECK)"
        fi

        if [[ "$LOG_CHECK" != "OK" ]]; then
          # Review agent hit a hard stop — check if it's a missing-artifact issue we can recover from
          if ! has_evidence; then
            echo "$TAG REVW RECOV:  $STORY_ID ($LOG_CHECK) — no EVIDENCE.yaml, moving back to ready-to-work"
            move_story_to "$STORY_ID" "needs-code-review" "ready-to-work" "$TAG"
            continue
          fi
          # Review failed for another reason — move to failed-code-review so fix can run
          echo "$TAG REVW ISSUE:  $STORY_ID ($LOG_CHECK) — moving to failed-code-review for fix (see $REVIEW_LOG)"
          if [[ "$CURRENT_STAGE" != "failed-code-review" ]]; then
            move_story_to "$STORY_ID" "needs-code-review" "failed-code-review" "$TAG"
          fi
          continue  # loop picks up failed-code-review → fix → re-review
        fi

        # Review passed → ready-for-qa, or review failed → failed-code-review
        # Either way the loop continues and the next case handles it
        echo "$TAG REVW OK:     $STORY_ID (now in $CURRENT_STAGE)"

        if $IMPL_ONLY; then break; fi
        continue
        ;;

      # ── Failed code review → fix then re-review ────────────
      failed-code-review)
        if $QA_ONLY; then
          echo "$TAG SKIP:        $STORY_ID (stage=$CURRENT_STAGE, but running in qa-only mode)"
          FINAL_RESULT="skip"
          break
        fi

        if [[ $RETRIES_LEFT -le 0 ]]; then
          FINAL_RESULT="fail"
          echo "$TAG FIX  STOP:   $STORY_ID (failed-code-review, no retries left)"
          break
        fi
        ((RETRIES_LEFT--))

        # Guard: must have EVIDENCE.yaml to fix
        if ! has_evidence; then
          if has_worktree_commits "$STORY_ID"; then
            # Try to generate evidence directly before fix
            echo "$TAG FIX  NOTE:   $STORY_ID (no EVIDENCE.yaml — attempting evidence generation before fix)"
            if ! generate_evidence "$STORY_ID" "$STORY_DIR" "$TAG"; then
              echo "$TAG FIX  BLOCK:  $STORY_ID (evidence generation failed — moving back to ready-to-work)"
              move_story_to "$STORY_ID" "failed-code-review" "ready-to-work" "$TAG"
              continue
            fi
          else
            echo "$TAG FIX  BLOCK:  $STORY_ID (in failed-code-review but no EVIDENCE.yaml and no worktree commits — moving back to ready-to-work)"
            move_story_to "$STORY_ID" "failed-code-review" "ready-to-work" "$TAG"
            continue
          fi
        fi

        local FIX_LOG="$LOG_DIR/${STORY_ID}-fix-review.log"
        echo "$TAG FIX  START:  $STORY_ID (fixing review failures, retry $((MAX_RETRIES - RETRIES_LEFT))/$MAX_RETRIES)"
        PHASES_RUN="${PHASES_RUN}fix-review,"

        claude -p "/dev-fix-story $FEATURE_DIR $STORY_ID" \
             $CLAUDE_FLAGS \
             > "$FIX_LOG" 2>&1 || true

        local LOG_CHECK
        LOG_CHECK=$(check_log_for_failure "$FIX_LOG" "fix")

        refresh_story_state

        if [[ "$LOG_CHECK" != "OK" ]]; then
          # Fix agent failed — move back to ready-to-work for fresh implementation
          echo "$TAG FIX  RECOV:  $STORY_ID ($LOG_CHECK) — moving back to ready-to-work (see $FIX_LOG)"
          move_story_to "$STORY_ID" "failed-code-review" "ready-to-work" "$TAG"
          continue
        fi

        echo "$TAG FIX  OK:     $STORY_ID (now in $CURRENT_STAGE)"

        # Commit + push fix changes
        local TITLE
        TITLE=$(get_story_title "$STORY_DIR")
        commit_and_push "$STORY_ID" "$TITLE" "$TAG"

        # Fix should move story to needs-code-review — loop will pick up review
        continue
        ;;

      # ── Ready for QA ────────────────────────────────────────
      ready-for-qa)
        # Guard: must have EVIDENCE.yaml and REVIEW.yaml to run QA
        # If missing, loop back to the appropriate earlier stage to generate them
        if ! has_evidence; then
          if has_worktree_commits "$STORY_ID"; then
            echo "$TAG QA   BLOCK:  $STORY_ID (no EVIDENCE.yaml but worktree has commits — generating evidence)"
            if generate_evidence "$STORY_ID" "$STORY_DIR" "$TAG"; then
              # Evidence generated — move to needs-code-review so review runs next
              move_story_to "$STORY_ID" "ready-for-qa" "needs-code-review" "$TAG"
            else
              echo "$TAG QA   BLOCK:  $STORY_ID (evidence generation failed — falling back to ready-to-work)"
              move_story_to "$STORY_ID" "ready-for-qa" "ready-to-work" "$TAG"
            fi
          else
            echo "$TAG QA   BLOCK:  $STORY_ID (no EVIDENCE.yaml — moving back to ready-to-work for fresh implementation)"
            move_story_to "$STORY_ID" "ready-for-qa" "ready-to-work" "$TAG"
          fi
          continue
        fi
        if ! is_reviewed "$STORY_DIR"; then
          echo "$TAG QA   BLOCK:  $STORY_ID (no REVIEW.yaml — moving back to needs-code-review)"
          move_story_to "$STORY_ID" "ready-for-qa" "needs-code-review" "$TAG"
          continue  # loop back — will run review, then return here with REVIEW.yaml
        fi

        local QA_LOG="$LOG_DIR/${STORY_ID}-qa.log"
        echo "$TAG QA   START:  $STORY_ID"
        PHASES_RUN="${PHASES_RUN}qa,"

        claude -p "/qa-verify-story $FEATURE_DIR $STORY_ID" \
             $CLAUDE_FLAGS \
             > "$QA_LOG" 2>&1 || true

        local LOG_CHECK
        LOG_CHECK=$(check_log_for_failure "$QA_LOG" "qa")

        refresh_story_state

        # Post-QA artifact validation (informational)
        local QA_CHECK
        QA_CHECK=$(validate_artifact "$STORY_DIR/_implementation/VERIFICATION.yaml" "verdict")
        if [[ "$QA_CHECK" != "OK" && ("$CURRENT_STAGE" == "UAT" || "$CURRENT_STAGE" == "done") ]]; then
          echo "$TAG QA   WARN:   $STORY_ID (VERIFICATION.yaml validation: $QA_CHECK but stage=$CURRENT_STAGE — mismatch)"
        fi

        if [[ "$CURRENT_STAGE" == "UAT" || "$CURRENT_STAGE" == "done" ]]; then
          echo "$TAG QA   OK:     $STORY_ID"
          merge_and_cleanup "$STORY_ID" "$TAG"
        elif [[ "$CURRENT_STAGE" == "failed-qa" ]]; then
          # QA found real issues — loop will pick up failed-qa and run fix
          echo "$TAG QA   ISSUE:  $STORY_ID ($LOG_CHECK) — looping to fix (see $QA_LOG)"
        elif [[ "$CURRENT_STAGE" == "ready-for-qa" ]]; then
          # QA ran but stage didn't advance — missing artifacts or silent agent failure
          if ! has_evidence || ! is_reviewed "$STORY_DIR"; then
            echo "$TAG QA   RECOV:  $STORY_ID (QA found missing artifacts — moving back to needs-code-review)"
            move_story_to "$STORY_ID" "ready-for-qa" "needs-code-review" "$TAG"
          else
            # Artifacts exist but QA didn't advance — move to failed-qa so fix can run
            echo "$TAG QA   RECOV:  $STORY_ID (QA ran but stage unchanged — moving to failed-qa for fix) (see $QA_LOG)"
            move_story_to "$STORY_ID" "ready-for-qa" "failed-qa" "$TAG"
          fi
        else
          echo "$TAG QA   OK:     $STORY_ID (now in $CURRENT_STAGE)"
        fi
        continue
        ;;

      # ── Failed QA → fix then re-QA ─────────────────────────
      failed-qa)
        if [[ $RETRIES_LEFT -le 0 ]]; then
          FINAL_RESULT="fail"
          echo "$TAG FIX  STOP:   $STORY_ID (failed-qa, no retries left)"
          break
        fi
        ((RETRIES_LEFT--))

        local FIX_LOG="$LOG_DIR/${STORY_ID}-fix-qa.log"
        echo "$TAG FIX  START:  $STORY_ID (fixing QA failures, retry $((MAX_RETRIES - RETRIES_LEFT))/$MAX_RETRIES)"
        PHASES_RUN="${PHASES_RUN}fix-qa,"

        claude -p "/dev-fix-story $FEATURE_DIR $STORY_ID" \
             $CLAUDE_FLAGS \
             > "$FIX_LOG" 2>&1 || true

        local LOG_CHECK
        LOG_CHECK=$(check_log_for_failure "$FIX_LOG" "fix")

        refresh_story_state

        if [[ "$LOG_CHECK" != "OK" ]]; then
          # Fix agent failed — move back to ready-to-work for fresh implementation
          echo "$TAG FIX  RECOV:  $STORY_ID ($LOG_CHECK) — moving back to ready-to-work (see $FIX_LOG)"
          move_story_to "$STORY_ID" "failed-qa" "ready-to-work" "$TAG"
          continue
        fi

        echo "$TAG FIX  OK:     $STORY_ID (now in $CURRENT_STAGE)"

        # Commit + push fix changes
        local TITLE
        TITLE=$(get_story_title "$STORY_DIR")
        commit_and_push "$STORY_ID" "$TITLE" "$TAG"

        # Fix should move story to ready-for-qa — loop will pick up QA
        continue
        ;;

      # ── Unknown stage ───────────────────────────────────────
      *)
        FINAL_RESULT="skip"
        echo "$TAG SKIP:        $STORY_ID (unhandled stage: $CURRENT_STAGE)"
        break
        ;;
    esac
  done

  if [[ $MAX_TRANSITIONS -le 0 ]]; then
    FINAL_RESULT="fail"
    echo "$TAG STUCK:       $STORY_ID (hit max transitions safety limit, stage=$CURRENT_STAGE)"
    echo "$TAG TRANSITIONS: ${TRANSITION_LOG:-none}"
  fi

  echo "result=$FINAL_RESULT phases=$PHASES_RUN stage=$CURRENT_STAGE transitions=${TRANSITION_LOG:-none}" > "$STATUS_FILE"
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
RESULT_OK=0
RESULT_FAIL=0
RESULT_SKIP=0
MISSING=0

for STORY_ID in "${FILTERED_STORIES[@]}"; do
  STATUS_FILE="$RESULT_DIR/${STORY_ID}"
  if [[ -f "$STATUS_FILE" ]]; then
    RESULT=$(cat "$STATUS_FILE")
    [[ "$RESULT" == *"result=ok"* ]]   && ((RESULT_OK++))   || true
    [[ "$RESULT" == *"result=fail"* ]] && ((RESULT_FAIL++)) || true
    [[ "$RESULT" == *"result=skip"* ]] && ((RESULT_SKIP++)) || true
  else
    ((MISSING++))
  fi
done

# ── Append final summary to run.log ────────────────────────────────
{
  echo ""
  echo "=== Final Summary ==="
  echo "End: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo "OK: $RESULT_OK  FAIL: $RESULT_FAIL  SKIP: $RESULT_SKIP  Missing: $MISSING"
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
echo " Plan:              $PLAN_SLUG"
echo " Total stories:     $TOTAL"
echo " Parallelism:       $PARALLEL"
echo " Max retries:       $MAX_RETRIES"
echo " OK:                $RESULT_OK"
echo " FAILED:            $RESULT_FAIL"
echo " SKIPPED:           $RESULT_SKIP"
[[ $MISSING -gt 0 ]] && echo " Missing results:   $MISSING"
echo " Logs:              $LOG_DIR/"
echo "======================================"

# ── Per-story detail ───────────────────────────────────────────────
echo ""
echo "Per-story results:"
for STORY_ID in "${FILTERED_STORIES[@]}"; do
  STATUS_FILE="$RESULT_DIR/${STORY_ID}"
  if [[ -f "$STATUS_FILE" ]]; then
    echo "  $STORY_ID: $(cat "$STATUS_FILE")"
  else
    echo "  $STORY_ID: no result (crashed?)"
  fi
done

# ── List failures and retry command ────────────────────────────────
TOTAL_FAIL=$((RESULT_FAIL + MISSING))
if [[ $TOTAL_FAIL -gt 0 ]]; then
  echo ""
  # Collect failed story IDs for --only retry
  FAILED_IDS=""
  for STORY_ID in "${FILTERED_STORIES[@]}"; do
    STATUS_FILE="$RESULT_DIR/${STORY_ID}"
    if [[ -f "$STATUS_FILE" ]]; then
      RESULT=$(cat "$STATUS_FILE")
      if [[ "$RESULT" == *"result=fail"* ]]; then
        [[ -n "$FAILED_IDS" ]] && FAILED_IDS="${FAILED_IDS},"
        FAILED_IDS="${FAILED_IDS}${STORY_ID}"
      fi
    else
      [[ -n "$FAILED_IDS" ]] && FAILED_IDS="${FAILED_IDS},"
      FAILED_IDS="${FAILED_IDS}${STORY_ID}"
    fi
  done
  if [[ -n "$FAILED_IDS" ]]; then
    echo "Retry failed: $0 $PLAN_SLUG --only $FAILED_IDS --max-retries 1"
  fi
  exit 1
fi

echo ""
echo "All stories processed successfully!"
