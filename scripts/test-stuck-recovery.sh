#!/usr/bin/env bash
#
# Test harness for scripts/lib/stuck-recovery.sh (AC-11).
#
# Scenarios:
#   (1) DETECT: mock story in failed-code-review >4hr old, verify detect_stuck_stories finds it
#   (2) RECOVER: run recover_story(), verify STUCK-RECOVERY.yaml written + story moved
#   (3) IDEMPOTENCY: run recover_story() again, verify no rewrite (RECOVERY SKIP)
#
# Usage: bash scripts/test-stuck-recovery.sh
# Exits: 0 on all tests pass, 1 on any failure.
#
# Compatible with bash 3.2 (macOS default).
#

set -eo pipefail

# ── Resolve repo root ─────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Source the library under test ─────────────────────────────────────
# Note: stuck-recovery.sh requires FEATURE_DIR and WORKTREE_BASE to be set.
# We will set them in each scenario using temp dirs.

# ── Helpers ────────────────────────────────────────────────────────────
PASS_COUNT=0
FAIL_COUNT=0
TEST_TMPDIR=""

fail() {
  echo "FAIL: $*" >&2
  FAIL_COUNT=$(( FAIL_COUNT + 1 ))
}

pass() {
  echo "PASS: $*"
  PASS_COUNT=$(( PASS_COUNT + 1 ))
}

cleanup() {
  if [[ -n "$TEST_TMPDIR" && -d "$TEST_TMPDIR" ]]; then
    rm -rf "$TEST_TMPDIR"
  fi
}

trap cleanup EXIT

# ── Setup: create a temporary environment ───────────────────────────
TEST_TMPDIR=$(mktemp -d /tmp/test-stuck-recovery.XXXXXX)
FEATURE_DIR="${TEST_TMPDIR}/feature"
WORKTREE_BASE="${TEST_TMPDIR}/worktrees"

# Create a fake story directory that looks 4+ hours old
make_old_story() {
  local STAGE="$1"
  local STORY_ID="$2"
  local STORY_DIR="${FEATURE_DIR}/${STAGE}/${STORY_ID}"
  mkdir -p "${STORY_DIR}/_implementation"

  # Write a minimal story.yaml
  cat > "${STORY_DIR}/story.yaml" <<YAML
schema: 1
storyId: "${STORY_ID}"
title: "Test Story"
state: "${STAGE}"
YAML

  # Backdate the story.yaml to 5 hours ago (300 min)
  local old_ts
  # macOS touch -t: [[CC]YY]MMDDhhmm[.ss]
  # We need a timestamp 5 hours in the past
  local now_epoch
  now_epoch=$(date +%s)
  local old_epoch=$(( now_epoch - 18000 ))  # 5 hours = 18000 seconds

  # macOS date for formatting from epoch
  local old_fmt
  old_fmt=$(date -r "$old_epoch" '+%Y%m%d%H%M.%S' 2>/dev/null) || \
    old_fmt=$(date -d "@${old_epoch}" '+%Y%m%d%H%M.%S' 2>/dev/null) || \
    old_fmt=""

  if [[ -n "$old_fmt" ]]; then
    touch -t "$old_fmt" "${STORY_DIR}/story.yaml" 2>/dev/null || true
    touch -t "$old_fmt" "${STORY_DIR}" 2>/dev/null || true
  fi

  echo "$STORY_DIR"
}

# ── Source the library (with correct env) ───────────────────────────
# Export vars so sourced script picks them up
export FEATURE_DIR
export WORKTREE_BASE

# Re-source for each scenario by using a subshell function approach.
# We source once here and reset vars per scenario.
source "${SCRIPT_DIR}/lib/stuck-recovery.sh"

echo "========================================"
echo " Stuck Recovery Test Harness"
echo "========================================"
echo ""

# ────────────────────────────────────────────────────────────────────
# Scenario 1: DETECT
# Mock story in failed-code-review >4hr old, verify detect_stuck_stories finds it
# ────────────────────────────────────────────────────────────────────
echo "--- Scenario 1: DETECT ---"

STORY_DIR1=$(make_old_story "failed-code-review" "TEST-0001")
echo "Created old story at: $STORY_DIR1"

# Run detection with low threshold (1 minute) to catch our 5-hour-old story
DETECT_OUTPUT=$(detect_stuck_stories 60 480 2>/dev/null)

echo "Detection output: $DETECT_OUTPUT"

if echo "$DETECT_OUTPUT" | grep -q "TEST-0001"; then
  pass "Scenario 1: detect_stuck_stories found TEST-0001"
else
  fail "Scenario 1: detect_stuck_stories did NOT find TEST-0001 in output: '$DETECT_OUTPUT'"
fi

if echo "$DETECT_OUTPUT" | grep -q "failed-code-review"; then
  pass "Scenario 1: stage=failed-code-review present in output"
else
  fail "Scenario 1: stage=failed-code-review missing from output"
fi

echo ""

# ────────────────────────────────────────────────────────────────────
# Scenario 2: RECOVER
# Run recover_story() on TEST-0001, verify STUCK-RECOVERY.yaml written + story moved
# ────────────────────────────────────────────────────────────────────
echo "--- Scenario 2: RECOVER ---"

# Get pattern and minutes from detect output
STORY_LINE=$(echo "$DETECT_OUTPUT" | grep "TEST-0001" | head -1)
IFS='	' read -r _sid detected_stage detected_pattern detected_minutes <<< "$STORY_LINE"
echo "Detected: story=TEST-0001 stage=$detected_stage pattern=$detected_pattern minutes=$detected_minutes"

# Run recovery
RECOVER_OUTPUT=$(recover_story "TEST-0001" "${detected_stage:-failed-code-review}" "${detected_pattern:-stale}" "${detected_minutes:-300}" "[test]" 2>&1)
echo "Recovery output: $RECOVER_OUTPUT"

RECOVERY_FILE="${FEATURE_DIR}/${detected_stage:-failed-code-review}/TEST-0001/_implementation/STUCK-RECOVERY.yaml"

# For patterns that move the story, check the target location
case "${detected_pattern:-stale}" in
  exhausted-retries)
    RECOVERY_FILE="${FEATURE_DIR}/needs-code-review/TEST-0001/_implementation/STUCK-RECOVERY.yaml"
    if [[ -d "${FEATURE_DIR}/needs-code-review/TEST-0001" ]]; then
      pass "Scenario 2: story moved to needs-code-review"
    else
      fail "Scenario 2: story NOT moved to needs-code-review"
    fi
    ;;
  stale)
    # Story stays in place, recovery file written at original location
    RECOVERY_FILE="${FEATURE_DIR}/${detected_stage:-failed-code-review}/TEST-0001/_implementation/STUCK-RECOVERY.yaml"
    ;;
  *)
    # For other patterns, find where the recovery file might be
    for search_stage in failed-code-review needs-code-review ready-to-work failed-qa ready-for-qa; do
      if [[ -f "${FEATURE_DIR}/${search_stage}/TEST-0001/_implementation/STUCK-RECOVERY.yaml" ]]; then
        RECOVERY_FILE="${FEATURE_DIR}/${search_stage}/TEST-0001/_implementation/STUCK-RECOVERY.yaml"
        break
      fi
    done
    ;;
esac

if [[ -f "$RECOVERY_FILE" ]]; then
  pass "Scenario 2: STUCK-RECOVERY.yaml written at $RECOVERY_FILE"
else
  fail "Scenario 2: STUCK-RECOVERY.yaml NOT found (checked: $RECOVERY_FILE)"
fi

if echo "$RECOVER_OUTPUT" | grep -q "RECOVERY:"; then
  pass "Scenario 2: structured log line 'RECOVERY:' emitted"
else
  fail "Scenario 2: structured log line 'RECOVERY:' NOT emitted in: $RECOVER_OUTPUT"
fi

echo ""

# ────────────────────────────────────────────────────────────────────
# Scenario 3: IDEMPOTENCY
# Run recover_story() again on same story, verify RECOVERY SKIP is logged (no rewrite)
# ────────────────────────────────────────────────────────────────────
echo "--- Scenario 3: IDEMPOTENCY ---"

# Find where the story is now
CURRENT_STAGE_FOR_S3=""
for search_stage in failed-code-review needs-code-review ready-to-work failed-qa ready-for-qa; do
  if [[ -d "${FEATURE_DIR}/${search_stage}/TEST-0001" ]]; then
    CURRENT_STAGE_FOR_S3="$search_stage"
    break
  fi
done

if [[ -z "$CURRENT_STAGE_FOR_S3" ]]; then
  fail "Scenario 3: cannot find story directory for idempotency test"
else
  echo "Story is now in stage: $CURRENT_STAGE_FOR_S3"

  # Record mtime of STUCK-RECOVERY.yaml before second recovery call
  RECOVERY_FILE2="${FEATURE_DIR}/${CURRENT_STAGE_FOR_S3}/TEST-0001/_implementation/STUCK-RECOVERY.yaml"
  MTIME_BEFORE=""
  if [[ -f "$RECOVERY_FILE2" ]]; then
    MTIME_BEFORE=$(stat -f %m "$RECOVERY_FILE2" 2>/dev/null) || \
      MTIME_BEFORE=$(stat -c %Y "$RECOVERY_FILE2" 2>/dev/null) || MTIME_BEFORE="unknown"
  fi

  # Run recovery again with the same pattern (use stale to avoid moving)
  IDEMPOTENCY_OUTPUT=$(recover_story "TEST-0001" "$CURRENT_STAGE_FOR_S3" "stale" "300" "[test-idempotency]" 2>&1)
  echo "Idempotency output: $IDEMPOTENCY_OUTPUT"

  if echo "$IDEMPOTENCY_OUTPUT" | grep -qi "RECOVERY SKIP\|idempotent skip"; then
    pass "Scenario 3: 'RECOVERY SKIP' emitted (idempotent)"
  else
    # The stale pattern should write a new file if it doesn't exist, but we already have one
    # Check that the file was NOT rewritten (same mtime)
    MTIME_AFTER=""
    if [[ -f "$RECOVERY_FILE2" ]]; then
      MTIME_AFTER=$(stat -f %m "$RECOVERY_FILE2" 2>/dev/null) || \
        MTIME_AFTER=$(stat -c %Y "$RECOVERY_FILE2" 2>/dev/null) || MTIME_AFTER="unknown"
    fi
    if [[ -n "$MTIME_BEFORE" && "$MTIME_BEFORE" == "$MTIME_AFTER" ]]; then
      pass "Scenario 3: STUCK-RECOVERY.yaml NOT rewritten (idempotent — same mtime)"
    else
      fail "Scenario 3: expected RECOVERY SKIP but got: '$IDEMPOTENCY_OUTPUT'"
    fi
  fi
fi

echo ""

# ────────────────────────────────────────────────────────────────────
# Results
# ────────────────────────────────────────────────────────────────────
echo "========================================"
echo " Results: PASS=$PASS_COUNT FAIL=$FAIL_COUNT"
echo "========================================"

if [[ $FAIL_COUNT -eq 0 ]]; then
  echo "ALL TESTS PASSED"
  exit 0
else
  echo "SOME TESTS FAILED"
  exit 1
fi
