#!/usr/bin/env bash
#
# Work Order Parser — Extract stories from WORK-ORDER-BY-BATCH.md
#
# Parses the Unicode box-drawing table and extracts STORY_ID, FEATURE_DIR,
# and STATUS for each row. Handles multi-line rows (title/command wrapping)
# and wave header rows.
#
# Usage:
#   source "$(dirname "$0")/lib/work-order-parser.sh"
#   parse_work_order "plans/future/platform/WORK-ORDER-BY-BATCH.md"
#   echo "${WO_STORY_IDS[@]}"
#   wo_feature_dir "WINT-0040"
#   wo_status "WINT-0040"
#   wo_command "WINT-0040"
#
# All functions are bash 3.2 safe (no associative arrays, no readarray).
#

# ── Output arrays ──────────────────────────────────────────────────
WO_STORY_IDS=()

# Flat file cache: STORY_ID\tFEATURE_DIR\tSTATUS\tCOMMAND
WO_CACHE_FILE=""

# ── Parse work order table ─────────────────────────────────────────
# Args: $1 = path to work order markdown file
#
# Populates WO_STORY_IDS and WO_CACHE_FILE.
#
parse_work_order() {
  local wo_file="$1"

  if [[ ! -f "$wo_file" ]]; then
    echo "Error: Work order file not found: $wo_file" >&2
    return 1
  fi

  WO_CACHE_FILE=$(mktemp /tmp/wo-cache-$$.XXXXXX)
  WO_STORY_IDS=()

  # Accumulator for multi-line rows
  local acc_story="" acc_status="" acc_command=""

  # Flush accumulated row
  _flush_row() {
    if [[ -z "$acc_story" ]]; then
      return
    fi
    # Trim whitespace
    acc_story=$(echo "$acc_story" | xargs)
    acc_status=$(echo "$acc_status" | xargs)
    acc_command=$(echo "$acc_command" | xargs)

    # Skip non-story rows (wave headers, empty)
    if [[ ! "$acc_story" =~ ^[A-Z]+-[0-9]+$ ]]; then
      acc_story="" acc_status="" acc_command=""
      return
    fi

    # Extract FEATURE_DIR from command
    # Commands look like: /dev-implement-story plans/future/platform/wint WINT-0040
    # or: /elab-story plans/future/platform/kb-artifact-migration KBAR-0140
    local feat_dir=""
    feat_dir=$(echo "$acc_command" | grep -oE 'plans/[^ ]+' | head -1) || true

    echo "${acc_story}	${feat_dir}	${acc_status}	${acc_command}" >> "$WO_CACHE_FILE"
    WO_STORY_IDS+=("$acc_story")

    acc_story="" acc_status="" acc_command=""
  }

  while IFS= read -r line; do
    # Skip separator rows (├───, ┌───, └───)
    if [[ "$line" == *"├"* || "$line" == *"┌"* || "$line" == *"└"* ]]; then
      # Separator means end of current row — flush
      _flush_row
      continue
    fi

    # Skip empty lines
    [[ -z "$line" ]] && continue

    # Must be a data row with │ delimiters
    if [[ "$line" != *"│"* ]]; then
      continue
    fi

    # Split on │ (Unicode box-drawing pipe)
    # Columns: empty | # | Story | Title | Status | Next Command | empty
    local col_num col_story col_status col_command
    col_num=$(echo "$line" | awk -F '│' '{print $2}' | xargs) || true
    col_story=$(echo "$line" | awk -F '│' '{print $3}' | xargs) || true
    col_status=$(echo "$line" | awk -F '│' '{print $5}' | xargs) || true
    col_command=$(echo "$line" | awk -F '│' '{print $6}' | xargs) || true

    # If we have a new story ID, flush previous and start new accumulation
    if [[ "$col_story" =~ ^[A-Z]+-[0-9]+$ ]]; then
      _flush_row
      acc_story="$col_story"
      acc_status="$col_status"
      acc_command="$col_command"
    elif [[ -n "$acc_story" ]]; then
      # Continuation line — append to command (handles wrapping)
      if [[ -n "$col_command" ]]; then
        acc_command="${acc_command} ${col_command}"
      fi
      # Status continuation (rare but handle it)
      if [[ -n "$col_status" && -z "$acc_status" ]]; then
        acc_status="$col_status"
      fi
    fi
  done < "$wo_file"

  # Flush final row
  _flush_row

  unset -f _flush_row
}

# ── Lookup functions ────────────────────────────────────────────────

# Returns the FEATURE_DIR for a story ID
wo_feature_dir() {
  local id="$1"
  grep "^${id}	" "$WO_CACHE_FILE" 2>/dev/null | head -1 | cut -f2
}

# Returns the work order status for a story ID
wo_status() {
  local id="$1"
  grep "^${id}	" "$WO_CACHE_FILE" 2>/dev/null | head -1 | cut -f3
}

# Returns the full command string for a story ID
wo_command() {
  local id="$1"
  grep "^${id}	" "$WO_CACHE_FILE" 2>/dev/null | head -1 | cut -f4
}

# Check if a story ID exists in the work order
wo_has_story() {
  local id="$1"
  grep -q "^${id}	" "$WO_CACHE_FILE" 2>/dev/null
}

# ── Cleanup ──────────────────────────────────────────────────────────

wo_cleanup() {
  if [[ -n "$WO_CACHE_FILE" ]] && [[ -f "$WO_CACHE_FILE" ]]; then
    rm -f "$WO_CACHE_FILE"
  fi
}
