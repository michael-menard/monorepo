Usage: /qa-verify-story STORY-XXX

Post-Implementation Verification agent. Final quality gate before DONE.

## Output
Updates: `VERIFICATION.yaml` (qa_verify + gate sections)

-------------------------------------------------------------------------------
PHASE 0 — MOVE STORY TO QA (MANDATORY - DO THIS FIRST)
-------------------------------------------------------------------------------

Before ANY verification work, move the story directory from in-progress to QA:

1. Verify the story exists at: plans/stories/in-progress/STORY-XXX/
2. Verify the story has `status: ready-for-qa` in its frontmatter
3. Move the entire directory:
   ```bash
   mv plans/stories/in-progress/STORY-XXX plans/stories/QA/STORY-XXX
   ```
4. All subsequent work uses paths under: plans/stories/QA/STORY-XXX/

If the move fails or the story is not in `ready-for-qa` status, STOP and report.

-------------------------------------------------------------------------------

Authoritative Inputs (after move):
- The story file: plans/stories/QA/STORY-XXX/STORY-XXX.md
- The Dev proof file: plans/stories/QA/STORY-XXX/PROOF-STORY-XXX.md
- vercel.migration.plan.exec.md
- vercel.migration.plan.meta.md
- Agent definition files

Preconditions (MANDATORY):
- STORY-XXX.md previously PASSED elaboration (/elab-story)
- STORY-XXX.md has `status: ready-for-qa` in its frontmatter (checked before move)
- PROOF-STORY-XXX.md exists

Purpose:
Verify that the implementation:
- fully satisfies the story's Acceptance Criteria
- was executed and tested correctly
- complies with architectural and reuse standards
- is safe to mark DONE

Verification answers ONE question:
"Did the implementation meet the story requirements with sufficient proof?"

Task:
Perform Post-Implementation Verification of STORY-XXX using the provided proof.

Verification Checklist (MANDATORY):

1) Acceptance Criteria Verification (HARD GATE)
- Every Acceptance Criterion in STORY-XXX.md is mapped to concrete evidence
- Evidence is traceable (files, logs, outputs, screenshots)
- No AC is hand-waved or assumed

2) Test Implementation Quality (HARD GATE)
- Review actual test code for quality:
  - Tests are meaningful, not just checking "truthy" values
  - Tests cover the actual business logic, not just happy paths
  - Tests have clear assertions that match AC requirements
  - Test descriptions accurately describe what is being tested
  - No skipped tests (.skip) without documented justification
  - No test pollution (tests must be isolated and repeatable)
- Identify test anti-patterns:
  - Tests that always pass (no real assertions)
  - Tests that test implementation details rather than behavior
  - Overly mocked tests that don't test real integration
  - Duplicate test coverage

3) Test Coverage Verification (HARD GATE)
- Run coverage report: `pnpm test --coverage` (or equivalent)
- Verify coverage meets minimum thresholds:
  - New code: 80% line coverage minimum
  - Modified code: Coverage must not decrease
  - Critical paths (auth, data mutations, payments): 90% coverage
- Coverage gaps must be documented and justified if below threshold
- Identify untested code paths:
  - Error handlers
  - Edge cases mentioned in AC
  - Boundary conditions

4) Test Execution (HARD GATE)
- **RUN ALL TESTS** - Do not just verify tests exist
- Execute test suites for affected areas:
  ```bash
  pnpm test                    # Run all unit tests
  pnpm test:integration        # Run integration tests (if applicable)
  pnpm playwright test         # Run E2E tests (if UI changes)
  ```

- **Backend API Testing with .http Files (MANDATORY for backend changes):**
  a) Locate the relevant `.http` files in `/__http__/` directory
  b) Start the local dev server if not running:
     ```bash
     pnpm dev                   # Or pnpm vercel:dev for Vercel platform
     ```
  c) Execute EVERY request in the `.http` file(s) for this story:
     - Use the REST Client VS Code extension, OR
     - Use curl/httpie to execute each request manually, OR
     - Use the Bash tool to execute requests:
       ```bash
       # Example: Execute a GET request
       curl -X GET http://localhost:3000/api/endpoint -H "Content-Type: application/json"

       # Example: Execute a POST request with body
       curl -X POST http://localhost:3000/api/endpoint \
         -H "Content-Type: application/json" \
         -d '{"key": "value"}'
       ```
  d) For EACH request, verify:
     - Response status code matches expected (200, 201, 400, 404, etc.)
     - Response body structure matches API contract
     - Error cases return appropriate error responses
     - Authentication/authorization works correctly (if applicable)
  e) Record ALL request/response pairs in the verification file
  f) **Any .http request failure = FAIL verdict**

- Frontend/UI changes REQUIRE:
  - Run Playwright tests
  - Verify all assertions pass
  - Check for visual regressions (if applicable)

- **ALL TESTS MUST PASS** - Any test failure = FAIL verdict
- Record test execution output in verification file

5) Proof Quality
- PROOF-STORY-XXX.md is complete and readable
- Commands and outputs are real, not hypothetical
- Manual verification steps (if any) are clearly stated and justified

6) Architecture & Reuse Confirmation
- No violations of reuse-first or package boundary rules remain
- Ports & adapters boundaries are intact
- No forbidden patterns were introduced

Output:
Update `VERIFICATION.yaml` in story directory with qa_verify and gate sections:

```yaml
# ... code_review section from /dev-code-review ...

qa_verify:
  verdict: PASS | FAIL
  tests_executed: true
  test_results:
    unit: { pass: N, fail: N }
    integration: { pass: N, fail: N }  # if applicable
    e2e: { pass: N, fail: N }          # if applicable
    http: { pass: N, fail: N }         # if backend
  coverage: NN%
  coverage_meets_threshold: true | false
  test_quality:
    verdict: PASS | FAIL
    anti_patterns: []  # only if found
  acs_verified:
    - ac: "AC text"
      status: PASS | FAIL
      evidence: "file:line or test:name"
  architecture_compliant: true | false
  issues: []  # only if found

gate:
  decision: PASS | CONCERNS | FAIL
  reason: "one line"
  blocking_issues: []  # only if FAIL
```

Keep output lean:
- Tables over prose
- Skip empty sections
- Evidence as references, not full output
- See `.claude/agents/_shared/lean-docs.md`

Fail Conditions (MANDATORY):
- Any Acceptance Criterion is unmet
- Test implementation quality is poor (meaningless tests, anti-patterns)
- Test coverage below minimum thresholds without justification
- Any unit/integration test fails during execution
- Any `.http` API request fails or returns unexpected status code
- `.http` files exist but were not executed (backend changes)
- Required tests were not executed
- Proof is incomplete or unverifiable
- Architecture or reuse violations persist

Hard Constraints:
- No code changes (verification only)
- No redesign or scope changes
- No implementation advice
- Do NOT generate additional files (except the verification file)
- MUST run tests - do not just verify tests exist
- MUST review test code quality - do not just check file existence

-------------------------------------------------------------------------------
STATUS UPDATE ON START (MANDATORY)
-------------------------------------------------------------------------------

After moving the story to QA, before beginning verification:

1. Open plans/stories/QA/STORY-XXX/STORY-XXX.md
2. Change `status: ready-for-qa` to `status: in-qa`

This signals that verification is in progress.

-------------------------------------------------------------------------------
STATUS UPDATE ON COMPLETION (MANDATORY)
-------------------------------------------------------------------------------

After QA-VERIFY-STORY-XXX.md is complete:

If verdict is PASS:
1. Open plans/stories/QA/STORY-XXX/STORY-XXX.md
2. Change `status: in-qa` to `status: uat`
3. Move the story to UAT:
   ```bash
   mv plans/stories/QA/STORY-XXX plans/stories/UAT/STORY-XXX
   ```
4. This signals the story is verified and ready for user acceptance
5. **Spawn Index Updater Sub-Agent** (see below)

If verdict is FAIL:
1. Open plans/stories/QA/STORY-XXX/STORY-XXX.md
2. Change `status: in-qa` to `status: needs-work`
3. Move the story back to in-progress:
   ```bash
   mv plans/stories/QA/STORY-XXX plans/stories/in-progress/STORY-XXX
   ```
4. This signals the story must return to Dev for fixes

-------------------------------------------------------------------------------
INDEX UPDATE SUB-AGENT (ON PASS ONLY)
-------------------------------------------------------------------------------

After updating story status to `uat`, spawn a sub-agent using the Task tool with
the following prompt:

```
You are the Story Index Updater agent. Your task is to update the story index
after STORY-XXX has passed QA verification.

Note: The story is now located at plans/stories/UAT/STORY-XXX/

File to update: plans/stories/stories.index.md

Tasks:
1. Find STORY-XXX in the index and change its status to `completed`

2. Clear satisfied dependencies from downstream stories:
   - Find all stories that list STORY-XXX in their `**Depends On:**` field
   - Remove STORY-XXX from their dependency list
   - If the dependency list becomes empty, set it to `none`
   - Example: If STORY-008 has `**Depends On:** STORY-007` and STORY-007 completes,
     update STORY-008 to `**Depends On:** none`

3. Update the Progress Summary counts at the top of the file

4. Recalculate the "Ready to Start" section using this algorithm:
   - A story is READY if:
     - Its status is `pending` AND
     - Its `**Depends On:**` is `none`
   - A story is BLOCKED if `**Depends On:**` lists any story IDs

5. Update the "Ready to Start" table to show all READY stories

6. Update the "Waiting on" sections to show blocking chains:
   - Group blocked stories by their nearest incomplete dependency
   - Show the chain: STORY-A → STORY-B → STORY-C (where → means "unblocks")

Example Ready to Start section format:
## Ready to Start

Stories with all dependencies satisfied (can be worked in parallel):

| Story | Feature | Blocked By |
|-------|---------|------------|
| STORY-010 | MOC Parts Lists | — |
| STORY-011 | MOC Instructions Read | — |

**Waiting on STORY-007 (in-progress):**
- STORY-008 → STORY-009 → STORY-016 → STORY-017 → STORY-018
```

-------------------------------------------------------------------------------
TOKEN LOGGING (REQUIRED)
-------------------------------------------------------------------------------

After QA verification is complete, log token usage using the centralized skill:

1. Estimate token usage from `/cost` command output or byte calculations
2. Run: `/token-log STORY-XXX qa-verify <input-tokens> <output-tokens>`

Example:
```
/token-log STORY-XXX qa-verify 30000 4000
```

This logs the phase tokens to `_implementation/TOKEN-LOG.md` for tracking.

See `.claude/agents/_token-logging.md` for estimation formulas.

-------------------------------------------------------------------------------
DONE
-------------------------------------------------------------------------------

Stop when:
- All tests have been executed (unit, integration, E2E as applicable)
- Test coverage has been verified against thresholds
- Test implementation quality has been reviewed
- QA-VERIFY-STORY-XXX.md is complete (including test results)
- Token usage logged via `/token-log STORY-XXX qa-verify`
- Story status is updated based on verdict
- Index Updater sub-agent has completed (on PASS)
