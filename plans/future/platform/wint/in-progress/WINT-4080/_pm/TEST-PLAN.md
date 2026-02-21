# Test Plan: WINT-4080 — Create scope-defender Agent (Devil's Advocate)

## Scope Summary

- **Endpoints touched:** None — this is a documentation artifact (`.agent.md` file only)
- **UI touched:** No
- **Data/storage touched:** No — agent is read-only, no DB writes
- **Files produced:** `.claude/agents/scope-defender.agent.md`
- **Output artifacts at runtime:** `{story_dir}/_implementation/scope-challenges.json` (produced when agent runs)

---

## Happy Path Tests

### Test HP-1: Agent file exists and frontmatter is valid

**Setup:**
- Story WINT-4080 is implemented (agent file created at `.claude/agents/scope-defender.agent.md`)

**Action:**
- Read `.claude/agents/scope-defender.agent.md`
- Parse YAML frontmatter between `---` delimiters

**Expected Outcome:**
- File exists
- Frontmatter contains: `created`, `updated`, `version`, `type`, `name`, `description`, `model`, `tools`
- `model` is exactly `haiku`
- `type` is exactly `worker`
- `version` is `1.0.0`
- `description` is 80 characters or fewer

**Evidence:** File read succeeds; YAML parses without error; field values match expected values

---

### Test HP-2: Agent produces scope-challenges.json with 3 clear non-MVP items

**Setup:**
- Prepare a test elaboration artifact:
  - `story_brief.md` with 1 clear MVP goal
  - `acs.md` with 7 acceptance criteria (3 clearly MVP, 4 clearly non-MVP/nice-to-have)
  - No `gaps.json` (to test without optional input)

**Action:**
- Invoke scope-defender with the prepared artifact set
- Wait for agent completion signal

**Expected Outcome:**
- Agent emits `SCOPE-DEFENDER COMPLETE WITH WARNINGS: 1 warning` (missing gaps.json)
- `scope-challenges.json` is written to `{story_dir}/_implementation/`
- JSON is valid and parseable
- `challenges` array contains exactly 3 items (the non-MVP ones, capped at 5)
- Each challenge has: `id`, `target`, `challenge`, `recommendation`, `risk_if_deferred`
- `total_candidates_reviewed` is 4
- `truncated` is `false` (only 4 candidates, under cap)

**Evidence:** `scope-challenges.json` file contents; JSON schema validation against defined schema

---

### Test HP-3: Hard cap enforcement — cap at 5 from 7 candidates

**Setup:**
- Prepare elaboration artifact with 10 ACs, all plausibly non-MVP
- No `gaps.json`

**Action:**
- Invoke scope-defender
- Inspect output JSON

**Expected Outcome:**
- `challenges` array has exactly 5 items (capped)
- `total_candidates_reviewed` is the actual count of evaluated candidates (>5)
- `truncated` is `true`
- Agent emits `SCOPE-DEFENDER COMPLETE WITH WARNINGS: 1 warning`

**Evidence:** `challenges.length === 5`; `truncated === true` in output JSON

---

### Test HP-4: Agent respects DA role pack reference

**Setup:**
- `.claude/prompts/role-packs/da.md` exists (WINT-0210 has landed)
- Prepare standard elaboration artifact with 4 ACs (2 MVP, 2 non-MVP)

**Action:**
- Invoke scope-defender
- Inspect output for any inconsistency with DA hard caps from da.md

**Expected Outcome:**
- Challenges do not exceed 5
- No blocking items are challenged
- Completion signal is `SCOPE-DEFENDER COMPLETE`

**Evidence:** Challenge count and recommendation values in JSON

---

### Test HP-5: Human-readable summary present alongside JSON

**Setup:**
- Standard elaboration artifact with 3 non-MVP ACs

**Action:**
- Invoke scope-defender
- Inspect output artifacts

**Expected Outcome:**
- `scope-challenges.json` is written (machine-readable)
- A human-readable summary is also produced (either inline in agent response or as a secondary artifact)
- Summary is readable prose, not raw JSON

**Evidence:** Both machine-readable JSON and prose summary present in output

---

## Error Cases

### Test ERR-1: BLOCKED signal when story brief is missing

**Setup:**
- Invoke scope-defender with NO story brief (no `story_brief.md`, no story file)
- AC list provided, gaps.json absent

**Action:**
- Invoke scope-defender

**Expected Outcome:**
- Agent emits `SCOPE-DEFENDER BLOCKED: story brief missing — cannot evaluate scope`
- No `scope-challenges.json` written (or file is empty)

**Evidence:** Completion signal matches expected BLOCKED pattern

---

### Test ERR-2: Graceful degradation when optional inputs missing

**Setup:**
- Story brief present (title + goal)
- AC list present
- `gaps.json` absent
- DA role pack absent

**Action:**
- Invoke scope-defender

**Expected Outcome:**
- Agent proceeds without blocking
- Emits `SCOPE-DEFENDER COMPLETE WITH WARNINGS: 2 warnings` (gaps.json missing, da.md missing)
- Challenges still produced based on available input
- Output JSON is valid

**Evidence:** Warning count in completion signal; valid JSON written

---

### Test ERR-3: No challenges produced when all ACs are MVP-critical

**Setup:**
- Story brief present
- AC list where all ACs are marked MVP-critical in gaps.json
- `gaps.json` marks all ACs as `blocking: true` or `mvp_critical: true`

**Action:**
- Invoke scope-defender

**Expected Outcome:**
- No items challenged (all are MVP-critical)
- `challenges` array is empty `[]`
- `total_candidates_reviewed` reflects evaluated count
- Agent emits `SCOPE-DEFENDER COMPLETE` (not BLOCKED — empty result is valid)

**Evidence:** `challenges.length === 0` in JSON; completion signal is COMPLETE not BLOCKED

---

### Test ERR-4: Blocking items not challenged when present in gaps.json

**Setup:**
- Story brief present
- AC list with 5 ACs: 3 non-MVP, 2 marked blocking in gaps.json

**Action:**
- Invoke scope-defender with full input set including gaps.json

**Expected Outcome:**
- Only 3 non-MVP ACs appear in challenges
- The 2 blocking items do NOT appear in challenges output
- `total_candidates_reviewed` reflects the 3 non-blocking candidates

**Evidence:** Challenge IDs match only the non-blocking ACs; blocking ACs absent from JSON

---

## Edge Cases

### Test EDGE-1: Exactly 5 candidates — no truncation

**Setup:**
- 5 non-MVP ACs in scope
- gaps.json absent

**Action:**
- Invoke scope-defender

**Expected Outcome:**
- All 5 produced in output
- `truncated` is `false`
- `total_candidates_reviewed` is 5

**Evidence:** `challenges.length === 5`; `truncated === false`

---

### Test EDGE-2: 0 ACs in input

**Setup:**
- Story brief present
- AC list is empty (no features proposed yet)

**Action:**
- Invoke scope-defender

**Expected Outcome:**
- Agent completes (not blocked) since story brief is present
- `challenges` is `[]`
- Emits `SCOPE-DEFENDER COMPLETE WITH WARNINGS` noting no ACs to evaluate

**Evidence:** Valid JSON with empty challenges; appropriate completion signal

---

### Test EDGE-3: Single AC, clearly MVP

**Setup:**
- 1 AC present, MVP-critical

**Action:**
- Invoke scope-defender

**Expected Outcome:**
- No challenges produced
- Agent emits `SCOPE-DEFENDER COMPLETE`
- Valid JSON with empty challenges

**Evidence:** `challenges.length === 0`; COMPLETE (not BLOCKED) signal

---

### Test EDGE-4: scope-challenges.json schema validation

**Setup:**
- Standard run producing at least 1 challenge

**Action:**
- Parse produced `scope-challenges.json` against the schema defined in AC-5

**Expected Outcome:**
- All required top-level fields present: `story_id`, `generated_at`, `challenges`, `total_candidates_reviewed`, `truncated`
- Each challenge in `challenges` has: `id`, `target`, `challenge`, `recommendation`, `risk_if_deferred`
- `recommendation` is one of: `defer-to-backlog`, `reduce-scope`, `accept-as-mvp`
- `risk_if_deferred` is one of: `low`, `medium`, `high`
- `id` follows pattern `DA-00N`

**Evidence:** Schema validation passes; all enum values correct

---

## Required Tooling Evidence

### Agent File Verification
- Read `.claude/agents/scope-defender.agent.md` and confirm all 8 ACs' structural requirements
- Parse YAML frontmatter with a YAML parser (not just grep) to confirm validity
- Verify `description` field character count is <= 80

### Functional Test Evidence (Agent Invocation)
- Invoke agent with prepared test inputs for each happy path test
- Capture raw agent output (completion signal text)
- Capture `scope-challenges.json` file content
- Validate JSON with `JSON.parse()` — must not throw
- Schema-validate JSON against AC-5 field definitions

### Integration Test Prerequisites
- WINT-4140 (Round Table Agent) integration test will require WINT-4080 complete first
- Until WINT-4140 exists, consume `scope-challenges.json` manually to verify Round Table readiness

---

## Risks to Call Out

- **No unit test framework for .agent.md files**: Verification is functional (invoke and inspect output). Tests rely on agent execution, not static analysis. QA must invoke the agent against real elaboration artifacts.
- **WINT-0210 timing dependency**: If `da.md` role pack does not exist when tests run, tests HP-4 will use embedded constraints instead. This is expected behavior (agent degrades gracefully).
- **Test input preparation**: Each test requires a curated elaboration artifact set. A test fixture directory (e.g., `tests/fixtures/scope-defender/`) should be created at implementation time.
- **Scope-challenges.json output location**: Agent writes to `{story_dir}/_implementation/scope-challenges.json`. QA must invoke agent with a known story directory to find the output file.
- **LangGraph interface contract (AC-7)**: Tested by reading the agent file and confirming the "LangGraph Porting Notes" section is present with the required fields — not by executing LangGraph.
