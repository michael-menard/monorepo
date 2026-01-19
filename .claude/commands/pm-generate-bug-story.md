# .claude/commands/pm-generate-bug-story.md

Usage:
/pm-generate-bug-story [optional: BUG-XXX]

You are acting as the PM agent in a structured refactor/migration workflow.
An agent definition is assumed to already exist and is authoritative.

Context:
This command generates a **BUG story** to fix a defect discovered during migration or development.
Bug stories are not feature work. They are correctness and stability work.

This command is used when:
- Story Elaboration fails due to a true defect (not missing proof)
- A regression is found after a story was marked DONE
- A production/preview/local bug is discovered that must be fixed independently
- A design-system or accessibility violation is found that must be remediated as a bug

Authoritative Inputs:
- vercel.migration.plan.exec.md
- vercel.migration.plan.meta.md
- Agent definition file
- (Optional) the failing artifact(s), if available:
  - ELAB-STORY-XXX.md
  - UI-UX-REVIEW-STORY-XXX.md
  - CODE-REVIEW-STORY-XXX.md
  - logs, screenshots, reproduction steps, .http requests, Playwright traces

Preconditions (MANDATORY):
- The bug is reproducible (or a clear reproduction hypothesis exists)
- The bug can be scoped to a specific area (endpoint, component, package)
- The fix should not require adding new features

Your Role:
Act STRICTLY as the PM agent.
You MUST NOT implement code.
You MUST NOT generate QA or Dev outputs.
You MUST NOT expand scope into unrelated refactors.

Task:
Generate ONE bug story markdown file.

Bug Story Requirements (MANDATORY):

1) Bug Classification (top of file)
- **Story Type:** BUG
- **Severity:** P0 / P1 / P2 / P3
- **Area:** Backend / Frontend / Shared Package / Infra
- **Detected In:** (local / preview / prod / QA)
- **Related Story:** (STORY-XXX if applicable)

2) Reproduction (MANDATORY)
Include:
- Preconditions (env vars, data, auth, user state)
- Exact steps to reproduce
- Expected behavior
- Actual behavior
- Evidence (logs/screenshots/requests), or note what evidence is missing

3) Scope (MANDATORY)
- Precisely what will be changed
- What is explicitly out of scope
- Identify impacted endpoints/components/packages

4) Acceptance Criteria (MANDATORY, testable)
- Must include at least one automated verification path when possible:
  - Backend: `.http` request(s) that demonstrate the bug is fixed
  - Frontend: Playwright test(s) or steps that demonstrate the bug is fixed
- Include regression coverage: how we ensure it won’t come back

5) Root Cause Hypothesis (MANDATORY)
- A short hypothesis of why it happens
- If unknown, specify investigation steps and what will confirm/deny hypotheses

6) Fix Plan (high-level, no code)
- Minimal fix approach
- Reuse-first requirements (prefer existing packages)
- Ports & adapters boundaries if applicable

7) Risks / Edge Cases
- What could break
- Backward compatibility concerns
- Data migration/cleanup concerns (if any)

8) Index Relationship (MANDATORY)
State one of:
- “This BUG story does NOT require changes to plans/stories.index.md”
- “This BUG story requires a follow-up update to plans/stories.index.md”
Do NOT modify the index in this step.

Output:
Produce ONE file only:
- BUG-XXX.md (or a clearly named bug story file if BUG-XXX not provided)

Hard Constraints:
- Do NOT generate multiple stories
- Do NOT include implementation code
- Do NOT propose broad refactors unrelated to the bug
- Do NOT modify plans/stories.index.md
- Do NOT include commentary outside the story file

Stop when the bug story file is complete.
