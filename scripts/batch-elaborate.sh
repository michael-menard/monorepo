#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# batch-elaborate.sh
#
# Full story pipeline: relevance → enrich → elab → implement → code review.
# Processes one story at a time, all the way through, before starting
# the next. Loops until no backlog stories remain.
#
# Retries each phase up to MAX_RETRIES times.
# Detects Claude token cap and pauses with countdown.
#
# Compatible with macOS bash 3.2 (no associative arrays).
# ============================================================

MAX_RETRIES=2
TOKEN_CAP_WAIT=300  # seconds to wait if token cap hit (5 min)
PLANS=("pipeline-orchestrator-activation" "consolidate-db-enhancements" "workflow-intelligence-wint")
LOG_DIR="$(pwd)/_elab-batch-logs"
SUMMARY_FILE="$LOG_DIR/summary.log"

mkdir -p "$LOG_DIR"

# Track results via flat files instead of associative arrays
RETRY_DIR="$LOG_DIR/.retries"
RESULT_DIR="$LOG_DIR/.results"
mkdir -p "$RETRY_DIR" "$RESULT_DIR"

get_retry_count() {
  local sid="$1"
  if [[ -f "$RETRY_DIR/$sid" ]]; then
    cat "$RETRY_DIR/$sid"
  else
    echo 0
  fi
}

set_retry_count() {
  local sid="$1"
  local count="$2"
  echo "$count" > "$RETRY_DIR/$sid"
}

get_result() {
  local sid="$1"
  if [[ -f "$RESULT_DIR/$sid" ]]; then
    cat "$RESULT_DIR/$sid"
  else
    echo ""
  fi
}

set_result() {
  local sid="$1"
  local status="$2"
  echo "$status" > "$RESULT_DIR/$sid"
}

advance_state() {
  local story_id="$1"
  local new_state="$2"
  local output
  output=$(claude -p "Use mcp__knowledge-base__kb_update_story_status to set story '$story_id' to state='$new_state'. Respond with exactly: STATE_UPDATED" 2>/dev/null) || true
  if echo "$output" | grep -q 'STATE_UPDATED'; then
    log "  ↳ KB state → $new_state"
  else
    log "  ⚠ KB state update to $new_state may have failed — check manually"
  fi
}

log() {
  local ts
  ts=$(date '+%Y-%m-%d %H:%M:%S')
  printf '%s\n' "[$ts] $*" | tee -a "$SUMMARY_FILE"
}

# ── Fetch actionable stories from KB via claude -p ────────
# Returns lines of "STORY_ID:STATE" for stories that still need work.
# Actionable states: backlog, created, elab, ready, in_progress,
#   needs_code_review, failed_code_review
fetch_actionable_stories() {
  local plan_slug="$1"
  log "Fetching actionable stories for plan: $plan_slug"

  local raw
  raw=$(claude -p "Use the mcp__knowledge-base__kb_list_stories tool with plan_slug=\"$plan_slug\" and limit=200. For each story, return its ID and state. Format each line as STORY_ID:STATE (e.g. WINT-1010:backlog). Only include stories in these states: backlog, created, elab, ready, in_progress, needs_code_review, failed_code_review. Exclude: cancelled, deferred, blocked, UAT, ready_for_qa, in_qa, ready_for_review, in_review. If no stories found, return the single word NONE." 2>/dev/null) || {
    log "WARNING: Failed to fetch stories for $plan_slug"
    echo ""
    return
  }

  # Extract STORY_ID:state pairs (strip control chars from claude output)
  echo "$raw" | LC_ALL=C tr -d '\000-\037' | grep -oE '[A-Z]+-[0-9]+:[a-z_]+' | sort -u
}

# ── Check if output indicates token cap ────────────────────
is_token_cap() {
  local output="$1"
  if echo "$output" | grep -qiE 'rate.?limit|token.?limit|too many requests|quota exceeded|capacity|overloaded|429|credit'; then
    return 0
  fi
  return 1
}

# ── Check if elaboration succeeded ─────────────────────────
is_success() {
  local output="$1"
  if echo "$output" | grep -qiE 'ELABORATION COMPLETE|elab.*complete|verdict.*PASS|status.*ready|status.*elab'; then
    return 0
  fi
  return 1
}

# ── Check if split was requested ───────────────────────────
is_split() {
  local output="$1"
  if echo "$output" | grep -qiE 'SPLIT REQUIRED|split.*required|needs.*split'; then
    return 0
  fi
  return 1
}

# ── Wait with countdown ───────────────────────────────────
wait_with_countdown() {
  local seconds="$1"
  local reason="$2"
  log "⏸  $reason — waiting ${seconds}s before retry..."
  while [ "$seconds" -gt 0 ]; do
    printf "\r  Resuming in %3ds... " "$seconds"
    sleep 1
    seconds=$((seconds - 1))
  done
  printf "\r  Resuming now.          \n"
}

# ── Pre-elab relevance check ─────────────────────────────
# Asks Claude to verify the story is still needed given current
# codebase state. Can cancel, defer, or update the story.
# Returns 0 if story should proceed to elab, 1 if skipped.
check_relevance() {
  local story_id="$1"
  local log_file="$LOG_DIR/${story_id}-relevance.log"

  log "🔍 Checking relevance: $story_id"

  local output
  local exit_code=0
  output=$(claude -p "You are a story relevance checker. For story $story_id:

1. Use mcp__knowledge-base__kb_get_story to read the story details.
2. Based on the story title and description, check the current codebase to see if the work described has ALREADY been implemented (e.g. the feature exists, the bug is fixed, the refactor is done).
3. Also assess whether the story is still relevant — it may reference obsolete architecture or superseded plans.

CRITICAL DISTINCTION — do NOT confuse these two things:
- Story ID prefixes like WINT-, PIPE-, CDBE- are just organizational identifiers. A story with a WINT- prefix does NOT mean it is related to the dead wint.* or kbar.* DATABASE SCHEMAS.
- The dead schemas are specifically wint.* and kbar.* PostgreSQL schemas that were removed. Only cancel a story if its ACTUAL WORK (title, description, acceptance criteria) is about creating or using those specific DB schemas.
- Stories under the workflow-intelligence-wint PLAN are valid work items about workflow automation, agent improvements, pipeline features, telemetry, etc. They are NOT obsolete just because the plan name contains 'wint'.

Only CANCEL if you find concrete evidence that the specific work is already done or truly obsolete. Do NOT cancel based on naming conventions alone.

Respond with EXACTLY one of these verdicts on the LAST line:
- PROCEED — story is still needed, continue to elaboration
- CANCEL — work is PROVEN already done or story explicitly targets removed wint.*/kbar.* DB schemas. Also call mcp__knowledge-base__kb_update_story_status to set state='cancelled' with a reason.
- DEFER — story is valid but low priority or blocked by unmet prerequisites. Also call mcp__knowledge-base__kb_update_story_status to set state='deferred' with a reason.
- UPDATE — story needs updates (title/description are stale). Call mcp__knowledge-base__kb_update_story to fix it, then output PROCEED.

Be conservative: if unsure, PROCEED." 2>&1) || exit_code=$?

  echo "$output" > "$log_file"

  if is_token_cap "$output" || [ "$exit_code" -eq 2 ]; then
    log "⚠  Token cap during relevance check for $story_id"
    wait_with_countdown "$TOKEN_CAP_WAIT" "Token cap hit during relevance check"
    # On token cap, default to proceeding
    return 0
  fi

  # Extract verdict from last meaningful line
  local verdict
  verdict=$(echo "$output" | grep -oE 'PROCEED|CANCEL|DEFER|UPDATE' | tail -1)

  case "$verdict" in
    CANCEL)
      log "⊘  $story_id — cancelled (already done or obsolete)"
      set_result "$story_id" "cancelled"
      return 1
      ;;
    DEFER)
      log "⏭  $story_id — deferred (low priority or blocked)"
      set_result "$story_id" "deferred"
      return 1
      ;;
    PROCEED|UPDATE|*)
      log "✓  $story_id — relevant, proceeding to elab"
      return 0
      ;;
  esac
}

# ── Enrich a stub story with description + AC ────────────
# For stories that are just titles (no description), uses the plan
# content + codebase exploration to generate initial description,
# acceptance criteria, and packages before elab runs.
# Returns 0 on success, 1 on retry, 2 on hard failure.
enrich_story() {
  local story_id="$1"
  local log_file="$LOG_DIR/${story_id}-enrich.log"

  # Check if story already has a description (skip if so)
  local check_output
  check_output=$(claude -p "Use mcp__knowledge-base__kb_get_story to read story $story_id. If the story has a non-null, non-empty description, respond with exactly: HAS_DESCRIPTION. If the description is null or empty, respond with exactly: NEEDS_ENRICHMENT." 2>/dev/null) || true

  if echo "$check_output" | grep -q 'HAS_DESCRIPTION'; then
    log "✓  $story_id already has description, skipping enrichment"
    return 0
  fi

  local attempt
  attempt=$(get_retry_count "${story_id}-enrich")

  log "📝 Enriching $story_id (attempt $((attempt + 1))/$((MAX_RETRIES + 1)))"

  local output
  local exit_code=0
  output=$(claude -p "You are a story enrichment agent. Your job is to take a stub story (title only) and generate a proper description, acceptance criteria, and package list.

For story $story_id:

1. Use mcp__knowledge-base__kb_get_story to read the story title and any existing fields.
2. Use mcp__knowledge-base__kb_get_plan with plan_slug='workflow-intelligence-wint' to read the plan. Find which phase this story belongs to based on its ID prefix (first digit = phase number). Use the plan's phase description and context.
3. Check the story's dependencies using mcp__knowledge-base__kb_get_related with story_id='$story_id' to understand what this story depends on and what depends on it.
4. Explore the codebase to understand:
   - What infrastructure already exists that this story would build on
   - What patterns are used for similar features (agents, skills, commands, MCP tools)
   - What packages would be affected
5. Use mcp__knowledge-base__kb_update_story to write:
   - description: 2-4 sentences explaining what this story does, why it matters, and what it builds on. Be specific about the technical approach.
   - acceptance_criteria: A JSON array of 3-6 testable criteria. Each should be a clear, verifiable statement.
   - packages: Array of package paths that would be modified (e.g. 'apps/api/knowledge-base', 'packages/backend/orchestrator')

IMPORTANT:
- The description must be specific enough that an elab agent can create a detailed implementation plan from it.
- Acceptance criteria must be testable — not vague ('it works') but specific ('MCP tool returns results matching the query schema').
- Look at completed stories in the same phase for examples of good descriptions.
- Do NOT change the title unless it is clearly wrong.

After writing, output ENRICHED on the last line." 2>&1) || exit_code=$?

  echo "$output" > "$log_file"

  # Check for token cap
  if is_token_cap "$output" || [ "$exit_code" -eq 2 ]; then
    log "⚠  Token cap during enrichment of $story_id"
    if [ "$attempt" -lt "$MAX_RETRIES" ]; then
      set_retry_count "${story_id}-enrich" $((attempt + 1))
      wait_with_countdown "$TOKEN_CAP_WAIT" "Token cap hit"
      return 1  # retry
    else
      log "✗  $story_id enrichment FAILED — token cap, max retries exhausted"
      return 2
    fi
  fi

  if echo "$output" | grep -q 'ENRICHED'; then
    log "✓  $story_id enriched successfully"
    return 0
  fi

  # Generic failure
  if [ "$exit_code" -ne 0 ] || echo "$output" | grep -qiE 'FAILED|ERROR'; then
    log "⚠  $story_id enrichment failed (exit=$exit_code)"
    if [ "$attempt" -lt "$MAX_RETRIES" ]; then
      set_retry_count "${story_id}-enrich" $((attempt + 1))
      return 1
    else
      log "✗  $story_id enrichment FAILED — max retries exhausted"
      return 2
    fi
  fi

  log "?  $story_id enrichment — ambiguous output, treating as success. Check $log_file"
  return 0
}

# ── Elaborate a single story ──────────────────────────────
elaborate_story() {
  local story_id="$1"
  local attempt
  attempt=$(get_retry_count "$story_id")
  local log_file="$LOG_DIR/${story_id}-attempt-${attempt}.log"

  log "▶ Elaborating $story_id (attempt $((attempt + 1))/$((MAX_RETRIES + 1)))"

  local output
  local exit_code=0
  output=$(claude -p "/elab-story $story_id --autonomous" 2>&1) || exit_code=$?

  # Save full output to log
  echo "$output" > "$log_file"

  # Check for token cap
  if is_token_cap "$output" || [ "$exit_code" -eq 2 ]; then
    log "⚠  Token cap hit for $story_id"
    if [ "$attempt" -lt "$MAX_RETRIES" ]; then
      set_retry_count "$story_id" $((attempt + 1))
      wait_with_countdown "$TOKEN_CAP_WAIT" "Token cap hit"
      return 1  # signal retry
    else
      log "✗  $story_id elab FAILED — token cap, max retries exhausted"
      return 2  # hard failure
    fi
  fi

  # Check for success
  if is_success "$output"; then
    log "✓  $story_id elaborated successfully"
    return 0
  fi

  # Check for split
  if is_split "$output"; then
    log "✂  $story_id needs split — will pick up new stories next pass"
    set_result "$story_id" "split"
    return 0
  fi

  # Generic failure
  if [ "$exit_code" -ne 0 ] || echo "$output" | grep -qiE 'FAILED|ERROR|BLOCKED'; then
    log "⚠  $story_id elab failed (exit=$exit_code)"
    if [ "$attempt" -lt "$MAX_RETRIES" ]; then
      set_retry_count "$story_id" $((attempt + 1))
      log "  Will retry ($((attempt + 1))/$MAX_RETRIES retries used)"
      return 1  # signal retry
    else
      log "✗  $story_id elab FAILED — max retries exhausted"
      return 2  # hard failure
    fi
  fi

  # Ambiguous output — treat as success if no error indicators
  log "?  $story_id — ambiguous elab output, treating as success. Check $log_file"
  return 0
}

# ── Implement a single story ─────────────────────────────
implement_story() {
  local story_id="$1"
  local attempt
  attempt=$(get_retry_count "${story_id}-impl")
  local log_file="$LOG_DIR/${story_id}-impl-attempt-${attempt}.log"

  log "🔨 Implementing $story_id (attempt $((attempt + 1))/$((MAX_RETRIES + 1)))"

  local output
  local exit_code=0
  output=$(claude -p "/dev-implement-story $story_id" 2>&1) || exit_code=$?

  echo "$output" > "$log_file"

  # Check for token cap
  if is_token_cap "$output" || [ "$exit_code" -eq 2 ]; then
    log "⚠  Token cap hit during implementation of $story_id"
    if [ "$attempt" -lt "$MAX_RETRIES" ]; then
      set_retry_count "${story_id}-impl" $((attempt + 1))
      wait_with_countdown "$TOKEN_CAP_WAIT" "Token cap hit"
      return 1  # signal retry
    else
      log "✗  $story_id implementation FAILED — token cap, max retries exhausted"
      return 2  # hard failure
    fi
  fi

  # Check for success indicators
  if echo "$output" | grep -qiE 'IMPLEMENTATION COMPLETE|implementation.*complete|EVIDENCE\.yaml|all.*tests.*pass|commit.*created|PR.*created'; then
    log "✓  $story_id implemented successfully"
    return 0
  fi

  # Generic failure
  if [ "$exit_code" -ne 0 ] || echo "$output" | grep -qiE 'FAILED|BLOCKED|cannot proceed'; then
    log "⚠  $story_id implementation failed (exit=$exit_code)"
    if [ "$attempt" -lt "$MAX_RETRIES" ]; then
      set_retry_count "${story_id}-impl" $((attempt + 1))
      log "  Will retry ($((attempt + 1))/$MAX_RETRIES retries used)"
      return 1  # signal retry
    else
      log "✗  $story_id implementation FAILED — max retries exhausted"
      return 2  # hard failure
    fi
  fi

  # Ambiguous — treat as success
  log "?  $story_id implementation — ambiguous output, treating as success. Check $log_file"
  return 0
}

# ── Code review a single story ───────────────────────────
code_review_story() {
  local story_id="$1"
  local attempt
  attempt=$(get_retry_count "${story_id}-review")
  local log_file="$LOG_DIR/${story_id}-review-attempt-${attempt}.log"

  log "🔍 Code reviewing $story_id (attempt $((attempt + 1))/$((MAX_RETRIES + 1)))"

  local output
  local exit_code=0
  output=$(claude -p "/dev-code-review $story_id" 2>&1) || exit_code=$?

  echo "$output" > "$log_file"

  # Check for token cap
  if is_token_cap "$output" || [ "$exit_code" -eq 2 ]; then
    log "⚠  Token cap hit during code review of $story_id"
    if [ "$attempt" -lt "$MAX_RETRIES" ]; then
      set_retry_count "${story_id}-review" $((attempt + 1))
      wait_with_countdown "$TOKEN_CAP_WAIT" "Token cap hit"
      return 1  # signal retry
    else
      log "✗  $story_id code review FAILED — token cap, max retries exhausted"
      return 2  # hard failure
    fi
  fi

  # Check for success
  if echo "$output" | grep -qiE 'review.*complete|PASS|APPROVED|no.*issues|code.review.*done'; then
    log "✓  $story_id code review passed"
    return 0
  fi

  # Check for review failures that need fixes
  if echo "$output" | grep -qiE 'FAIL|CONCERNS|changes.*requested|needs.*fix'; then
    log "⚠  $story_id code review found issues"
    if [ "$attempt" -lt "$MAX_RETRIES" ]; then
      set_retry_count "${story_id}-review" $((attempt + 1))
      log "  Will retry ($((attempt + 1))/$MAX_RETRIES retries used)"
      return 1  # signal retry
    else
      log "⚠  $story_id code review had concerns — max retries, moving on"
      return 0  # don't block pipeline
    fi
  fi

  # Generic failure
  if [ "$exit_code" -ne 0 ]; then
    log "⚠  $story_id code review failed (exit=$exit_code)"
    if [ "$attempt" -lt "$MAX_RETRIES" ]; then
      set_retry_count "${story_id}-review" $((attempt + 1))
      return 1
    else
      log "✗  $story_id code review FAILED — max retries exhausted"
      return 2
    fi
  fi

  log "?  $story_id code review — ambiguous output, treating as success. Check $log_file"
  return 0
}

# ── Run a phase with retry ───────────────────────────────
# Calls the given function, retries on return code 1, stops on 0 or 2.
# Returns the final exit code.
run_with_retry() {
  local func="$1"
  local story_id="$2"

  while true; do
    local rc=0
    "$func" "$story_id" || rc=$?
    case "$rc" in
      0) return 0 ;;  # success
      1) continue ;;  # retry
      *) return 1 ;;  # hard failure
    esac
  done
}

# ── Determine starting phase from story state ────────────
# Maps KB state to which pipeline phase to start from.
# Returns: relevance, elab, implement, review
get_starting_phase() {
  local state="$1"
  case "$state" in
    backlog|created)
      echo "relevance"
      ;;
    elab)
      # Mid-elaboration — re-run elab (idempotent)
      echo "elab"
      ;;
    ready|in_progress)
      # Elaborated, needs implementation
      echo "implement"
      ;;
    needs_code_review|failed_code_review)
      # Implemented, needs review
      echo "review"
      ;;
    *)
      echo "relevance"
      ;;
  esac
}

# ── Process a single story through the full pipeline ─────
process_story() {
  local story_id="$1"
  local state="$2"
  local start_phase
  start_phase=$(get_starting_phase "$state")

  log ""
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "Processing $story_id (state=$state, starting at=$start_phase)"
  log "Pipeline: relevance → enrich → elab → implement → review"
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Phase 1: Relevance check (DISABLED — was too aggressive, cancelled valid stories)
  # if [ "$start_phase" = "relevance" ]; then
  #   if ! check_relevance "$story_id"; then
  #     return 0  # cancelled or deferred — already recorded
  #   fi
  #   start_phase="enrich"
  # fi
  if [ "$start_phase" = "relevance" ]; then
    start_phase="enrich"
  fi

  # Phase 1.5: Enrich stub stories (backlog with no description)
  if [ "$start_phase" = "enrich" ]; then
    if ! run_with_retry enrich_story "$story_id"; then
      set_result "$story_id" "failed:enrich"
      return 0
    fi
    advance_state "$story_id" "created"
    start_phase="elab"
  fi

  # Phase 2: Elaboration
  if [ "$start_phase" = "elab" ]; then
    if ! run_with_retry elaborate_story "$story_id"; then
      set_result "$story_id" "failed:elab"
      return 0
    fi

    # Check if elab resulted in a split — don't continue pipeline
    local elab_result
    elab_result=$(get_result "$story_id")
    if [ "$elab_result" = "split" ]; then
      log "✂  $story_id was split — skipping implement/review, new stories picked up next pass"
      return 0
    fi
    advance_state "$story_id" "ready"
    start_phase="implement"
  fi

  # Phase 3: Implementation
  if [ "$start_phase" = "implement" ]; then
    if ! run_with_retry implement_story "$story_id"; then
      set_result "$story_id" "failed:implement"
      return 0
    fi
    advance_state "$story_id" "needs_code_review"
    start_phase="review"
  fi

  # Phase 4: Code review
  if [ "$start_phase" = "review" ]; then
    if ! run_with_retry code_review_story "$story_id"; then
      set_result "$story_id" "failed:review"
      return 0
    fi
    advance_state "$story_id" "ready_for_qa"
  fi

  # All phases passed
  set_result "$story_id" "success:pipeline_complete"
  log "🏁 $story_id — full pipeline complete"
}

# ════════════════════════════════════════════════════════════
# MAIN LOOP
# ════════════════════════════════════════════════════════════

log "═══════════════════════════════════════════"
log "Batch Story Pipeline Started"
log "Pipeline: relevance → enrich → elab → implement → code review"
log "Plans: ${PLANS[*]}"
log "Max retries per phase: $MAX_RETRIES"
log "Log directory: $LOG_DIR"
log "═══════════════════════════════════════════"

# STATE_DIR tracks story states for routing
STATE_DIR="$LOG_DIR/.states"
mkdir -p "$STATE_DIR"

# Collect all actionable stories from all plans (ID:state pairs)
all_entries=()
for plan in "${PLANS[@]}"; do
  while IFS= read -r entry; do
    if [ -n "$entry" ]; then
      all_entries+=("$entry")
    fi
  done < <(fetch_actionable_stories "$plan")
done

# Store states
pending=()
for entry in "${all_entries[@]}"; do
  sid="${entry%%:*}"
  state="${entry#*:}"
  echo "$state" > "$STATE_DIR/$sid"
  pending+=("$sid")
done

if [ ${#pending[@]} -eq 0 ]; then
  log "No actionable stories found."
else
  log "Stories to process: ${pending[*]}"

  # Process one story at a time through the full pipeline
  for sid in "${pending[@]}"; do
    state="backlog"
    if [ -f "$STATE_DIR/$sid" ]; then
      state=$(LC_ALL=C tr -d '\000-\037' < "$STATE_DIR/$sid")
    fi
    process_story "$sid" "$state"
  done
fi

# ── Summary ───────────────────────────────────────────────
log ""
log "═══════════════════════════════════════════"
log "Batch Pipeline Complete"
log "═══════════════════════════════════════════"

complete_count=0
fail_enrich_count=0
fail_elab_count=0
fail_impl_count=0
fail_review_count=0
split_count=0
cancel_count=0
defer_count=0

for result_file in "$RESULT_DIR"/*; do
  [ -f "$result_file" ] || continue
  sid=$(basename "$result_file")
  status=$(cat "$result_file")
  case "$status" in
    success:pipeline_complete) complete_count=$((complete_count + 1)) ;;
    success*|elab*)            complete_count=$((complete_count + 1)) ;;
    failed:enrich*)            fail_enrich_count=$((fail_enrich_count + 1)) ;;
    failed:elab*)              fail_elab_count=$((fail_elab_count + 1)) ;;
    failed:implement*)         fail_impl_count=$((fail_impl_count + 1)) ;;
    failed:review*)            fail_review_count=$((fail_review_count + 1)) ;;
    failed*)                   fail_elab_count=$((fail_elab_count + 1)) ;;
    split*)                    split_count=$((split_count + 1)) ;;
    cancelled*)                cancel_count=$((cancel_count + 1)) ;;
    deferred*)                 defer_count=$((defer_count + 1)) ;;
  esac
  log "  $sid → $status"
done

log ""
log "Pipeline complete: $complete_count"
log "Failed (enrich):   $fail_enrich_count"
log "Failed (elab):     $fail_elab_count"
log "Failed (impl):     $fail_impl_count"
log "Failed (review):   $fail_review_count"
log "Split:             $split_count"
log "Cancelled:         $cancel_count"
log "Deferred:          $defer_count"
log "Logs:              $LOG_DIR"
