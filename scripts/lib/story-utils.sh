#!/usr/bin/env bash
#
# Shared story utility functions for implement-stories.sh and implement-dispatcher.sh.
#
# Sources into the calling script. Requires FEATURE_DIR to be set before calling
# any function that references it.
#
# Functions provided:
#   find_story_dir STORY_ID           — find story dir across all pipeline stages
#   is_elaborated STORY_DIR           — check if story has elaboration artifacts
# KSOT-3050: verify_stage_transition removed — use KB state checks instead
#   check_log_for_failure LOG_FILE PHASE       — inspect a claude log for failure signals
#   validate_artifact_schema FILE FIELD...     — validate YAML artifact fields
#   validate_phase_gate IMPL_DIR STORY_ID FROM TO  — gate check before phase transition
#

# Find the filesystem directory for a story.
# KSOT-3050: Flat stories/ layout only. Legacy stage dir fallback removed.
# Returns: prints the path and exits 0, or exits 1 if not found.
find_story_dir() {
  local STORY_ID="$1"

  # Flat layout (KSOT-3010) — only supported layout
  if [[ -d "$FEATURE_DIR/stories/${STORY_ID}" ]]; then
    echo "$FEATURE_DIR/stories/${STORY_ID}"
    return 0
  fi

  # KSOT-3050: removed legacy stage-based fallback (needs-code-review, in-progress, etc.)
  return 1
}

# Returns the stage name (directory basename) for a story directory.
# KSOT-3010: With flat layout, returns "stories" — callers should use KB state instead.
get_story_stage() {
  local STORY_DIR="$1"
  basename "$(dirname "$STORY_DIR")"
}

# Check if a story has elaboration artifacts (_implementation dir or ELAB.yaml).
is_elaborated() {
  local STORY_DIR="$1"
  [[ -d "${STORY_DIR}/_implementation" ]] || [[ -f "${STORY_DIR}/_implementation/ELAB.yaml" ]]
}

# KSOT-3050: verify_stage_transition() removed.
# Callers must use KB state checks (kb_get_story / kb_update_story_status).

# Inspect a claude output log for failure signals.
# Returns a string: "OK" or "FAIL:<category>:<match>"
# The implement-stories.sh version includes additional patterns (test failures,
# resource exhaustion, file-size checks) beyond the dispatcher's minimal version.
check_log_for_failure() {
  local LOG_FILE="$1"
  local PHASE="$2"

  # ── File-level checks ──────────────────────────────────────────
  if [[ ! -f "$LOG_FILE" ]]; then
    echo "FAIL:signal:no-log-file"
    return 0
  fi
  local FILE_SIZE
  FILE_SIZE=$(wc -c < "$LOG_FILE" 2>/dev/null) || FILE_SIZE=0
  if [[ $FILE_SIZE -lt 100 ]]; then
    echo "FAIL:signal:truncated-log"
    return 0
  fi

  # ── Hard stops ─────────────────────────────────────────────────
  local MATCH
  MATCH=$(grep -oEi "HARD STOP|SETUP BLOCKED|Phase 0 Validation Failed|blocked at Phase 0|precondition.* failure|cannot proceed|PLANNING BLOCKED|PLANNING FAILED|EXECUTION BLOCKED|DOCUMENTATION BLOCKED" "$LOG_FILE" | head -1) || true
  if [[ -n "$MATCH" ]]; then
    echo "FAIL:signal:$MATCH"
    return 0
  fi

  # ── Agent phase failures ───────────────────────────────────────
  MATCH=$(grep -oEi "VERIFICATION (BLOCKED|FAILED)|FIX (BLOCKED|FAILED)|REVIEW (BLOCKED|FAILED)" "$LOG_FILE" | head -1) || true
  if [[ -n "$MATCH" ]]; then
    echo "FAIL:agent:$MATCH"
    return 0
  fi

  # ── Test failures ──────────────────────────────────────────────
  MATCH=$(grep -oEi "E2E.*FAIL|TEST.*FAIL|tests failed" "$LOG_FILE" | head -1) || true
  if [[ -n "$MATCH" ]]; then
    echo "FAIL:test:$MATCH"
    return 0
  fi

  # ── Resource exhaustion ────────────────────────────────────────
  MATCH=$(grep -oEi "ABORT|TIMEOUT|context limit|token budget" "$LOG_FILE" | head -1) || true
  if [[ -n "$MATCH" ]]; then
    echo "FAIL:resource:$MATCH"
    return 0
  fi

  echo "OK"
}

# Validate a YAML artifact has required fields (bash 3.2 compatible, grep-based).
# Usage: validate_artifact_schema FILE FIELD1 [FIELD2 ...]
# Returns: OK, MISSING (file absent), EMPTY (file too small), or FIELD_MISSING:<name>
validate_artifact_schema() {
  local FILE_PATH="$1"
  shift
  local REQUIRED_FIELDS=("$@")

  if [[ ! -f "$FILE_PATH" ]]; then
    echo "MISSING"
    return 0
  fi

  local FILE_SIZE
  FILE_SIZE=$(wc -c < "$FILE_PATH" 2>/dev/null) || FILE_SIZE=0
  if [[ $FILE_SIZE -lt 10 ]]; then
    echo "EMPTY"
    return 0
  fi

  local field
  for field in "${REQUIRED_FIELDS[@]}"; do
    local FIELD_LINE
    FIELD_LINE=$(grep -m1 "^${field}:" "$FILE_PATH" 2>/dev/null) || true
    if [[ -z "$FIELD_LINE" ]]; then
      echo "FIELD_MISSING:${field}"
      return 0
    fi
    # Accept inline values or YAML list items on following lines
    local INLINE_VALUE
    INLINE_VALUE=$(echo "$FIELD_LINE" | sed "s/^${field}: *//" | sed 's/^["'"'"']//;s/["'"'"']$//') || true
    if [[ -z "$INLINE_VALUE" || "$INLINE_VALUE" == "[]" || "$INLINE_VALUE" == "null" || "$INLINE_VALUE" == "~" ]]; then
      if ! grep -A3 "^${field}:" "$FILE_PATH" 2>/dev/null | grep -q "^  - "; then
        echo "FIELD_MISSING:${field}"
        return 0
      fi
    fi
  done

  echo "OK"
}

# Validate artifact gates before a phase transition.
# Usage: validate_phase_gate IMPL_DIR STORY_ID FROM_STAGE TO_STAGE
# Returns: 0 (gate passes), 1 (gate fails)
# Side effect: prints a structured "GATE FAIL: ..." line on failure.
validate_phase_gate() {
  local IMPL_DIR="$1"
  local STORY_ID="$2"
  local FROM_STAGE="$3"
  local TO_STAGE="$4"

  local GATE_RESULT VERDICT_VALUE

  # KSOT-3050: Legacy stage transition gates (in-progress→needs-code-review, etc.) removed.
  # validate_phase_gate now only validates artifact content, not directory names.
  case "${FROM_STAGE}→${TO_STAGE}" in

    "needs-code-review→ready-for-qa")
      GATE_RESULT=$(validate_artifact_schema "${IMPL_DIR}/REVIEW.yaml" "verdict")
      if [[ "$GATE_RESULT" != "OK" ]]; then
        echo "GATE FAIL: ${STORY_ID} (needs-code-review -> ready-for-qa): ${GATE_RESULT} in REVIEW.yaml"
        return 1
      fi
      VERDICT_VALUE=$(grep -m1 "^verdict:" "${IMPL_DIR}/REVIEW.yaml" 2>/dev/null | sed 's/^verdict: *//' | sed 's/^["'"'"']//;s/["'"'"']$//') || true
      if ! echo "$VERDICT_VALUE" | grep -qi "^pass$\|^conditional.pass$"; then
        echo "GATE FAIL: ${STORY_ID} (needs-code-review -> ready-for-qa): verdict='${VERDICT_VALUE}' is not pass|conditional-pass in REVIEW.yaml"
        return 1
      fi
      ;;

    "needs-code-review→failed-code-review")
      GATE_RESULT=$(validate_artifact_schema "${IMPL_DIR}/REVIEW.yaml" "verdict")
      if [[ "$GATE_RESULT" != "OK" ]]; then
        echo "GATE FAIL: ${STORY_ID} (needs-code-review -> failed-code-review): ${GATE_RESULT} in REVIEW.yaml"
        return 1
      fi
      VERDICT_VALUE=$(grep -m1 "^verdict:" "${IMPL_DIR}/REVIEW.yaml" 2>/dev/null | sed 's/^verdict: *//' | sed 's/^["'"'"']//;s/["'"'"']$//') || true
      if ! echo "$VERDICT_VALUE" | grep -qi "^fail$\|concerns"; then
        echo "GATE FAIL: ${STORY_ID} (needs-code-review -> failed-code-review): verdict='${VERDICT_VALUE}' is not fail|concerns in REVIEW.yaml"
        return 1
      fi
      ;;

    "ready-for-qa→UAT")
      GATE_RESULT=$(validate_artifact_schema "${IMPL_DIR}/VERIFICATION.yaml" "verdict")
      if [[ "$GATE_RESULT" != "OK" ]]; then
        echo "GATE FAIL: ${STORY_ID} (ready-for-qa -> UAT): ${GATE_RESULT} in VERIFICATION.yaml"
        return 1
      fi
      VERDICT_VALUE=$(grep -m1 "^verdict:" "${IMPL_DIR}/VERIFICATION.yaml" 2>/dev/null | sed 's/^verdict: *//' | sed 's/^["'"'"']//;s/["'"'"']$//') || true
      if ! echo "$VERDICT_VALUE" | grep -qi "^pass$"; then
        echo "GATE FAIL: ${STORY_ID} (ready-for-qa -> UAT): verdict='${VERDICT_VALUE}' is not pass in VERIFICATION.yaml"
        return 1
      fi
      ;;

    "ready-for-qa→failed-qa")
      GATE_RESULT=$(validate_artifact_schema "${IMPL_DIR}/VERIFICATION.yaml" "verdict")
      if [[ "$GATE_RESULT" != "OK" ]]; then
        echo "GATE FAIL: ${STORY_ID} (ready-for-qa -> failed-qa): ${GATE_RESULT} in VERIFICATION.yaml"
        return 1
      fi
      VERDICT_VALUE=$(grep -m1 "^verdict:" "${IMPL_DIR}/VERIFICATION.yaml" 2>/dev/null | sed 's/^verdict: *//' | sed 's/^["'"'"']//;s/["'"'"']$//') || true
      if ! echo "$VERDICT_VALUE" | grep -qi "^fail$"; then
        echo "GATE FAIL: ${STORY_ID} (ready-for-qa -> failed-qa): verdict='${VERDICT_VALUE}' is not fail in VERIFICATION.yaml"
        return 1
      fi
      ;;

    *)
      return 0
      ;;
  esac

  return 0
}
