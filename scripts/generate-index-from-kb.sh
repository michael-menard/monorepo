#!/usr/bin/env bash
#
# Generate stories.index.md from KB (single source of truth).
#
# KSOT-2040: stories.index.md is now a read-only derived artifact.
# This script queries kb_list_stories and renders the markdown table.
#
# Usage:
#   ./scripts/generate-index-from-kb.sh <plan-slug>
#   ./scripts/generate-index-from-kb.sh <feature-dir-path>
#

set -eo pipefail
unset CLAUDECODE 2>/dev/null || true

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source shared helpers
# shellcheck source=lib/resolve-plan.sh
source "$SCRIPT_DIR/lib/resolve-plan.sh"

PLAN_SLUG=""
FEATURE_DIR=""
STORY_PREFIX=""

# Parse args
if [[ -z "${1:-}" ]]; then
  echo "Usage: $0 <plan-slug | feature-dir>"
  exit 1
fi

resolve_plan "$1"

if [[ -z "$FEATURE_DIR" ]]; then
  echo "Error: Could not resolve plan '$1'"
  exit 1
fi

INDEX_FILE="$FEATURE_DIR/stories.index.md"

# Query KB for all stories in this plan
raw_result=$(timeout 60 env -u CLAUDECODE claude -p \
  "Call kb_list_stories with prefix '${STORY_PREFIX}'. For each story, output a JSON array of objects with keys: story_id, title, state, priority, points. Sort by story_id. No markdown fences, no explanation. Output ONLY the JSON array." \
  --allowedTools "mcp__knowledge-base__kb_list_stories" \
  --output-format text 2>/dev/null) || {
  echo "Error: Failed to query KB for stories"
  exit 1
}

json_arr=$(echo "$raw_result" | grep -o '\[.*\]' | tail -1) || true

if [[ -z "$json_arr" ]]; then
  echo "Error: No stories returned from KB for prefix '$STORY_PREFIX'"
  exit 1
fi

# State → display label mapping
state_to_label() {
  case "$1" in
    backlog)             echo "backlog" ;;
    ready)               echo "ready-to-work" ;;
    in_progress)         echo "in-progress" ;;
    ready_for_review)    echo "needs-code-review" ;;
    ready_for_qa)        echo "ready-for-qa" ;;
    in_qa)               echo "uat" ;;
    completed)           echo "completed" ;;
    cancelled)           echo "superseded" ;;
    blocked)             echo "BLOCKED" ;;
    failed_code_review)  echo "failed-code-review" ;;
    failed_qa)           echo "failed-qa" ;;
    deferred)            echo "deferred" ;;
    *)                   echo "$1" ;;
  esac
}

# State → emoji mapping
state_to_emoji() {
  case "$1" in
    backlog)             echo "⏸️" ;;
    ready)               echo "⏳" ;;
    in_progress)         echo "🚧" ;;
    ready_for_review)    echo "👀" ;;
    ready_for_qa)        echo "🔍" ;;
    in_qa)               echo "✅" ;;
    completed)           echo "✅" ;;
    cancelled)           echo "—" ;;
    blocked)             echo "🚫" ;;
    failed_code_review)  echo "🔴" ;;
    failed_qa)           echo "⚠️" ;;
    deferred)            echo "⏸️" ;;
    *)                   echo "❓" ;;
  esac
}

# Generate the index file
{
  echo "<!-- AUTO-GENERATED FROM KB — DO NOT EDIT MANUALLY -->"
  echo "<!-- Regenerate with: ./scripts/generate-index-from-kb.sh $1 -->"
  echo "<!-- Generated: $(date -u '+%Y-%m-%dT%H:%M:%SZ') -->"
  echo ""
  echo "**Plan Slug**: $(basename "$FEATURE_DIR")"
  echo "**Story Prefix**: $STORY_PREFIX"
  echo ""
  echo "## Stories"
  echo ""
  echo "| Story ID | Title | Status | Priority | Points |"
  echo "|----------|-------|--------|----------|--------|"

  echo "$json_arr" | jq -r '.[] | "\(.story_id)\t\(.title // "—")\t\(.state // "backlog")\t\(.priority // "—")\t\(.points // "—")"' 2>/dev/null | \
  while IFS=$'\t' read -r sid title state prio pts; do
    label=$(state_to_label "$state")
    emoji=$(state_to_emoji "$state")
    echo "| $sid | $title | ${emoji} $label | $prio | $pts |"
  done
} > "$INDEX_FILE"

story_count=$(echo "$json_arr" | jq 'length' 2>/dev/null || echo "?")
echo "Generated $INDEX_FILE ($story_count stories from KB)"
