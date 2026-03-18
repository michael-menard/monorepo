#!/usr/bin/env bash
#
# Shared helper: resolve a plan slug to FEATURE_DIR and STORY_PREFIX.
#
# Sources into the calling script. After `resolve_plan "$slug"`, the
# following variables are set:
#   FEATURE_DIR   — filesystem path to the plan directory
#   PLAN_SLUG     — the canonical slug (basename of FEATURE_DIR)
#   STORY_PREFIX  — e.g. "APIP", "SKCR"  (may be empty for fs-only plans)
#
# Resolution order:
#   1. If the slug contains "/", treat it as a direct path
#   2. Query the KB via `claude -p` + kb_get_plan
#   3. Fallback: grep for **Plan Slug** in plans/ (transitional)
#

resolve_plan() {
  local slug="$1"

  # ── Direct path ───────────────────────────────────────────────────
  if [[ "$slug" == *"/"* ]]; then
    FEATURE_DIR="$slug"
    PLAN_SLUG=$(basename "$FEATURE_DIR")
    return 0
  fi

  # ── KB lookup via claude -p ───────────────────────────────────────
  local raw_result
  raw_result=$(timeout 30 env -u CLAUDECODE claude -p \
    "Call kb_get_plan with plan_slug '${slug}'. Output ONLY raw JSON on a single line with keys: feature_dir, story_prefix, status, title. If the plan is not found output {\"error\":\"not_found\"}. No markdown fences, no explanation." \
    --allowedTools "mcp__knowledge-base__kb_get_plan" \
    --output-format text 2>/dev/null) || true

  if [[ -n "$raw_result" ]]; then
    # Extract the JSON object (skip any non-JSON preamble)
    local json_line
    json_line=$(echo "$raw_result" | grep -o '{.*}' | tail -1) || true

    if [[ -n "$json_line" ]]; then
      local kb_error
      kb_error=$(echo "$json_line" | jq -r '.error // empty' 2>/dev/null) || true

      if [[ -z "$kb_error" ]]; then
        local kb_feature_dir kb_prefix
        kb_feature_dir=$(echo "$json_line" | jq -r '.feature_dir // empty' 2>/dev/null) || true
        kb_prefix=$(echo "$json_line" | jq -r '.story_prefix // empty' 2>/dev/null) || true

        if [[ -n "$kb_feature_dir" && "$kb_feature_dir" != "null" ]]; then
          FEATURE_DIR="$kb_feature_dir"
          PLAN_SLUG=$(basename "$FEATURE_DIR")
          STORY_PREFIX="${kb_prefix:-}"
          return 0
        fi
      fi
    fi
  fi

  # ── Filesystem fallback 1: grep for **Plan Slug** marker ──────────
  local index_file
  index_file=$(grep -rl "^\*\*Plan Slug\*\*: ${slug}$" plans/ 2>/dev/null | head -1) || true
  if [[ -n "$index_file" ]]; then
    FEATURE_DIR=$(dirname "$index_file")
    PLAN_SLUG=$(basename "$FEATURE_DIR")
    STORY_PREFIX=""
    return 0
  fi

  # ── Filesystem fallback 2: directory named after slug ─────────────
  local dir_match
  for search_root in plans/future plans; do
    dir_match=$(find "$search_root" -maxdepth 4 -type d -name "$slug" 2>/dev/null | head -1) || true
    if [[ -n "$dir_match" ]]; then
      FEATURE_DIR="$dir_match"
      PLAN_SLUG=$(basename "$FEATURE_DIR")
      STORY_PREFIX=""
      return 0
    fi
  done

  echo "Error: Could not find plan with slug '$slug' in KB or filesystem"
  exit 1
}

# Discover stories from KB (primary source of truth).
#
# After calling, STORY_PREFIX and DISCOVERED_STORIES (array) are set.
# Requires FEATURE_DIR and STORY_PREFIX to be set first (via resolve_plan).
#
# KSOT-3040: KB is the sole source of truth for story discovery.
# stories.index.md fallback has been removed.
#
discover_stories() {
  # ── KB-first: try kb_list_stories as primary source ────────────────
  if [[ -n "${STORY_PREFIX:-}" ]]; then
    local raw_result
    raw_result=$(timeout 30 env -u CLAUDECODE claude -p \
      "Call kb_list_stories with prefix '${STORY_PREFIX}'. Output ONLY a JSON array of story IDs sorted by ID, e.g. [\"SKCR-0010\",\"SKCR-0020\"]. No markdown fences, no explanation." \
      --allowedTools "mcp__knowledge-base__kb_list_stories" \
      --output-format text 2>/dev/null) || true

    if [[ -n "$raw_result" ]]; then
      local json_arr
      json_arr=$(echo "$raw_result" | grep -o '\[.*\]' | tail -1) || true

      if [[ -n "$json_arr" ]]; then
        DISCOVERED_STORIES=()
        while IFS= read -r story_id; do
          [[ -n "$story_id" ]] && DISCOVERED_STORIES+=("$story_id")
        done < <(echo "$json_arr" | jq -r '.[]' 2>/dev/null)

        if [[ ${#DISCOVERED_STORIES[@]} -gt 0 ]]; then
          return 0
        fi
      fi
    fi

    echo "Error: KB returned no stories for prefix '${STORY_PREFIX}' (KB may be unavailable)"
    exit 1
  fi

  # ── No STORY_PREFIX available ──────────────────────────────────────
  echo "Error: No STORY_PREFIX set — resolve_plan must be called first and KB must provide the prefix"
  exit 1
}
