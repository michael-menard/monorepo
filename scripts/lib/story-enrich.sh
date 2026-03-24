#!/usr/bin/env bash
#
# story-enrich.sh — Shared library for story enrichment and relevance checking.
#
# Extracted from batch-elaborate.sh for reuse in orchestrate-story-flow.sh.
#
# Required from caller:
#   $LOG_DIR     — directory for log files
#   $CLAUDE_FLAGS (optional) — extra flags for claude CLI calls
#
# Helpers used from caller (if available):
#   log()              — logging function (falls back to echo)
#   is_token_cap()     — detect rate limit (falls back to grep)
#   get_retry_count()  — retry tracking (falls back to 0)
#   set_retry_count()  — retry tracking (falls back to no-op)
#   set_result()       — result tracking (falls back to no-op)
#   wait_with_countdown() — rate limit cooldown (falls back to sleep)
#
# Compatible with macOS bash 3.2 (no associative arrays).
#

# ── Defaults for standalone use ───────────────────────────────────────
_ENRICH_MAX_RETRIES="${MAX_RETRIES:-2}"
_ENRICH_TOKEN_CAP_WAIT="${TOKEN_CAP_WAIT:-300}"

# ── Fallback helpers (used if caller doesn't provide them) ────────────
if [[ "$(type -t log 2>/dev/null)" != "function" ]]; then
  log() {
    local ts
    ts=$(date '+%Y-%m-%d %H:%M:%S')
    printf '%s\n' "[$ts] $*"
  }
fi

if [[ "$(type -t is_token_cap 2>/dev/null)" != "function" ]]; then
  is_token_cap() {
    local output="$1"
    if echo "$output" | grep -qiE 'rate.?limit|token.?limit|too many requests|quota exceeded|capacity|overloaded|429|credit'; then
      return 0
    fi
    return 1
  }
fi

if [[ "$(type -t get_retry_count 2>/dev/null)" != "function" ]]; then
  get_retry_count() { echo 0; }
fi

if [[ "$(type -t set_retry_count 2>/dev/null)" != "function" ]]; then
  set_retry_count() { :; }
fi

if [[ "$(type -t set_result 2>/dev/null)" != "function" ]]; then
  set_result() { :; }
fi

if [[ "$(type -t wait_with_countdown 2>/dev/null)" != "function" ]]; then
  wait_with_countdown() {
    local seconds="$1"
    local reason="$2"
    log "Waiting ${seconds}s: $reason"
    sleep "$seconds"
  }
fi

# ── Pre-elab relevance check ─────────────────────────────────────────
# Asks Claude to verify the story is still needed given current
# codebase state. Can cancel, defer, or update the story.
# Returns 0 if story should proceed, 1 if skipped.
check_relevance() {
  local story_id="$1"
  local log_file="$LOG_DIR/${story_id}-relevance.log"

  log "Checking relevance: $story_id"

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

Be conservative: if unsure, PROCEED." $CLAUDE_FLAGS 2>&1) || exit_code=$?

  echo "$output" > "$log_file"

  if is_token_cap "$output" || [ "$exit_code" -eq 2 ]; then
    log "Token cap during relevance check for $story_id"
    wait_with_countdown "$_ENRICH_TOKEN_CAP_WAIT" "Token cap hit during relevance check"
    return 0
  fi

  local verdict
  verdict=$(echo "$output" | grep -oE 'PROCEED|CANCEL|DEFER|UPDATE' | tail -1)

  case "$verdict" in
    CANCEL)
      log "$story_id — cancelled (already done or obsolete)"
      set_result "$story_id" "cancelled"
      return 1
      ;;
    DEFER)
      log "$story_id — deferred (low priority or blocked)"
      set_result "$story_id" "deferred"
      return 1
      ;;
    PROCEED|UPDATE|*)
      log "$story_id — relevant, proceeding"
      return 0
      ;;
  esac
}

# ── Enrich a stub story with description + AC ─────────────────────────
# For stories that are just titles (no description), uses the plan
# content + codebase exploration to generate initial description,
# acceptance criteria, and packages before elab runs.
#
# Usage: enrich_story <story_id> [plan_slug]
#   plan_slug defaults to $PLAN_SLUG from caller environment
#
# Returns 0 on success/already-enriched, 1 on retry, 2 on hard failure.
enrich_story() {
  local story_id="$1"
  local plan_slug="${2:-${PLAN_SLUG:-}}"
  local log_file="$LOG_DIR/${story_id}-enrich.log"

  # Check if story already has a description (skip if so)
  local check_output
  check_output=$(claude -p "Use mcp__knowledge-base__kb_get_story to read story $story_id. If the story has a non-null, non-empty description, respond with exactly: HAS_DESCRIPTION. If the description is null or empty, respond with exactly: NEEDS_ENRICHMENT." $CLAUDE_FLAGS 2>/dev/null) || true

  if echo "$check_output" | grep -q 'HAS_DESCRIPTION'; then
    log "$story_id already has description, skipping enrichment"
    return 0
  fi

  local attempt
  attempt=$(get_retry_count "${story_id}-enrich")

  log "Enriching $story_id (attempt $((attempt + 1))/$((${_ENRICH_MAX_RETRIES} + 1)))"

  # Build plan context clause
  local plan_clause=""
  if [[ -n "$plan_slug" ]]; then
    plan_clause="2. Use mcp__knowledge-base__kb_get_plan with plan_slug='$plan_slug' to read the plan. Find which phase this story belongs to based on its ID prefix (first digit = phase number). Use the plan's phase description and context."
  else
    plan_clause="2. Try to determine which plan this story belongs to by its ID prefix. Use mcp__knowledge-base__kb_list_plans and mcp__knowledge-base__kb_get_plan to find the relevant plan context."
  fi

  local output
  local exit_code=0
  output=$(claude -p "You are a story enrichment agent. Your job is to take a stub story (title only) and generate a proper description, acceptance criteria, and package list.

For story $story_id:

1. Use mcp__knowledge-base__kb_get_story to read the story title and any existing fields.
$plan_clause
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

After writing, output ENRICHED on the last line." $CLAUDE_FLAGS 2>&1) || exit_code=$?

  echo "$output" > "$log_file"

  # Check for token cap
  if is_token_cap "$output" || [ "$exit_code" -eq 2 ]; then
    log "Token cap during enrichment of $story_id"
    if [ "$attempt" -lt "$_ENRICH_MAX_RETRIES" ]; then
      set_retry_count "${story_id}-enrich" $((attempt + 1))
      wait_with_countdown "$_ENRICH_TOKEN_CAP_WAIT" "Token cap hit"
      return 1  # retry
    else
      log "$story_id enrichment FAILED — token cap, max retries exhausted"
      return 2
    fi
  fi

  if echo "$output" | grep -q 'ENRICHED'; then
    log "$story_id enriched successfully"
    return 0
  fi

  # Generic failure
  if [ "$exit_code" -ne 0 ] || echo "$output" | grep -qiE 'FAILED|ERROR'; then
    log "$story_id enrichment failed (exit=$exit_code)"
    if [ "$attempt" -lt "$_ENRICH_MAX_RETRIES" ]; then
      set_retry_count "${story_id}-enrich" $((attempt + 1))
      return 1
    else
      log "$story_id enrichment FAILED — max retries exhausted"
      return 2
    fi
  fi

  log "$story_id enrichment — ambiguous output, treating as success. Check $log_file"
  return 0
}
