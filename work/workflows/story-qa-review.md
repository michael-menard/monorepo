# Story/Epic QA Completion Review Workflow

## Purpose

Run a **QA-focused, post-implementation review** for a single story or epic that is believed to be "done".

**Recommended LLM model when running this workflow in Warp:** `openAI 5.1 codex medium` (or equivalent code+tests-focused model).

This workflow assumes that:
- The story/epic has already gone through planning/elaboration.
- Implementation work is complete (code merged or at least in a feature branch).
- Automated tests exist or are expected (unit, integration, e2e/Playwright).

Primary agent: **QA** (`work/agents/qa.md`), with optional hooks for Dev, PM/PO, and UX as needed.

## When to Use

- Before moving a story to **Ready for Release** / **Ready for PO Acceptance**.
- Before cutting a release or enabling a feature flag.
- When you want a structured QA risk assessment using the BMAD QA scoring model.

## Inputs

Minimal inputs to start:
- Target story or epic file (e.g. `docs/stories/story-123.md`, `docs/prd/epic-6-wishlist.md`).
- Links or references to the implementation (PR, branch, commit, or deployment environment).
- Any existing QA notes or prior gate results under `docs/qa/` (if used).

---

## Stage 1 – Collect Evidence & Scope

**Primary agent:** QA

### Goal

Clarify **what changed**, **where it lives**, and **what needs to be tested/verified**.

### Steps

1. Open the target story/epic file.
2. Identify and note:
   - ACs in scope for this implementation.
   - Impacted modules/services/routes.
   - Any NFRs or cross-cutting concerns mentioned in the story/epic.
3. Locate implementation artifacts:
   - PR(s) or commits that claim to implement this story/epic.
   - Relevant code areas (handlers, components, lambdas, etc.).
4. Locate testing artifacts:
   - Unit tests covering new/changed behavior.
   - Integration tests for boundaries (APIs, DB, queues, external services).
   - E2E/Playwright tests for user flows.
5. Capture a brief **QA scope note** in the story/epic (e.g. a `qa-scope` section):
   - What is in-scope vs out-of-scope for this review.
   - Which environments will be used (dev, stage, feature flag, etc.).

---

## Stage 2 – AC Traceability & Test Design Check

**Primary agent:** QA

### Goal

Ensure every AC is **concretely testable** and has a clear mapping to automated tests (or an explicit decision if an automated test is not appropriate).

### Steps

1. For each AC in the story/epic:
   - Confirm it is concrete and testable (Given–When–Then or equivalent).
   - Map it to existing or planned tests (unit/integration/e2e).
2. If any AC is ambiguous or untestable:
   - Call this out explicitly in a `qa-review` subsection.
   - Consider raising back to PM/PO or Dev for clarification.
3. Update or create a `qa-plan` section that contains:
   - AC → test mapping (IDs or file paths / test names).
   - Notes for any AC that is validated primarily via manual or exploratory testing.

### QA Blockers to Apply

From `work/agents/qa.md`:
- **Q1 – Untested AC**
- **Q2 – AC not concretely testable**
- **Q3 – Missing AC→test traceability**

Record any applicable blockers in the `qa-review` section.

---

## Stage 3 – Execution & Coverage Assessment

**Primary agent:** QA (with support from Dev if needed)

### Goal

Run or verify relevant tests, then evaluate **coverage depth** and **regression protection**.

### Steps

1. Run (or confirm CI has run) the relevant suites:
   - Unit tests for new/changed logic.
   - Integration tests for boundaries.
   - E2E/Playwright tests for user-visible flows.
2. Check for:
   - Failing or skipped tests related to this story/epic.
   - Areas where tests exist but don’t truly validate behavior (trivial assertions).
3. Confirm regression coverage:
   - For bugfixes: at least one regression test that fails before the fix and passes after.
   - For changes to existing behavior: tests that ensure legacy critical behavior still works.
4. Update `qa-review` with:
   - Summary of executed suites.
   - Any failing/skipped tests and links/references.
   - Any obvious gaps in depth or regression protection.

### QA Blockers to Apply

From `work/agents/qa.md`:
- **Q4 – Missing unit tests for a feature AC**
- **Q5 – Missing integration tests where boundaries exist**
- **Q6 – Missing E2E coverage for a user flow**
- **Q7 – Missing regression test for bugfix**
- **Q8 – No regression coverage for updated existing behavior**
- **Q9 – Failing or skipped tests on behavior in scope**

Add any applicable blockers with short descriptions.

---

## Stage 4 – Risk, NFRs, and Final QA Scoring

**Primary agent:** QA

### Goal

Assess **overall risk posture**, including NFRs (performance, security, reliability, a11y), and compute the QA score for this story/epic.

### Steps

1. Review NFR and cross-cutting aspects:
   - Security/data integrity/privacy.
   - Performance / scalability.
   - Reliability / availability.
   - Observability (logging, metrics, alerts) where relevant.
2. Identify any NFR-related risks not covered by tests:
   - Note whether they are blocking vs acceptable with mitigation.
3. Apply the full **QA scoring model** from `work/agents/qa.md`:
   - Compute `raw_score` from dimensions:
     - Requirements & AC traceability
     - Coverage & depth
     - Risk & regression protection
     - NFR & cross-cutting concerns
     - Test quality & maintainability
   - Apply all relevant blockers (Q1–Q11).
   - Derive `final QA score` as the capped value.
4. Record the final QA assessment in `qa-review`:
   - `score`
   - `blockers` (list, with references where possible)
   - `notes` (1–3 bullets)
   - `risk_summary`
   - `recommendations` (immediate vs future)
   - Update `gate_history` for this story/epic (as per agent spec).

### Gate

Set the QA gate decision for this review:
- `PASS` – acceptable risk, tests credible.
- `CONCERNS` – non-blocking issues, but worth tracking.
- `FAIL` or `BLOCKED` – story/epic not acceptable to ship from QA perspective.
- `WAIVED` – risk accepted explicitly (note rationale in `risk_summary`).

Then **update the story/epic status in the document** based on the QA outcome:
- If QA gate is `PASS` or `WAIVED` (and the team agrees to proceed), set status to **"Ready for Deploy"**.
- If QA gate is `CONCERNS`, `FAIL`, or `BLOCKED`, set status to **"Needs work"**.
- Update the visible status field(s) in the markdown (e.g., `Status:` line or `## Status` section) to reflect this.

Record the gate decision and timestamp in `gate_history`.

---

## Optional Stage 5 – PO/UX Acceptance Hooks

Although this workflow is QA-centric, you can optionally:

- Surface QA findings to **PO** (`work/agents/po.md`) for a final acceptance decision.
- Share usability/a11y-related risks with **UX/UX Expert** (`work/agents/ux.md`, `work/agents/ux-expert.md`).

These follow-up steps should be captured as notes or tasks in the story/epic and/or in your backlog tool.

---

## Usage Pattern in Warp

1. Use the dedicated Warp QA review workflow (e.g. `.warp/workflows/story-qa-review.yaml`) to select a **story or epic**.
2. Open the target file and this checklist (`work/workflows/story-qa-review.md`).
3. Work through **Stage 1 → Stage 4** (and optional Stage 5), updating `qa-scope`, `qa-plan`, `qa-review`, and `gate_history` in the target document.
4. Use the final QA gate decision to drive whether the story/epic can move to **Ready for Release**, **Ready for PO**, or needs additional work.