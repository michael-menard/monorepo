# Test Plan: WINT-4090 — Create evidence-judge Agent

## Scope Summary

- **Endpoints touched:** none
- **UI touched:** no
- **Data/storage touched:** no (read-only agent; produces `ac-verdict.json` file artifact)
- **Primary deliverable:** `.claude/agents/evidence-judge.agent.md`
- **Verification approach:** Functional/behavioural inspection of agent file + simulated invocation against sample EVIDENCE.yaml fixtures

---

## Happy Path Tests

### HT-1: Smoke Test — Agent File Exists with Valid Frontmatter

- **Setup:** Story WINT-4090 implementation complete
- **Action:** Check that `.claude/agents/evidence-judge.agent.md` exists; parse its YAML frontmatter block
- **Expected outcome:**
  - File exists at the expected path
  - Frontmatter contains: `model: haiku`, `type: worker`, `version: 1.0.0`
  - `description` field is 80 characters or fewer
  - Required fields present: `created`, `updated`, `version`, `type`, `name`, `description`, `model`, `tools`
- **Evidence:** File listing + YAML parse result showing all required fields

---

### HT-2: Strong Evidence — ACCEPT Verdict

- **Setup:** Construct sample EVIDENCE.yaml with one AC containing a `test` evidence item:
  ```yaml
  acceptance_criteria:
    - ac_id: AC-1
      ac_text: "User can log in"
      status: PASS
      evidence_items:
        - type: test
          path: src/__tests__/auth/login.test.ts
          description: "Login test suite: 12/12 tests passing"
          passing_count: 12
  ```
- **Action:** Invoke evidence-judge agent against this EVIDENCE.yaml
- **Expected outcome:**
  - `ac-verdict.json` produced with `ac_verdicts[0].verdict: ACCEPT`
  - `strong_evidence_count: 1`, `weak_evidence_count: 0`
  - `overall_verdict: PASS`
  - `accepted: 1`, `challenged: 0`, `rejected: 0`
- **Evidence:** Contents of `ac-verdict.json` showing ACCEPT verdict and PASS overall

---

### HT-3: Full ac-verdict.json Schema Validation

- **Setup:** Produce a valid `ac-verdict.json` from any successful invocation
- **Action:** Validate JSON against the documented schema in the agent file
- **Expected outcome:** All required fields present:
  - `story_id` (string)
  - `generated_at` (ISO timestamp)
  - `overall_verdict` (PASS | CHALLENGE | FAIL)
  - `ac_verdicts` array with `ac_id`, `ac_text`, `verdict`, `evidence_evaluated`, `strong_evidence_count`, `weak_evidence_count`
  - `total_acs`, `accepted`, `challenged`, `rejected` (counts)
- **Evidence:** JSON parse with field-by-field validation log

---

### HT-4: Mixed Verdicts — Overall FAIL

- **Setup:** Construct EVIDENCE.yaml with 3 ACs:
  - AC-1: strong `test` evidence (file path + count > 0) → ACCEPT
  - AC-2: `command` evidence with description "looks correct" → CHALLENGE
  - AC-3: empty `evidence_items` → REJECT
- **Action:** Invoke evidence-judge against this EVIDENCE.yaml
- **Expected outcome:**
  - `ac_verdicts[0].verdict: ACCEPT`
  - `ac_verdicts[1].verdict: CHALLENGE`
  - `ac_verdicts[2].verdict: REJECT`
  - `overall_verdict: FAIL` (because at least one REJECT)
  - `accepted: 1`, `challenged: 1`, `rejected: 1`, `total_acs: 3`
- **Evidence:** Full `ac-verdict.json` contents

---

## Error Cases

### EC-1: Weak Evidence — CHALLENGE Verdict

- **Setup:** Construct EVIDENCE.yaml with AC having command-type evidence with subjective description:
  ```yaml
  acceptance_criteria:
    - ac_id: AC-1
      ac_text: "API returns correct data"
      status: PASS
      evidence_items:
        - type: command
          description: "looks correct, no errors seen"
  ```
- **Action:** Invoke evidence-judge
- **Expected outcome:**
  - `ac_verdicts[0].verdict: CHALLENGE`
  - `weak_evidence_count: 1`, `strong_evidence_count: 0`
  - `challenge_reason` field populated (references subjective language)
  - `overall_verdict: CHALLENGE`
- **Evidence:** `ac-verdict.json` showing CHALLENGE verdict with populated `challenge_reason`

---

### EC-2: No Evidence — REJECT Verdict

- **Setup:** Construct EVIDENCE.yaml with AC having empty evidence_items:
  ```yaml
  acceptance_criteria:
    - ac_id: AC-1
      ac_text: "Feature works correctly"
      status: PASS
      evidence_items: []
  ```
- **Action:** Invoke evidence-judge
- **Expected outcome:**
  - `ac_verdicts[0].verdict: REJECT`
  - `evidence_evaluated: 0`
  - `challenge_reason` field states "no evidence items provided"
  - `overall_verdict: FAIL`
  - `rejected: 1`
- **Evidence:** `ac-verdict.json` showing REJECT verdict

---

### EC-3: Missing EVIDENCE.yaml — Graceful Degradation

- **Setup:** Provide a non-existent path for EVIDENCE.yaml input; provide valid story ID
- **Action:** Invoke evidence-judge with missing EVIDENCE.yaml path
- **Expected outcome:**
  - Agent does NOT crash silently
  - All ACs marked REJECT with reason "no evidence bundle found"
  - `overall_verdict: FAIL`
  - Completion signal: `EVIDENCE-JUDGE COMPLETE WITH WARNINGS: 1 warnings` (or higher count)
  - WARNING emitted noting missing input
- **Evidence:** Completion signal in agent output + `ac-verdict.json` with all-REJECT verdicts

---

### EC-4: BLOCKED Signal — No Usable Inputs

- **Setup:** Invoke evidence-judge without providing EVIDENCE.yaml path AND without story ID
- **Action:** Invoke agent with neither required input
- **Expected outcome:**
  - Completion signal: `EVIDENCE-JUDGE BLOCKED: {reason describing missing inputs}`
  - No `ac-verdict.json` written (or empty output written with BLOCKED note)
  - Agent does NOT emit COMPLETE or COMPLETE WITH WARNINGS
- **Evidence:** Agent output showing BLOCKED completion signal

---

### EC-5: Malformed EVIDENCE.yaml — Graceful Degradation

- **Setup:** Provide an EVIDENCE.yaml with invalid YAML syntax or missing required `acceptance_criteria` key
- **Action:** Invoke evidence-judge
- **Expected outcome:**
  - Agent handles parse error gracefully (does not crash)
  - WARNING emitted
  - Completion signal: `EVIDENCE-JUDGE COMPLETE WITH WARNINGS: {N}` (not BLOCKED)
  - Output indicates the parse failure in `ac-verdict.json` or summary
- **Evidence:** Completion signal + agent warning output

---

## Edge Cases

### EG-1: Description Containing Subjective Language Triggers WEAK

- **Setup:** Evidence item of any type where description contains any of: "appears", "seems", "should", "looks"
  ```yaml
  evidence_items:
    - type: http
      path: /api/users
      description: "The response appears to be correct"
  ```
- **Action:** Invoke evidence-judge
- **Expected outcome:**
  - Evidence item classified as WEAK regardless of type
  - If the only evidence item → CHALLENGE verdict for that AC
- **Evidence:** CHALLENGE verdict in `ac-verdict.json` with `challenge_reason` referencing subjective language

---

### EG-2: HTTP Evidence Without Status Code → WEAK

- **Setup:** `http` type evidence with path but no HTTP status code in description
  ```yaml
  evidence_items:
    - type: http
      path: /api/users
      description: "Endpoint responds"
  ```
- **Action:** Invoke evidence-judge
- **Expected outcome:**
  - Evidence classified as WEAK (no HTTP status code = not verifiable)
  - AC receives CHALLENGE verdict
- **Evidence:** CHALLENGE verdict with explanation that HTTP status code is missing

---

### EG-3: E2E Evidence Without File Path → WEAK

- **Setup:** `e2e` type evidence with description only, no file path:
  ```yaml
  evidence_items:
    - type: e2e
      description: "Browser test passed"
  ```
- **Action:** Invoke evidence-judge
- **Expected outcome:**
  - Evidence classified as WEAK
  - AC receives CHALLENGE verdict
- **Evidence:** CHALLENGE verdict citing missing file path

---

### EG-4: Multiple Evidence Items — One STRONG Sufficient for ACCEPT

- **Setup:** AC with 2 evidence items: one WEAK (subjective command), one STRONG (test with path + count)
- **Action:** Invoke evidence-judge
- **Expected outcome:**
  - `strong_evidence_count: 1`, `weak_evidence_count: 1`
  - `verdict: ACCEPT` (at least one STRONG item satisfies AC)
- **Evidence:** ACCEPT verdict despite mixed evidence quality

---

### EG-5: Output File Written to Correct Path

- **Setup:** Standard invocation with valid EVIDENCE.yaml and story ID
- **Action:** Invoke evidence-judge
- **Expected outcome:**
  - `ac-verdict.json` written to `{story_dir}/_implementation/ac-verdict.json`
  - NOT written to root, NOT written to `_pm/`
- **Evidence:** File listing of `_implementation/` directory confirming correct placement

---

### EG-6: Optional Story File Path — AC Text Fallback

- **Setup:** Invoke evidence-judge without providing optional story file path; EVIDENCE.yaml entries have `ac_text` present
- **Action:** Invoke agent
- **Expected outcome:**
  - Agent uses `ac_text` from EVIDENCE.yaml (no story file needed)
  - Completion signal: `EVIDENCE-JUDGE COMPLETE` (no warnings for missing optional input)
- **Evidence:** Clean completion signal + `ac_text` populated in `ac-verdict.json`

---

### EG-7: QA Role Pack Missing — Inline Fallback

- **Setup:** `.claude/prompts/role-packs/qa.md` does not exist (WINT-0210 not landed)
- **Action:** Invoke evidence-judge
- **Expected outcome:**
  - Agent does not fail due to missing role pack
  - Agent applies embedded inline AC→Evidence trace constraints as fallback
  - TODO marker present in agent file noting the conditional injection
  - Evaluation proceeds normally
- **Evidence:** Successful EVIDENCE-JUDGE COMPLETE signal without errors referencing missing qa.md

---

## Non-UI Tests (No Playwright Required)

This story produces no UI changes. All tests are filesystem/agent invocation tests.

---

## Required Tooling Evidence

### Backend

- No HTTP requests required
- Verification commands:
  - File existence: `ls -la /Users/michaelmenard/Development/monorepo/.claude/agents/evidence-judge.agent.md`
  - Frontmatter parse: Extract and validate YAML frontmatter from agent file
  - JSON schema validation: `cat {story_dir}/_implementation/ac-verdict.json | python3 -m json.tool`
  - Field verification: Check all required schema fields present in ac-verdict.json

### Agent Invocation Fixtures

For functional tests, the following EVIDENCE.yaml fixtures are required:

1. **strong-evidence.yaml** — test type with file path and passing count
2. **weak-evidence.yaml** — command type with subjective description ("looks correct")
3. **no-evidence.yaml** — empty evidence_items array
4. **mixed-evidence.yaml** — 3 ACs: 1 ACCEPT, 1 CHALLENGE, 1 REJECT

These fixtures may be created in `{story_dir}/_implementation/test-fixtures/` or inline during QA verification.

---

## Risks to Call Out

1. **Agent file verification is behavioural, not automated.** Unlike TypeScript stories with `pnpm test`, this story requires manual/functional invocation of the agent against fixtures. QA must invoke the agent and inspect outputs.
2. **WINT-0210 timing gap.** If QA verification runs before WINT-0210 lands, `.claude/prompts/role-packs/qa.md` will not exist. EG-7 must be verified against this missing-file scenario explicitly.
3. **ac-verdict.json consumer contract.** WINT-4120 and WINT-4140 depend on a stable schema. Schema changes after WINT-4090 closes require coordination with those stories.
4. **No automated CI check.** The `evidence-judge.agent.md` file has no test suite. QA verification is the only gate. Thoroughness of AC-by-AC functional testing is critical.
