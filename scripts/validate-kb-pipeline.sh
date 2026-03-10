#!/usr/bin/env bash
# validate-kb-pipeline.sh — KSOT-4020: End-to-end pipeline validation
#
# Creates a test story, advances it through all KB states, asserts correctness,
# then cleans up. Validates that KB is the sole source of truth for state.
#
# Usage: bash scripts/validate-kb-pipeline.sh
#
# Exit codes:
#   0 — All assertions passed
#   1 — One or more assertions failed
#   2 — Setup error (KB unavailable, etc.)

set -euo pipefail

STORY_ID="KSOT-TEST-001"
FEATURE_PREFIX="ksot-test"
PASS=0
FAIL=0
ERRORS=()

log() { echo "[$(date +%H:%M:%S)] $*"; }
pass() { log "PASS: $1"; PASS=$((PASS + 1)); }
fail() { log "FAIL: $1"; FAIL=$((FAIL + 1)); ERRORS+=("$1"); }

# ── Helpers ────────────────────────────────────────────────────────────────

kb_get_state() {
  local story_id="$1"
  timeout 15 env -u CLAUDECODE claude -p \
    "Call kb_get_story with story_id '${story_id}'. Output ONLY the state value as a single word (e.g. backlog, ready, in_progress). No explanation." \
    --allowedTools "mcp__knowledge-base__kb_get_story" \
    --output-format text 2>/dev/null | tr -d '[:space:]' || true
}

kb_set_state() {
  local story_id="$1"
  local new_state="$2"
  timeout 15 env -u CLAUDECODE claude -p \
    "Call kb_update_story_status with story_id '${story_id}' and new_state '${new_state}'. Output ONLY 'ok' on success." \
    --allowedTools "mcp__knowledge-base__kb_update_story_status" \
    --output-format text 2>/dev/null | grep -q "ok" && return 0 || return 1
}

assert_state() {
  local expected="$1"
  local actual
  actual=$(kb_get_state "$STORY_ID") || { fail "Could not read state from KB"; return; }
  if [[ "$actual" == "$expected" ]]; then
    pass "State is '$expected'"
  else
    fail "Expected state '$expected', got '$actual'"
  fi
}

assert_no_stage_dirs() {
  local stage_dirs=("in-progress" "needs-code-review" "ready-for-qa" "failed-code-review" "failed-qa" "UAT" "ready-to-work")
  for dir in "${stage_dirs[@]}"; do
    if find plans/ -type d -name "$dir" 2>/dev/null | grep -q .; then
      fail "Stage directory '$dir' still exists in plans/"
      return
    fi
  done
  pass "No legacy stage directories found"
}

# ── Bootstrap test story ────────────────────────────────────────────────────

log "Setting up test story $STORY_ID..."

# Create story directory (flat layout)
mkdir -p "plans/future/platform/ksot-test/stories/$STORY_ID"

# Create minimal story file
cat > "plans/future/platform/ksot-test/stories/$STORY_ID/$STORY_ID.md" << 'EOF'
---
story_id: KSOT-TEST-001
title: KSOT Pipeline Validation Test Story
status: backlog
---

# KSOT-TEST-001: KSOT Pipeline Validation Test Story

Test story for end-to-end pipeline validation. Delete after test.

## Acceptance Criteria
- [ ] AC-1: KB is the source of truth for state
EOF

log "Story directory created at plans/future/platform/ksot-test/stories/$STORY_ID/"

# ── State transition tests ──────────────────────────────────────────────────

STATES=("backlog" "ready" "in_progress" "ready_for_review" "in_review" "ready_for_qa" "in_qa" "completed")

log "Testing state transitions..."

for state in "${STATES[@]}"; do
  log "Transitioning to: $state"
  if kb_set_state "$STORY_ID" "$state" 2>/dev/null; then
    assert_state "$state"
    # Assert story dir still at flat path
    if [[ -d "plans/future/platform/ksot-test/stories/$STORY_ID" ]]; then
      pass "Story dir at flat path for state $state"
    else
      fail "Story dir missing at flat path for state $state"
    fi
  else
    fail "Could not set state to '$state' via KB"
  fi
done

# ── Assert no stage directories created ────────────────────────────────────

assert_no_stage_dirs

# ── Cleanup ────────────────────────────────────────────────────────────────

log "Cleaning up test story..."
rm -rf "plans/future/platform/ksot-test/"

# Delete from KB
timeout 15 env -u CLAUDECODE claude -p \
  "Call kb_delete_story or equivalent to delete test story '${STORY_ID}'. Output 'ok' on success." \
  --allowedTools "mcp__knowledge-base__kb_update_story_status" \
  --output-format text 2>/dev/null || true

log "Cleanup complete."

# ── Results ────────────────────────────────────────────────────────────────

echo ""
echo "================================"
echo "  Pipeline Validation Results"
echo "================================"
echo "  PASSED: $PASS"
echo "  FAILED: $FAIL"
echo ""

if [[ $FAIL -gt 0 ]]; then
  echo "FAILED assertions:"
  for err in "${ERRORS[@]}"; do
    echo "  - $err"
  done
  echo ""
  exit 1
fi

echo "ALL ASSERTIONS PASSED ✓"
exit 0
