#!/usr/bin/env bash
#
# KB Cache Library — Single bulk fetch, local lookups.
#
# Provides a shared cache of story data from the KB database.
# One `claude -p` call at startup fetches all stories for a feature
# into a local NDJSON cache file. All subsequent lookups are fast
# grep+jq against the cache — zero additional `claude -p` calls.
#
# Usage:
#   source "$(dirname "$0")/lib/kb-cache.sh"
#   kb_fetch_stories "$PLAN_SLUG"
#   echo "${KB_STORY_IDS[@]}"
#   kb_story_state "APIP-1010"
#   kb_is_implemented "APIP-1010" && echo "yes"
#
# All functions are bash 3.2 safe (no associative arrays, no readarray).
#

# ── Cache file path ──────────────────────────────────────────────────
KB_CACHE_FILE=""
KB_STORY_IDS=()

# ── Fetch all stories for a plan into the cache ─────────────────────
# Args: $1 = plan_slug (used for kb_list_stories prefix lookup)
#
# Sets:
#   KB_CACHE_FILE — path to NDJSON cache
#   KB_STORY_IDS  — sorted array of story IDs
#
kb_fetch_stories() {
  local plan_slug="$1"

  KB_CACHE_FILE="/tmp/kb-cache-${plan_slug}-$$.ndjson"
  KB_STORY_IDS=()

  # Single claude -p call: fetch all stories as NDJSON
  local raw_result
  raw_result=$(claude -p \
    "Call kb_list_stories with feature='${plan_slug}'. For each story, output ONE JSON object per line (NDJSON format) with keys: id, state, phase, storyDir. Output ONLY the NDJSON lines — no markdown fences, no explanation, no wrapper array. If no stories are found, output nothing." \
    --allowedTools "mcp__knowledge-base__kb_list_stories,mcp__knowledge-base__kb_get_story" \
    --output-format text 2>/dev/null) || true

  if [[ -z "$raw_result" ]]; then
    echo "Warning: kb_fetch_stories got empty result for '$plan_slug'" >&2
    touch "$KB_CACHE_FILE"
    return 0
  fi

  # Extract JSON lines (skip any non-JSON preamble/postamble)
  echo "$raw_result" | grep -E '^\s*\{' | while IFS= read -r line; do
    # Validate it's parseable JSON with an 'id' field
    if echo "$line" | jq -e '.id' >/dev/null 2>&1; then
      echo "$line"
    fi
  done > "$KB_CACHE_FILE"

  # Build sorted story ID array
  while IFS= read -r story_id; do
    [[ -n "$story_id" ]] && KB_STORY_IDS+=("$story_id")
  done < <(jq -r '.id' "$KB_CACHE_FILE" 2>/dev/null | sort)

  if [[ ${#KB_STORY_IDS[@]} -eq 0 ]]; then
    echo "Warning: No stories found in KB cache for '$plan_slug'" >&2
  fi
}

# ── Fetch stories by explicit IDs (work-order mode) ──────────────────
# Args: $1 = comma-separated story IDs (e.g., "WINT-0200,KBAR-0140,AUDT-0030")
#
# Unlike kb_fetch_stories() which needs a plan_slug, this function takes
# specific story IDs — ideal for work-order mode where stories span
# multiple plans/prefixes.
#
# Sets:
#   KB_CACHE_FILE — path to NDJSON cache
#   KB_STORY_IDS  — sorted array of story IDs found in KB
#
kb_fetch_by_ids() {
  local ids_csv="$1"

  if [[ -z "$ids_csv" ]]; then
    return 0
  fi

  KB_CACHE_FILE="${KB_CACHE_FILE:-/tmp/kb-cache-byids-$$.ndjson}"
  KB_STORY_IDS=()

  # Build the prompt: ask claude to fetch each story and output NDJSON
  local raw_result
  raw_result=$(claude -p \
    "For each of these story IDs: ${ids_csv} — call kb_get_story for each one. Output ONE JSON object per line (NDJSON format) with keys: id, state, phase, storyDir. Output ONLY the NDJSON lines — no markdown fences, no explanation, no wrapper array. If a story is not found in the KB, skip it (do not output a line for it)." \
    --allowedTools "mcp__knowledge-base__kb_get_story" \
    --output-format text 2>/dev/null) || true

  if [[ -z "$raw_result" ]]; then
    touch "$KB_CACHE_FILE"
    return 0
  fi

  # Extract valid JSON lines (append to existing cache if kb_fetch_stories ran first)
  echo "$raw_result" | grep -E '^\s*\{' | while IFS= read -r line; do
    if echo "$line" | jq -e '.id' >/dev/null 2>&1; then
      echo "$line"
    fi
  done >> "$KB_CACHE_FILE"

  # Rebuild sorted story ID array from full cache
  KB_STORY_IDS=()
  while IFS= read -r story_id; do
    [[ -n "$story_id" ]] && KB_STORY_IDS+=("$story_id")
  done < <(jq -r '.id' "$KB_CACHE_FILE" 2>/dev/null | sort -u)
}

# ── Lookup functions (read from cache, zero claude -p calls) ─────────

# Returns the KB state string for a story ID
kb_story_state() {
  local id="$1"
  jq -r "select(.id == \"$id\") | .state // \"unknown\"" "$KB_CACHE_FILE" 2>/dev/null | head -1
}

# Returns the KB phase string for a story ID
kb_story_phase() {
  local id="$1"
  jq -r "select(.id == \"$id\") | .phase // \"unknown\"" "$KB_CACHE_FILE" 2>/dev/null | head -1
}

# Returns the storyDir from KB for a story ID
kb_story_dir() {
  local id="$1"
  jq -r "select(.id == \"$id\") | .storyDir // \"\"" "$KB_CACHE_FILE" 2>/dev/null | head -1
}

# ── State predicates (replace filesystem checks) ────────────────────
# All use case statements — no associative arrays (bash 3.2 safe).

# Story has been generated (state != backlog)
# Replaces: grep "acceptance_criteria" story.yaml
kb_is_generated() {
  local id="$1"
  local state
  state=$(kb_story_state "$id")
  case "$state" in
    backlog|unknown|"") return 1 ;;
    *) return 0 ;;
  esac
}

# Story has been elaborated (state past backlog/generated)
# Replaces: [[ -d _implementation ]]
kb_is_elaborated() {
  local id="$1"
  local state
  state=$(kb_story_state "$id")
  case "$state" in
    backlog|generated|unknown|"") return 1 ;;
    *) return 0 ;;
  esac
}

# Story has been implemented (has evidence / past implementation)
# Replaces: [[ -f EVIDENCE.yaml ]]
kb_is_implemented() {
  local id="$1"
  local state
  state=$(kb_story_state "$id")
  case "$state" in
    ready_for_review|needs_code_review|in_review|ready_for_qa|in_qa|completed|failed_code_review|failed_qa|uat) return 0 ;;
    *) return 1 ;;
  esac
}

# Story has been reviewed (past code review)
# Replaces: [[ -f REVIEW.yaml ]]
kb_is_reviewed() {
  local id="$1"
  local state
  state=$(kb_story_state "$id")
  case "$state" in
    ready_for_qa|in_qa|completed|failed_qa|uat) return 0 ;;
    *) return 1 ;;
  esac
}

# Story is completed (in UAT or done)
# Replaces: [[ -d UAT/ ]]
kb_is_completed() {
  local id="$1"
  local state
  state=$(kb_story_state "$id")
  case "$state" in
    completed|uat|done) return 0 ;;
    *) return 1 ;;
  esac
}

# ── Cleanup ──────────────────────────────────────────────────────────

kb_cleanup() {
  if [[ -n "$KB_CACHE_FILE" ]] && [[ -f "$KB_CACHE_FILE" ]]; then
    rm -f "$KB_CACHE_FILE"
  fi
}

# Register cleanup on exit (safe to call multiple times — last trap wins)
trap kb_cleanup EXIT
