#!/usr/bin/env bash
# audit-story-status.sh — Find actual status of stories by checking filesystem + KB
# Usage: ./scripts/audit-story-status.sh [STORY_ID ...]
# If no args, checks all stories from the WINT next-actions table.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLANS_DIR="$REPO_ROOT/plans/future/platform"

# Story IDs to check (from the next-actions table)
STORIES=(
  WINT-0150 WINT-0180 WINT-0220
  WINT-0160 WINT-0200 WINT-0040
  WINT-0170 WINT-1130 WINT-0210
  WINT-1110 WINT-1010 WINT-1140 WINT-1150 WINT-1070 WINT-1040 WINT-1050
  KBAR-0050 WINT-9010 KBAR-0060 WINT-1160 WINT-1120 WINT-7020
  MODL-0040 AUDT-0020
  WINT-9020 WINT-4080 WINT-4090 KBAR-0080 WINT-0190 WINT-0240 WINT-0250
  KBAR-0090 KBAR-0130 KBAR-0140 KBAR-0150 AUDT-0030 TELE-0010
  WINT-2090 WINT-2100 WINT-9090 KBAR-0160 KBAR-0170 KBAR-0180 KBAR-0190
  KBAR-0200 KBAR-0220
  WINT-9105 WINT-9106 WINT-9107 WINT-9110 WINT-9120 WINT-9130 WINT-9140
  KBAR-0230 KBAR-0240
  WINT-2010 WINT-2020 WINT-2030 WINT-2040 WINT-2050 WINT-2060 WINT-2070 WINT-2080 WINT-2110 WINT-2120
  WINT-4010 WINT-4020 WINT-4030 WINT-4040 WINT-4050 WINT-4060 WINT-4070 WINT-4100 WINT-4110 WINT-4120 WINT-4130 WINT-4140 WINT-4150
  WINT-9030 WINT-9040 WINT-9050 WINT-9060
  WINT-0120 WINT-3010 WINT-3020 WINT-3030 WINT-3040 WINT-3050 WINT-3060 WINT-3070 WINT-3080 WINT-3090 WINT-3100 WINT-9100
)

# Override with CLI args if provided
if [ $# -gt 0 ]; then
  STORIES=("$@")
fi

# Status directories in lifecycle order (most progressed first)
STATUS_DIRS=(
  "UAT"
  "needs-code-review"
  "ready-for-qa"
  "failed-qa"
  "failed-code-review"
  "in-progress"
  "ready-to-work"
  "backlog"
  "_bootstrap"
)

# Map directory name to a display status
dir_to_status() {
  case "$1" in
    UAT)                  echo "UAT" ;;
    needs-code-review)    echo "needs-code-review" ;;
    ready-for-qa)         echo "ready-for-qa" ;;
    failed-qa)            echo "failed-qa" ;;
    failed-code-review)   echo "failed-code-review" ;;
    in-progress)          echo "in-progress" ;;
    ready-to-work)        echo "ready-to-work" ;;
    backlog)              echo "backlog" ;;
    _bootstrap)           echo "created" ;;
    *)                    echo "$1" ;;
  esac
}

# Search all feature dirs for a story
find_story_fs() {
  local story_id="$1"
  local found_path=""
  local found_status=""

  # Search recursively under plans dir for the story directory
  while IFS= read -r path; do
    # Extract the status directory (parent of the story dir)
    local parent
    parent="$(basename "$(dirname "$path")")"

    # Skip nested duplicates (e.g., KBAR-0020/KBAR-0020)
    local grandparent
    grandparent="$(basename "$(dirname "$(dirname "$path")")")"
    if [ "$grandparent" = "$story_id" ]; then
      continue
    fi

    # Skip .md files that match the pattern
    if [ ! -d "$path" ]; then
      continue
    fi

    local status
    status="$(dir_to_status "$parent")"

    # If we already found one, pick the most progressed
    if [ -n "$found_status" ]; then
      # Simple: UAT > needs-code-review > ready-for-qa > in-progress > ready-to-work > backlog
      # Just report both
      echo "  DUPLICATE: also found in $parent/ ($status)"
    fi

    found_path="$path"
    found_status="$status"
  done < <(find "$PLANS_DIR" -maxdepth 5 -type d -name "$story_id" 2>/dev/null)

  if [ -n "$found_status" ]; then
    echo "$found_status"
  else
    echo "NOT-FOUND"
  fi
}

# Expected statuses from the table (for comparison)
declare_expected() {
  local story="$1"
  case "$story" in
    WINT-0150) echo "backlog" ;;
    WINT-0180) echo "created" ;;
    WINT-0220) echo "created" ;;
    WINT-0160) echo "ready-to-work" ;;
    WINT-0200) echo "ready-to-work" ;;
    WINT-0040) echo "ready-to-work" ;;
    WINT-0170) echo "backlog" ;;
    WINT-1130) echo "backlog" ;;
    WINT-0210) echo "backlog" ;;
    WINT-1110) echo "backlog" ;;
    WINT-1010) echo "backlog" ;;
    WINT-1140) echo "backlog" ;;
    WINT-1150) echo "backlog" ;;
    WINT-1070) echo "backlog" ;;
    WINT-1040) echo "backlog" ;;
    WINT-1050) echo "backlog" ;;
    KBAR-0050) echo "backlog" ;;
    WINT-9010) echo "backlog" ;;
    KBAR-0060) echo "backlog" ;;
    WINT-1160) echo "backlog" ;;
    WINT-1120) echo "backlog" ;;
    WINT-7020) echo "backlog" ;;
    MODL-0040) echo "backlog" ;;
    AUDT-0020) echo "created" ;;
    WINT-9020) echo "created" ;;
    WINT-4080) echo "backlog" ;;
    WINT-4090) echo "backlog" ;;
    KBAR-0080) echo "backlog" ;;
    WINT-0190) echo "backlog" ;;
    WINT-0240) echo "created" ;;
    WINT-0250) echo "created" ;;
    KBAR-0090) echo "backlog" ;;
    KBAR-0130) echo "ready-to-work" ;;
    KBAR-0140) echo "backlog" ;;
    KBAR-0150) echo "backlog" ;;
    AUDT-0030) echo "backlog" ;;
    TELE-0010) echo "created" ;;
    WINT-2090) echo "created" ;;
    WINT-2100) echo "backlog" ;;
    WINT-9090) echo "backlog" ;;
    KBAR-0160) echo "ready-to-work" ;;
    KBAR-0170) echo "backlog" ;;
    KBAR-0180) echo "created" ;;
    KBAR-0190) echo "created" ;;
    KBAR-0200) echo "in-qa" ;;
    KBAR-0220) echo "backlog" ;;
    WINT-9105) echo "backlog" ;;
    WINT-9106) echo "backlog" ;;
    WINT-9107) echo "backlog" ;;
    WINT-9110) echo "backlog" ;;
    WINT-9120) echo "backlog" ;;
    WINT-9130) echo "backlog" ;;
    WINT-9140) echo "backlog" ;;
    KBAR-0230) echo "backlog" ;;
    KBAR-0240) echo "backlog" ;;
    *) echo "unknown" ;;
  esac
}

# --- Main ---

echo "=========================================="
echo "  Story Status Audit"
echo "  $(date '+%Y-%m-%d %H:%M')"
echo "=========================================="
echo ""

# Part 1: Filesystem scan
echo "--- Filesystem Status ---"
printf "%-12s  %-20s  %-20s  %s\n" "STORY" "TABLE-STATUS" "FS-STATUS" "MATCH?"
printf "%-12s  %-20s  %-20s  %s\n" "----------" "-------------------" "-------------------" "------"

mismatches=0
total=0

for story in "${STORIES[@]}"; do
  expected="$(declare_expected "$story")"
  actual="$(find_story_fs "$story" 2>/dev/null | tail -1)"

  total=$((total + 1))

  if [ "$expected" = "$actual" ]; then
    match="OK"
  elif [ "$actual" = "NOT-FOUND" ]; then
    match="NOT-FOUND"
    mismatches=$((mismatches + 1))
  else
    match="MISMATCH"
    mismatches=$((mismatches + 1))
  fi

  printf "%-12s  %-20s  %-20s  %s\n" "$story" "$expected" "$actual" "$match"
done

echo ""
echo "Total: $total | Mismatches: $mismatches"
echo ""

# Part 2: KB query via claude -p (optional, set USE_KB=1 to enable)
if [ "${USE_KB:-0}" = "1" ]; then
  echo "--- KB Status (via claude -p) ---"
  echo "Querying KB for all story statuses..."

  # Build the story list as a comma-separated string
  story_list=""
  for story in "${STORIES[@]}"; do
    if [ -n "$story_list" ]; then
      story_list="$story_list, $story"
    else
      story_list="$story"
    fi
  done

  # Query KB via claude -p
  claude -p "Use the kb_list_stories MCP tool to get the status of all stories in the 'wint' plan. Then also check 'kb-artifact-migration', 'code-audit', 'model-experimentation', and 'telemetry' plans. Output ONLY a table with columns: STORY_ID, KB_STATUS. No explanation. Stories to check: $story_list" 2>/dev/null || echo "(KB query failed — is claude CLI available?)"
fi

echo ""
echo "Done. Review MISMATCH rows above."
echo "To also query the KB: USE_KB=1 ./scripts/audit-story-status.sh"
