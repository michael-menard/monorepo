#!/usr/bin/env bash
#
# KSOT-4020: End-to-End Pipeline Validation
#
# Creates a canary story KSOT-9999 in KB at backlog, advances it through all
# valid state transitions, asserts KB matches at each step, and cleans up.
#
# Usage:
#   ./scripts/validate-pipeline-e2e.sh
#
# Exit codes:
#   0 — all assertions passed
#   1 — one or more assertions failed
#

set -eo pipefail

CANARY_STORY="KSOT-9999"
CANARY_PLAN="kb-single-source-of-truth"
PASSED=0
FAILED=0

# Allow running from within a Claude Code session
unset CLAUDECODE 2>/dev/null || true

ALLOWED_TOOLS="mcp__knowledge-base__kb_get_story,mcp__knowledge-base__kb_update_story_status,mcp__knowledge-base__kb_create_story,mcp__knowledge-base__kb_list_stories"

kb_call() {
  local prompt="$1"
  timeout 30 env -u CLAUDECODE claude -p "$prompt" \
    --allowedTools "$ALLOWED_TOOLS" \
    --output-format text 2>/dev/null || echo "ERROR"
}

get_state() {
  local raw
  raw=$(kb_call "Call kb_get_story with story_id='${CANARY_STORY}'. Output ONLY the state field value as plain text (e.g. ready, in_progress). No JSON, no fences.")
  echo "$raw" | grep -oE '^[a-z_]+$' | head -1
}

update_state() {
  local new_state="$1"
  kb_call "Call kb_update_story_status with story_id='${CANARY_STORY}', state='${new_state}', phase='e2e-validation'. Output ONLY: OK or ERROR." >/dev/null
}

assert_state() {
  local expected="$1"
  local label="$2"
  local actual
  actual=$(get_state)

  if [[ "$actual" == "$expected" ]]; then
    echo "  PASS: $label (state=$actual)"
    ((PASSED++))
  else
    echo "  FAIL: $label (expected=$expected, actual=$actual)"
    ((FAILED++))
  fi
}

echo "======================================"
echo " KSOT-4020: E2E Pipeline Validation"
echo "======================================"
echo ""

# ── Step 1: Create canary story ──────────────────────────────────────
echo "Step 1: Creating canary story $CANARY_STORY..."
kb_call "Call kb_create_story with story_id='${CANARY_STORY}', title='E2E Canary Story', plan_slug='${CANARY_PLAN}', state='backlog'. If the story already exists, call kb_update_story_status to set state='backlog'. Output ONLY: OK or ERROR." >/dev/null
assert_state "backlog" "Initial state is backlog"

# ── Step 2: Forward transitions ──────────────────────────────────────
echo ""
echo "Step 2: Forward state transitions..."

TRANSITIONS=(
  "ready:backlog→ready"
  "in_progress:ready→in_progress"
  "ready_for_review:in_progress→ready_for_review"
  "ready_for_qa:ready_for_review→ready_for_qa"
  "in_qa:ready_for_qa→in_qa"
  "completed:in_qa→completed"
)

for transition in "${TRANSITIONS[@]}"; do
  IFS=':' read -r new_state label <<< "$transition"
  update_state "$new_state"
  assert_state "$new_state" "$label"
done

# ── Step 3: Reset and test backward transitions ─────────────────────
echo ""
echo "Step 3: Backward/recovery transitions..."

# Reset to ready_for_review for failed_code_review test
update_state "backlog"
update_state "ready"
update_state "in_progress"
update_state "ready_for_review"

update_state "failed_code_review"
assert_state "failed_code_review" "ready_for_review→failed_code_review"

update_state "in_progress"
assert_state "in_progress" "failed_code_review→in_progress (recovery)"

# Test failed_qa path
update_state "ready_for_review"
update_state "ready_for_qa"
update_state "failed_qa"
assert_state "failed_qa" "ready_for_qa→failed_qa"

update_state "in_progress"
assert_state "in_progress" "failed_qa→in_progress (recovery)"

# ── Step 4: Idempotent transition ────────────────────────────────────
echo ""
echo "Step 4: Idempotent transition..."
update_state "in_progress"
assert_state "in_progress" "in_progress→in_progress (idempotent)"

# ── Step 5: Invalid transition (should fail) ─────────────────────────
echo ""
echo "Step 5: Invalid transition guard..."
# Attempt completed→backlog (should be rejected by trigger)
update_state "ready_for_review"
update_state "ready_for_qa"
update_state "completed"
local_result=$(kb_call "Call kb_update_story_status with story_id='${CANARY_STORY}', state='backlog', phase='e2e-invalid-test'. Output ONLY: OK or ERROR.")
if echo "$local_result" | grep -qi "error\|invalid\|exception"; then
  echo "  PASS: completed→backlog correctly rejected"
  ((PASSED++))
else
  echo "  FAIL: completed→backlog should have been rejected (got: $local_result)"
  ((FAILED++))
fi

# ── Step 6: Cleanup ──────────────────────────────────────────────────
echo ""
echo "Step 6: Cleanup..."
# Set to cancelled to mark as test artifact
kb_call "Call kb_update_story_status with story_id='${CANARY_STORY}', state='cancelled', phase='e2e-cleanup'. Output ONLY: OK or ERROR." >/dev/null
echo "  Canary story set to cancelled."

# ── Results ──────────────────────────────────────────────────────────
echo ""
echo "======================================"
echo " Results"
echo "======================================"
echo " Passed: $PASSED"
echo " Failed: $FAILED"
echo "======================================"

if [[ $FAILED -gt 0 ]]; then
  echo ""
  echo "PIPELINE VALIDATION FAILED — $FAILED assertion(s) did not pass."
  exit 1
fi

echo ""
echo "All assertions passed. Pipeline is healthy."
exit 0
