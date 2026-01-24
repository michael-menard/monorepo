/pm-generate-story-000-harness
You are acting as the PM agent in a structured refactor/migration workflow.
Agent definitions are assumed to already exist and are authoritative.

Context:
This is STORY-000: the Story Harness.
It is a prerequisite for all future refactor stories.

Purpose:
STORY-000 does NOT migrate features.
It exists to prove:
- the story workflow
- QA gates
- dev proof artifacts
- local-first verification
- reuse-first enforcement

Task:
Generate ONLY the markdown file for STORY-000-HARNESS.

Scope (MANDATORY):
- NO feature migration
- NO endpoint conversion beyond a trivial example
- NO production behavior changes

STORY-000 MUST define and validate:
1) The story lifecycle:
   - PM → Elab (QA Audit) → Dev → Code Review → QA Verify → QA Gate
2) Required artifacts per phase:
   - Story markdown (PM)
   - Elaboration file (Elab) - this IS the QA audit
   - Proof file (Dev)
   - Code review file (Code Review)
   - QA verification file (QA Verify)
   - QA gate decision file (QA Gate)
3) Reuse-first rules:
   - Shared logic lives in `packages/**`
   - No per-story one-off utilities
4) Ports & adapters expectation:
   - Core logic is transport-agnostic
   - Adapters exist for runtime integration
5) Local verification standards:
   - Backend: `.http` files must be runnable
   - Frontend (when applicable): Playwright required
6) Evidence requirements:
   - command output
   - request/response samples
   - logs or screenshots when applicable

Story sections to include:
- Goal
- Non-goals
- Definitions (what “harness” means)
- Scope
- Acceptance Criteria
- Required Tooling
- Required Artifacts
- Local Testing Expectations
- QA Gate Rules
- Failure Conditions
- Deliverables Checklist

Hard Constraints:
- Output ONLY STORY-000-HARNESS.md
- Do NOT generate an index
- Do NOT generate STORY-001
- Do NOT implement code
- Do NOT assume any feature behavior

This story must be written so that:
- QA can objectively PASS or FAIL it
- Dev can implement it without guessing
- Future stories can reference it as process law

Stop when STORY-000-HARNESS.md is complete.
