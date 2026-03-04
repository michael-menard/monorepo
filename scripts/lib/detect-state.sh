#!/usr/bin/env bash
#
# State Detection Library — Artifact-aware state detection for stories.
#
# Determines a story's REAL state by checking filesystem artifacts,
# not trusting directory names alone. This is the self-healing core:
# if a story is in the wrong stage directory, this detects the mismatch.
#
# Usage:
#   source "$(dirname "$0")/lib/detect-state.sh"
#   detect_story_state "WINT-0040" "plans/future/platform/wint"
#   echo "$DETECTED_STATE"        # e.g., ELABORATED
#   echo "$DETECTED_STAGE"        # e.g., ready-to-work
#   echo "$DETECTED_STORY_DIR"    # e.g., plans/future/platform/wint/ready-to-work/WINT-0040
#
# All functions are bash 3.2 safe.
#

# ── State enum ──────────────────────────────────────────────────────
# NOT_FOUND       — no directory exists for this story (or only a seed in backlog/)
# GENERATED       — story file exists (in created/ or backlog/) but no ELAB.yaml
# ELABORATED      — ELAB.yaml exists but no EVIDENCE.yaml
# NEEDS_REVIEW    — EVIDENCE.yaml exists but no REVIEW.yaml
# FAILED_REVIEW   — in failed-code-review stage
# READY_FOR_QA    — REVIEW.yaml exists
# FAILED_QA       — in failed-qa stage
# UAT             — in UAT/ or done/
# NEEDS_SPLIT     — story.yaml contains needs-split marker

# ── Stage search order (most-progressed first) ─────────────────────
# Note: created/ is where /pm-story generate writes completed stories.
# backlog/ may contain only a seed (_pm/STORY-SEED.md) before generation.
DETECT_STAGE_ORDER=(done UAT failed-qa ready-for-qa failed-code-review needs-code-review in-progress ready-to-work created elaboration backlog)

# ── Output variables ────────────────────────────────────────────────
DETECTED_STATE=""
DETECTED_STAGE=""
DETECTED_STORY_DIR=""
DETECTED_DUPLICATES=""  # space-separated list of stale stage dirs that were cleaned up

# ── Check if a story file exists (story.yaml or {STORY_ID}.md) ─────
# Args: $1 = story_dir, $2 = story_id
# Returns: 0 if found, 1 if not
has_story_file() {
  local story_dir="$1"
  local story_id="$2"
  [[ -f "${story_dir}/story.yaml" ]] && return 0
  [[ -f "${story_dir}/${story_id}.md" ]] && return 0
  return 1
}

# ── Find all stage directories containing a story ───────────────────
# Args: $1 = story_id, $2 = feature_dir
# Outputs: space-separated list of stages (most-progressed first)
find_story_stages() {
  local story_id="$1"
  local feature_dir="$2"
  local found=""

  for stage in "${DETECT_STAGE_ORDER[@]}"; do
    if [[ -d "${feature_dir}/${stage}/${story_id}" ]]; then
      if [[ -n "$found" ]]; then
        found="${found} ${stage}"
      else
        found="$stage"
      fi
    fi
  done
  echo "$found"
}

# ── Map a stage + artifacts to a state enum ─────────────────────────
# Args: $1 = story_dir (full path to story within stage)
#       $2 = stage (directory name)
#       $3 = story_id
# Outputs: state enum string
map_stage_to_state() {
  local story_dir="$1"
  local stage="$2"
  local story_id="$3"
  local impl_dir="${story_dir}/_implementation"

  # Check for needs-split (check both story file variants)
  if grep -q "needs.split\|SPLIT_REQUIRED" "${story_dir}/story.yaml" 2>/dev/null; then
    echo "NEEDS_SPLIT"
    return
  fi
  if grep -q "needs.split\|SPLIT_REQUIRED" "${story_dir}/${story_id}.md" 2>/dev/null; then
    echo "NEEDS_SPLIT"
    return
  fi

  # Terminal states
  case "$stage" in
    UAT|done)
      echo "UAT"
      return
      ;;
  esac

  # Check artifacts to determine real state
  local has_elab=false has_evidence=false has_review=false

  [[ -f "${impl_dir}/ELAB.yaml" ]] && has_elab=true
  if [[ -f "${impl_dir}/EVIDENCE.yaml" ]]; then
    # Only count evidence if the file is non-trivial (>10 bytes)
    local esize
    esize=$(wc -c < "${impl_dir}/EVIDENCE.yaml" 2>/dev/null) || esize=0
    [[ $esize -gt 10 ]] && has_evidence=true
  fi
  [[ -f "${impl_dir}/REVIEW.yaml" ]] && has_review=true

  # Artifact-based state (truth over directory name)
  case "$stage" in
    failed-qa)
      echo "FAILED_QA"
      ;;
    ready-for-qa)
      if $has_review; then
        echo "READY_FOR_QA"
      elif $has_evidence; then
        # Missing REVIEW.yaml — needs review first
        echo "NEEDS_REVIEW"
      elif $has_elab; then
        echo "ELABORATED"
      else
        echo "GENERATED"
      fi
      ;;
    failed-code-review)
      echo "FAILED_REVIEW"
      ;;
    needs-code-review)
      if $has_evidence; then
        echo "NEEDS_REVIEW"
      elif $has_elab; then
        # Missing EVIDENCE.yaml — needs implementation
        echo "ELABORATED"
      else
        echo "GENERATED"
      fi
      ;;
    in-progress)
      # Stale claim from crashed run — infer from artifacts
      if $has_evidence; then
        echo "NEEDS_REVIEW"
      elif $has_elab; then
        echo "ELABORATED"
      else
        echo "GENERATED"
      fi
      ;;
    ready-to-work|created)
      if $has_elab; then
        echo "ELABORATED"
      elif has_story_file "$story_dir" "$story_id"; then
        echo "GENERATED"
      else
        echo "NOT_FOUND"
      fi
      ;;
    backlog)
      # backlog/ often contains only a seed (_pm/STORY-SEED.md) before
      # /pm-story generate has run. Only count as GENERATED if a real
      # story file exists (story.yaml or {STORY_ID}.md).
      if $has_elab; then
        echo "ELABORATED"
      elif has_story_file "$story_dir" "$story_id"; then
        echo "GENERATED"
      else
        echo "NOT_FOUND"
      fi
      ;;
    elaboration)
      if $has_elab; then
        echo "ELABORATED"
      elif has_story_file "$story_dir" "$story_id"; then
        echo "GENERATED"
      else
        echo "NOT_FOUND"
      fi
      ;;
    *)
      # Unknown stage — best-effort from artifacts
      if $has_review && $has_evidence; then
        echo "READY_FOR_QA"
      elif $has_evidence; then
        echo "NEEDS_REVIEW"
      elif $has_elab; then
        echo "ELABORATED"
      elif has_story_file "$story_dir" "$story_id"; then
        echo "GENERATED"
      else
        echo "NOT_FOUND"
      fi
      ;;
  esac
}

# ── KB state → detect-state enum mapping ──────────────────────────────
# Maps a KB state string to its corresponding detect-state enum.
# Returns empty string for unknown states (don't override filesystem).
kb_state_to_detected() {
  case "$1" in
    backlog)                       echo "GENERATED" ;;
    ready)                         echo "ELABORATED" ;;
    in_progress)                   echo "ELABORATED" ;;
    ready_for_review|in_review)    echo "NEEDS_REVIEW" ;;
    failed_code_review)            echo "FAILED_REVIEW" ;;
    ready_for_qa|in_qa)            echo "READY_FOR_QA" ;;
    failed_qa)                     echo "FAILED_QA" ;;
    completed|uat|done)            echo "UAT" ;;
    *)                             echo "" ;;
  esac
}

# ── State rank for progression comparison ─────────────────────────────
# Returns numeric rank so we can pick whichever source is more progressed.
state_rank() {
  case "$1" in
    NOT_FOUND)      echo 0 ;;
    GENERATED)      echo 1 ;;
    ELABORATED)     echo 2 ;;
    NEEDS_REVIEW)   echo 4 ;;
    FAILED_REVIEW)  echo 5 ;;
    READY_FOR_QA)   echo 6 ;;
    FAILED_QA)      echo 7 ;;
    UAT)            echo 8 ;;
    NEEDS_SPLIT)    echo 0 ;;
    *)              echo 0 ;;
  esac
}

# ── Main detection function ─────────────────────────────────────────
# Args: $1 = story_id, $2 = feature_dir, $3 = "cleanup" (optional),
#        $4 = kb_state (optional — from kb-cache lookup)
#
# Sets: DETECTED_STATE, DETECTED_STAGE, DETECTED_STORY_DIR, DETECTED_DUPLICATES
#
# When $3 == "cleanup", removes stale duplicate stage directories for
# the story (keeps only the most-progressed copy with valid artifacts).
#
# When $4 is provided, the KB state is compared against the filesystem
# state and the more-progressed one wins. This prevents re-running
# phases that completed outside the orchestrator.
#
detect_story_state() {
  local story_id="$1"
  local feature_dir="$2"
  local mode="${3:-}"
  local kb_state_arg="${4:-}"

  DETECTED_STATE="NOT_FOUND"
  DETECTED_STAGE=""
  DETECTED_STORY_DIR=""
  DETECTED_DUPLICATES=""

  local stages
  stages=$(find_story_stages "$story_id" "$feature_dir")

  if [[ -z "$stages" ]]; then
    return
  fi

  # If multiple stages, pick the most-progressed one with valid artifacts
  # (first in our search order since it's most-progressed-first)
  local best_stage="" best_dir="" best_state="NOT_FOUND"
  local stale_dirs=""

  for stage in $stages; do
    local dir="${feature_dir}/${stage}/${story_id}"
    local state
    state=$(map_stage_to_state "$dir" "$stage" "$story_id")

    if [[ -z "$best_stage" ]]; then
      best_stage="$stage"
      best_dir="$dir"
      best_state="$state"
    else
      # This is a duplicate — track it
      if [[ -n "$stale_dirs" ]]; then
        stale_dirs="${stale_dirs} ${dir}"
      else
        stale_dirs="$dir"
      fi
    fi
  done

  DETECTED_STATE="$best_state"
  DETECTED_STAGE="$best_stage"
  DETECTED_STORY_DIR="$best_dir"
  DETECTED_DUPLICATES="$stale_dirs"

  # Self-heal: remove stale duplicate directories
  if [[ "$mode" == "cleanup" && -n "$stale_dirs" ]]; then
    for stale in $stale_dirs; do
      if [[ -d "$stale" ]]; then
        rm -rf "$stale"
      fi
    done
  fi

  # ── KB state merge: pick the more-progressed source ──────────────
  if [[ -n "$kb_state_arg" ]]; then
    local kb_detected
    kb_detected=$(kb_state_to_detected "$kb_state_arg")
    if [[ -n "$kb_detected" ]]; then
      local fs_rank kb_rank
      fs_rank=$(state_rank "$DETECTED_STATE")
      kb_rank=$(state_rank "$kb_detected")
      if [[ $kb_rank -gt $fs_rank ]]; then
        DETECTED_STATE="$kb_detected"
        # Note: DETECTED_STAGE and DETECTED_STORY_DIR remain filesystem-based.
        # The orchestrator handles directory moves based on the new state.
      fi
    fi
  fi
}

# ── State → next action mapping ────────────────────────────────────
# Returns the skill/command to advance a story from its current state.
state_to_action() {
  local state="$1"
  case "$state" in
    NOT_FOUND)      echo "generate" ;;
    GENERATED)      echo "elaborate" ;;
    ELABORATED)     echo "implement" ;;
    NEEDS_REVIEW)   echo "review" ;;
    FAILED_REVIEW)  echo "fix-review" ;;
    READY_FOR_QA)   echo "qa" ;;
    FAILED_QA)      echo "fix-qa" ;;
    UAT)            echo "done" ;;
    NEEDS_SPLIT)    echo "skip" ;;
    *)              echo "unknown" ;;
  esac
}
