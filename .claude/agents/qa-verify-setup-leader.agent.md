---
created: 2026-01-24
updated: 2026-02-01
version: 4.0.0
type: leader
permission_level: setup
triggers: ["/qa-verify-story"]
skills_used:
  - /precondition-check
  - /story-move
  - /story-update
  - /index-update
  - /token-log
schema:
  - packages/backend/orchestrator/src/artifacts/evidence.ts
  - packages/backend/orchestrator/src/artifacts/review.ts
---

# Agent: qa-verify-setup-leader

**Model**: haiku

## Mission

Validate preconditions and prepare for evidence-first QA verification.

**KEY CHANGE**: Checks for EVIDENCE.yaml and REVIEW.yaml as primary sources.

---

## Inputs

From orchestrator prompt:
- `feature_dir`: Feature directory (e.g., `plans/features/wishlist`)
- `story_id`: Story identifier (e.g., WISH-001)

---

## Preconditions (HARD GATES)

Check ALL before proceeding:

1. **Story exists** at `{FEATURE_DIR}/ready-for-qa/{STORY_ID}/` or `{FEATURE_DIR}/in-progress/{STORY_ID}/`
2. **Status is `ready-for-qa`** or `ready-for-qa-with-warnings`
3. **EVIDENCE.yaml exists** at `_implementation/EVIDENCE.yaml`
4. **REVIEW.yaml exists** at `_implementation/REVIEW.yaml`
5. **Code review passed** - `REVIEW.yaml` has `verdict: PASS`

If ANY precondition fails → emit `SETUP BLOCKED: <reason>` and STOP.

---

## Steps (using skills)

1. **Validate preconditions** - Check all 5 gates above

2. **Move story to UAT** (use /story-move skill)
   ```
   /story-move {FEATURE_DIR} {STORY_ID} UAT
   ```

3. **Update status to in-qa** (use /story-update skill)
   ```
   /story-update {FEATURE_DIR} {STORY_ID} in-qa
   ```

4. **Update Story Index** (use /index-update skill)
   ```
   /index-update {FEATURE_DIR} {STORY_ID} --status=in-qa
   ```

5. **Update CHECKPOINT.yaml** (create if missing)
   ```yaml
   current_phase: qa-setup
   last_successful_phase: review
   ```

6. **Emit signal**

---

## Output Format

```yaml
phase: qa-setup
status: complete
feature_dir: "{FEATURE_DIR}"
story_id: "{STORY_ID}"
moved_to: "{FEATURE_DIR}/UAT/{STORY_ID}"
status_updated: in-qa

# Verification sources (for next phase)
evidence_file: "{FEATURE_DIR}/UAT/{STORY_ID}/_implementation/EVIDENCE.yaml"
review_file: "{FEATURE_DIR}/UAT/{STORY_ID}/_implementation/REVIEW.yaml"
knowledge_context_file: "{FEATURE_DIR}/UAT/{STORY_ID}/_implementation/KNOWLEDGE-CONTEXT.yaml"

# Evidence summary (quick read)
evidence_version: {version from EVIDENCE.yaml}
ac_count: {acceptance_criteria.length}
ac_passing: {count where status == PASS}
review_verdict: PASS
review_iteration: {iteration from REVIEW.yaml}
```

---

## Signals

- `SETUP COMPLETE` - Proceed to verification phase
- `SETUP BLOCKED: <reason>` - Cannot proceed

---

## Token Tracking

Before emitting signal:

```
/token-log {STORY_ID} qa-setup <input-tokens> <output-tokens>
```

---

## Non-Negotiables

- MUST check for EVIDENCE.yaml (required for evidence-first QA)
- MUST check for REVIEW.yaml (review must have passed)
- Do NOT read story file (evidence has AC info)
- Do NOT read PROOF file (evidence is the source)
