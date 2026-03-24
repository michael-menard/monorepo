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

# Ensure spinner is available
SCRIPT_DIR_KC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "${SPIN_PID+x}" ]]; then
  source "$SCRIPT_DIR_KC/spinner.sh"
fi

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

  spin_start "Fetching KB stories for '$plan_slug'..."

  # Direct DB query — fast and reliable vs claude -p which can hang/timeout
  local container
  container=$(docker ps --filter "publish=5435" -q 2>/dev/null | head -1)

  if [[ -z "$container" ]]; then
    spin_fail "No docker container found on port 5435"
    touch "$KB_CACHE_FILE"
    return 0
  fi

  local raw_result
  raw_result=$(docker exec "$container" psql -U kbuser -d knowledgebase \
    -t -A -F '|' -c "
      SELECT s.story_id, s.state, s.epic, s.feature
      FROM workflow.stories s
      JOIN workflow.plan_story_links psl ON s.story_id = psl.story_id
      WHERE psl.plan_slug = '${plan_slug}'
        AND s.state NOT IN ('completed', 'cancelled', 'deferred', 'uat')
      ORDER BY s.story_id
    " 2>/dev/null) || true

  if [[ -z "$raw_result" ]]; then
    # Fallback: prefix-based lookup
    local prefix="${STORY_PREFIX:-}"
    if [[ -n "$prefix" ]]; then
      raw_result=$(docker exec "$container" psql -U kbuser -d knowledgebase \
        -t -A -F '|' -c "
          SELECT s.story_id, s.state, s.epic, s.feature
          FROM workflow.stories s
          WHERE s.story_id LIKE '${prefix}-%'
            AND s.state NOT IN ('completed', 'cancelled', 'deferred', 'uat')
          ORDER BY s.story_id
        " 2>/dev/null) || true
    fi
  fi

  if [[ -z "$raw_result" ]]; then
    spin_fail "KB returned empty for '$plan_slug'"
    touch "$KB_CACHE_FILE"
    return 0
  fi

  # Convert pipe-delimited rows to NDJSON
  > "$KB_CACHE_FILE"
  while IFS='|' read -r sid state epic feature; do
    [[ -z "$sid" ]] && continue
    printf '{"id":"%s","state":"%s","phase":"%s","storyDir":"%s"}\n' \
      "$sid" "$state" "${epic:-}" "${feature:-}" >> "$KB_CACHE_FILE"
  done <<< "$raw_result"

  # Build sorted story ID array
  while IFS= read -r story_id; do
    [[ -n "$story_id" ]] && KB_STORY_IDS+=("$story_id")
  done < <(jq -r '.id' "$KB_CACHE_FILE" 2>/dev/null | sort)

  if [[ ${#KB_STORY_IDS[@]} -eq 0 ]]; then
    spin_fail "No stories in KB for '$plan_slug'"
  else
    spin_stop "Cached ${#KB_STORY_IDS[@]} stories for '$plan_slug'"
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

  spin_start "Fetching KB states for stories..."

  # Direct DB query — convert comma-separated IDs to SQL IN list
  local container
  container=$(docker ps --filter "publish=5435" -q 2>/dev/null | head -1)

  if [[ -z "$container" ]]; then
    spin_fail "No docker container found on port 5435"
    touch "$KB_CACHE_FILE"
    return 0
  fi

  # Build SQL-safe IN clause: 'ID1','ID2','ID3'
  local sql_in
  sql_in=$(echo "$ids_csv" | tr ',' '\n' | sed "s/^.*$/'\0'/" | tr '\n' ',' | sed 's/,$//')

  local raw_result
  raw_result=$(docker exec "$container" psql -U kbuser -d knowledgebase \
    -t -A -F '|' -c "
      SELECT story_id, state, epic, feature
      FROM workflow.stories
      WHERE story_id IN (${sql_in})
      ORDER BY story_id
    " 2>/dev/null) || true

  if [[ -z "$raw_result" ]]; then
    spin_fail "KB returned empty for story IDs"
    touch "$KB_CACHE_FILE"
    return 0
  fi

  # Convert pipe-delimited rows to NDJSON (append to existing cache)
  while IFS='|' read -r sid state epic feature; do
    [[ -z "$sid" ]] && continue
    printf '{"id":"%s","state":"%s","phase":"%s","storyDir":"%s"}\n' \
      "$sid" "$state" "${epic:-}" "${feature:-}" >> "$KB_CACHE_FILE"
  done <<< "$raw_result"

  # Rebuild sorted story ID array from full cache
  KB_STORY_IDS=()
  while IFS= read -r story_id; do
    [[ -n "$story_id" ]] && KB_STORY_IDS+=("$story_id")
  done < <(jq -r '.id' "$KB_CACHE_FILE" 2>/dev/null | sort -u)

  spin_stop "Cached ${#KB_STORY_IDS[@]} stories from KB"
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

# ── Wave computation (dependency-based execution ordering) ─────────
#
# Computes wave numbers for stories based on their dependencies.
# Stories with no deps → wave 0. Stories depending on wave N → wave N+1.
# Matches the roadmap app's `computeWaves` algorithm.
#
# Args:
#   $1 = plan_slug (optional — if empty, uses story IDs from FILTERED_STORIES)
#   $2 = LOG_DIR (for writing .wave-cache and .deps-cache)
#
# Writes:
#   $LOG_DIR/.wave-cache — STORY_ID<TAB>WAVE_NUM
#   $LOG_DIR/.deps-cache — STORY_ID<TAB>DEP1,DEP2 (or STORY_ID<TAB>none)
#
# Sets:
#   KB_WAVE_MAX — highest wave number
#
KB_WAVE_MAX=0

kb_compute_waves() {
  local plan_slug="${1:-}"
  local log_dir="${2:-/tmp}"
  local wave_cache="$log_dir/.wave-cache"
  local deps_cache="$log_dir/.deps-cache"

  KB_WAVE_MAX=0
  : > "$wave_cache"
  : > "$deps_cache"

  spin_start "Computing dependency waves..."

  local container
  container=$(docker ps --filter "publish=5435" -q 2>/dev/null | head -1)

  if [[ -z "$container" ]]; then
    spin_fail "No docker container found on port 5435 — all stories in wave 0"
    # Put all stories in wave 0
    local sid
    for sid in "${FILTERED_STORIES[@]}"; do
      printf '%s\t0\n' "$sid" >> "$wave_cache"
      printf '%s\tnone\n' "$sid" >> "$deps_cache"
    done
    return 0
  fi

  # Fetch all deps for stories in scope
  local deps_result=""
  if [[ -n "$plan_slug" ]]; then
    deps_result=$(docker exec "$container" psql -U kbuser -d knowledgebase \
      -t -A -F '|' -c "
        SELECT sd.story_id, sd.depends_on_id
        FROM workflow.story_dependencies sd
        JOIN workflow.plan_story_links psl ON sd.story_id = psl.story_id
        WHERE psl.plan_slug = '${plan_slug}'
      " 2>/dev/null) || true
  else
    # Work-order mode: query by explicit story IDs
    local sql_in=""
    local sid
    for sid in "${FILTERED_STORIES[@]}"; do
      [[ -n "$sql_in" ]] && sql_in="${sql_in},"
      sql_in="${sql_in}'${sid}'"
    done
    if [[ -n "$sql_in" ]]; then
      deps_result=$(docker exec "$container" psql -U kbuser -d knowledgebase \
        -t -A -F '|' -c "
          SELECT story_id, depends_on_id
          FROM workflow.story_dependencies
          WHERE story_id IN (${sql_in})
        " 2>/dev/null) || true
    fi
  fi

  # Build deps cache: story → comma-separated deps
  # Use temp file for accumulation
  local deps_tmp="$log_dir/.deps-tmp-$$"
  : > "$deps_tmp"

  if [[ -n "$deps_result" ]]; then
    while IFS='|' read -r sid dep_id; do
      [[ -z "$sid" || -z "$dep_id" ]] && continue
      printf '%s\t%s\n' "$sid" "$dep_id" >> "$deps_tmp"
    done <<< "$deps_result"
  fi

  # Collapse per-story deps into comma-separated format for .deps-cache
  local seen_stories=""
  for sid in "${FILTERED_STORIES[@]}"; do
    local story_deps=""
    while IFS=$'\t' read -r s d; do
      [[ "$s" == "$sid" ]] && {
        [[ -n "$story_deps" ]] && story_deps="${story_deps},"
        story_deps="${story_deps}${d}"
      }
    done < "$deps_tmp"

    if [[ -n "$story_deps" ]]; then
      printf '%s\t%s\n' "$sid" "$story_deps" >> "$deps_cache"
    else
      printf '%s\tnone\n' "$sid" >> "$deps_cache"
    fi
  done

  rm -f "$deps_tmp"

  # ── Iterative wave computation (matching computeWaves algorithm) ──
  # Wave 0: stories with no deps (or deps outside the current scope)
  # Wave N+1: stories whose deps are all in wave ≤ N
  #
  # Build in-scope set for fast lookup
  local in_scope=""
  for sid in "${FILTERED_STORIES[@]}"; do
    in_scope="${in_scope}|${sid}|"
  done

  # Initialize: assign wave -1 (unresolved) to all stories
  local wave_tmp="$log_dir/.wave-tmp-$$"
  : > "$wave_tmp"
  for sid in "${FILTERED_STORIES[@]}"; do
    printf '%s\t-1\n' "$sid" >> "$wave_tmp"
  done

  local changed=true
  local iteration=0
  local max_iterations=100

  while $changed && [[ $iteration -lt $max_iterations ]]; do
    changed=false
    ((iteration++))

    for sid in "${FILTERED_STORIES[@]}"; do
      # Skip already-resolved stories
      local current_wave
      current_wave=$(grep "^${sid}	" "$wave_tmp" | cut -f2)
      [[ "$current_wave" != "-1" ]] && continue

      # Get this story's deps
      local deps_line
      deps_line=$(grep "^${sid}	" "$deps_cache" | cut -f2)

      if [[ -z "$deps_line" || "$deps_line" == "none" ]]; then
        # No deps → wave 0
        sed -i '' "s/^${sid}	-1$/${sid}	0/" "$wave_tmp" 2>/dev/null || \
          sed -i "s/^${sid}	-1$/${sid}	0/" "$wave_tmp"
        changed=true
        continue
      fi

      # Check if all in-scope deps are resolved
      local max_dep_wave=-1
      local all_resolved=true
      local IFS_SAVE="$IFS"
      IFS=',' read -ra dep_arr <<< "$deps_line"
      IFS="$IFS_SAVE"

      for dep in "${dep_arr[@]}"; do
        dep=$(echo "$dep" | tr -d ' ')
        [[ -z "$dep" ]] && continue

        # If dep is not in scope, treat as already satisfied (wave -1 → ignore)
        if [[ "$in_scope" != *"|${dep}|"* ]]; then
          continue
        fi

        local dep_wave
        dep_wave=$(grep "^${dep}	" "$wave_tmp" | cut -f2)
        if [[ "$dep_wave" == "-1" ]]; then
          all_resolved=false
          break
        fi
        if [[ $dep_wave -gt $max_dep_wave ]]; then
          max_dep_wave=$dep_wave
        fi
      done

      if $all_resolved; then
        local new_wave=$((max_dep_wave + 1))
        [[ $max_dep_wave -lt 0 ]] && new_wave=0
        sed -i '' "s/^${sid}	-1$/${sid}	${new_wave}/" "$wave_tmp" 2>/dev/null || \
          sed -i "s/^${sid}	-1$/${sid}	${new_wave}/" "$wave_tmp"
        changed=true
        if [[ $new_wave -gt $KB_WAVE_MAX ]]; then
          KB_WAVE_MAX=$new_wave
        fi
      fi
    done
  done

  # Any still-unresolved stories (circular deps) → wave KB_WAVE_MAX+1
  local unresolved=0
  for sid in "${FILTERED_STORIES[@]}"; do
    local w
    w=$(grep "^${sid}	" "$wave_tmp" | cut -f2)
    if [[ "$w" == "-1" ]]; then
      local fallback_wave=$((KB_WAVE_MAX + 1))
      sed -i '' "s/^${sid}	-1$/${sid}	${fallback_wave}/" "$wave_tmp" 2>/dev/null || \
        sed -i "s/^${sid}	-1$/${sid}	${fallback_wave}/" "$wave_tmp"
      ((unresolved++))
    fi
  done
  [[ $unresolved -gt 0 ]] && KB_WAVE_MAX=$((KB_WAVE_MAX + 1))

  # Write final wave cache
  cp "$wave_tmp" "$wave_cache"
  rm -f "$wave_tmp"

  # Count stories per wave for summary
  local wave_summary=""
  local w=0
  while [[ $w -le $KB_WAVE_MAX ]]; do
    local count
    count=$(grep "	${w}$" "$wave_cache" | wc -l | tr -d ' ')
    [[ $count -gt 0 ]] && wave_summary="${wave_summary} w${w}=${count}"
    ((w++))
  done

  if [[ $unresolved -gt 0 ]]; then
    spin_stop "Computed ${KB_WAVE_MAX} waves (${#FILTERED_STORIES[@]} stories:${wave_summary}) — $unresolved with circular deps"
  else
    spin_stop "Computed $((KB_WAVE_MAX + 1)) wave(s) (${#FILTERED_STORIES[@]} stories:${wave_summary})"
  fi
}

# Get the wave number for a story from the wave cache
kb_story_wave() {
  local story_id="$1"
  local log_dir="${2:-/tmp}"
  local wave_cache="$log_dir/.wave-cache"
  if [[ -f "$wave_cache" ]]; then
    grep "^${story_id}	" "$wave_cache" | cut -f2 | head -1
  else
    echo "0"
  fi
}

# ── Cleanup ──────────────────────────────────────────────────────────

kb_cleanup() {
  spin_kill 2>/dev/null || true
  if [[ -n "$KB_CACHE_FILE" ]] && [[ -f "$KB_CACHE_FILE" ]]; then
    rm -f "$KB_CACHE_FILE"
  fi
}

# Register cleanup on exit (safe to call multiple times — last trap wins)
trap kb_cleanup EXIT
