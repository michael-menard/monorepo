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

# Helper: extract STORY_PREFIX from a stories.index.md file
_extract_prefix_from_index() {
  local idx="$1"
  local pfx
  # Try markdown format: **Prefix**: WINT or **Story Prefix**: WINT
  pfx=$(sed -n 's/^\*\*\(Story \)\{0,1\}Prefix\*\*: //p' "$idx" | head -1) || true
  if [[ -z "$pfx" ]]; then
    # Try YAML frontmatter format: story_prefix: "WINT"
    pfx=$(sed -n 's/^story_prefix: *"\{0,1\}\([A-Z][A-Z0-9]*\)"\{0,1\} *$/\1/p' "$idx" | head -1) || true
  fi
  if [[ -n "$pfx" ]]; then
    STORY_PREFIX="$pfx"
  fi
}

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
    _extract_prefix_from_index "$index_file"
    return 0
  fi

  # ── Filesystem fallback 2: directory named after slug ─────────────
  local dir_match
  for search_root in plans/future plans; do
    dir_match=$(find "$search_root" -maxdepth 4 -type d -name "$slug" 2>/dev/null | head -1) || true
    if [[ -n "$dir_match" ]]; then
      FEATURE_DIR="$dir_match"
      PLAN_SLUG=$(basename "$FEATURE_DIR")
      # Try to extract prefix from stories.index.md if present
      if [[ -f "$FEATURE_DIR/stories.index.md" ]]; then
        _extract_prefix_from_index "$FEATURE_DIR/stories.index.md"
      fi
      return 0
    fi
  done

  echo "Error: Could not find plan with slug '$slug' in KB or filesystem"
  exit 1
}

# Discover stories from KB (primary) or stories.index.md (fallback).
#
# After calling, STORY_PREFIX and DISCOVERED_STORIES (array) are set.
# Requires FEATURE_DIR and optionally STORY_PREFIX to be set first.
#
# KSOT-2010: KB is the primary source of truth for story discovery.
# stories.index.md is kept as a fallback for when KB is unavailable.
#
discover_stories() {
  local index_file="$FEATURE_DIR/stories.index.md"

  # ── Extract STORY_PREFIX from index if not already set ─────────────
  if [[ -z "${STORY_PREFIX:-}" ]] && [[ -f "$index_file" ]]; then
    STORY_PREFIX=$(sed -n 's/^\*\*\(Story \)\{0,1\}Prefix\*\*: //p' "$index_file" | head -1) || true
    if [[ -z "${STORY_PREFIX:-}" ]]; then
      STORY_PREFIX=$(sed -n 's/^story_prefix: *"\{0,1\}\([A-Z][A-Z0-9]*\)"\{0,1\} *$/\1/p' "$index_file" | head -1) || true
    fi
  fi

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
  fi

  # ── Fallback: stories.index.md ─────────────────────────────────────
  if [[ -f "$index_file" ]]; then
    echo "WARNING: KB discovery failed or returned empty. Falling back to stories.index.md"

    if [[ -z "${STORY_PREFIX:-}" ]]; then
      echo "Error: No prefix found in $index_file (checked **Prefix** and story_prefix frontmatter)"
      exit 1
    fi

    DISCOVERED_STORIES=()
    while IFS= read -r story_id; do
      DISCOVERED_STORIES+=("$story_id")
    done < <(grep -oE "^\| ${STORY_PREFIX}-[0-9]+ \|" "$index_file" | grep -oE "${STORY_PREFIX}-[0-9]+")

    if [[ ${#DISCOVERED_STORIES[@]} -eq 0 ]]; then
      echo "Error: No stories found in $index_file"
      exit 1
    fi
    return 0
  fi

  # ── Neither KB nor filesystem had stories ──────────────────────────
  if [[ -z "${STORY_PREFIX:-}" ]]; then
    echo "Error: No stories.index.md in $FEATURE_DIR and no STORY_PREFIX from KB"
  else
    echo "Error: No stories found for prefix '$STORY_PREFIX' in KB or filesystem"
  fi
  exit 1
}
