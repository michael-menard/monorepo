# Feature Implementation Workflow (Dev Agent)

## Purpose

Guide a single **story or epic** from "Ready to Work" into a fully implemented, locally verified feature using the **Dev agent**.

**Recommended LLM model when running this workflow in Warp:** `openAI 5.1 codex medium` (or equivalent code-focused model).

This workflow assumes:
- The story/epic has already passed elaboration (PM → Architect → Dev → QA → UX) and is marked **"Ready to Work"**.
- You now want the Dev agent to drive implementation, tests, and local verification until the story is **"Ready for QA"**.

Primary agent: **Dev** (`work/agents/dev.md`).

---

## Stage 0 – Activation & Greeting

**Primary agent:** Dev

### Goal

Activate the Dev agent, greet the user, and confirm the target story/epic.

### Steps

1. Greet the user as the **Dev agent** and briefly describe your role (implementation, quality, tests).
2. Confirm inputs:
   - `kind`: `story` or `epic`.
   - `file`: markdown path under `docs/stories/` or `docs/prd/`.
3. Open the target markdown file.
4. Confirm that the story/epic is in a state equivalent to **"Ready to Work"** (from prior workflows).

If it is not Ready to Work, advise the user to run the **Story/Epic Elaboration** workflow first.

---

## Stage 1 – Set Status to "In Progress" & Read Context

**Primary agent:** Dev

### Goal

Establish clear ownership and context for the implementation.

### Steps

1. In the target story/epic document, update the visible status to:
   - **`Status: In Progress`**, or set the `## Status` section contents to `In Progress`.
2. Read all relevant sections of the story/epic, including (where present):
   - `pm-po-review`
   - `architect-review`
   - `dev-plan` / `implementation-notes` from elaboration
   - `qa-plan`
   - `ux-review`
3. Load supporting docs as needed (architecture, coding standards, etc.).

---

## Stage 2 – Clarifying Questions & Implementation Plan

**Primary agent:** Dev

### Goal

Create a concrete, reviewable implementation plan before touching code, and surface any uncertainties.

### Steps

1. Identify gaps or ambiguities:
   - Unclear ACs.
   - Unspecified edge cases / error paths.
   - Missing architecture or UX details.
2. Ask the user **clarifying questions** where needed. Examples:
   - Edge case behaviors.
   - Performance constraints.
   - UX expectations not captured in the story.
3. Once questions are answered (or assumptions agreed), draft a **detailed implementation plan** in the story under a `dev-plan` or `implementation-notes` section. Include:
   - A list of code changes by file/module.
   - Data model / API surface impacts.
   - Error handling and logging approach (via `@repo/logger`, no `console.log`).
   - Testing strategy:
     - Unit tests (Vitest): functions, hooks, components.
     - Integration tests (Vitest): cross-module, API, DB, or service boundaries.
     - Playwright tests: if user-facing flows or UI changes are involved.
4. Optionally apply the **Dev scoring model** from `work/agents/dev.md` to the plan state and note any blockers.

---

## Stage 3 – Confirm Plan with User

**Primary agent:** Dev

### Goal

Ensure the user is comfortable with the plan before code changes are made.

### Steps

1. Summarize the plan back to the user in a few bullets.
2. Ask explicitly:
   - **"Are you ready for me to implement this plan?"**
3. If the user requests changes:
   - Revise the plan in `dev-plan`.
   - Repeat this stage until the user approves.

Only proceed to implementation once the user has confirmed.

---

## Stage 4 – Implementation

**Primary agent:** Dev

### Goal

Implement the feature according to the plan, keeping changes clean and aligned with repo standards.

### Steps

1. Implement code changes as described in `dev-plan`:
   - Follow TypeScript + Zod-first patterns (schemas + `z.infer`).
   - Respect existing module boundaries and patterns.
   - Use shared packages (`@repo/ui`, `@repo/logger`, etc.).
2. Keep a brief **file change log** in the story under a `dev-implementation` section, listing:
   - Files touched.
   - High-level reason per file.
3. Maintain good commit hygiene (even if not committing yet):
   - Logical, self-contained changes.
   - No stray debug code or commented-out blocks.

---

## Stage 6 – Tests: Vitest (Unit + Integration) and Playwright
agent:** Infra (`work/agents/infra.md`) in collaboration with Dev

### Goal

Ensure any required infrastructure and operational changes for this feature are designed and implemented safely (or at least clearly identified and planned).

### Steps

1. Review the story/epic and `dev-plan` for infra-related impacts:
   - New or modified AWS resources (Lambdas, queues, topics, buckets, etc.).
   - Changes to IAM, networking, or data stores.
   - Monitoring, logging, or alerting needs.
2. Plan infra changes in the story under an `infra-implementation` subsection (can live inside `dev-implementation` or as a sibling section):
   - List files/stacks/scripts to update (e.g., `infrastructure/`, `apps/api/stacks`, `serverless.yml`).
   - Describe desired security, reliability, and cost posture at a high level.
3. Implement the necessary infra changes where appropriate for this feature (or explicitly note if they will be handled in a follow-up story):
   - Follow patterns and constraints from `work/agents/infra.md`.
   - Avoid obviously unsafe defaults (overly broad IAM, public buckets, missing encryption, etc.).
4. Validate infra-related aspects as far as is reasonable locally/dev:
   - Run any existing infra-related checks or scripts (e.g., validation scripts, smoke tests).
   - Confirm logs/metrics/alerts are wired where expected.
5. Optionally apply the Infra scoring model from `work/agents/infra.md` for this feature and record a brief note in `infra-implementation`.

---

## Stage 6 – Tests: Vitest (Unit + Integration) and Playwright

**Primary agent:** Dev

### Goal

Ensure strong automated coverage for the new/changed behavior before handing off to QA.

### Steps

1. For **Vitest unit tests**:
   - Add or extend tests covering:
     - Happy paths.
     - Edge cases.
     - Error handling and failure modes.
   - Use `it.each` where appropriate to minimize duplication.
   - Use BDD-style test names that read like user flows.
2. For **Vitest integration tests** (where applicable):
   - Cover cross-module or external boundaries (APIs, DB, queues, external services).
3. For **Playwright tests** (if UI or user flows are affected):
   - Add/extend E2E tests in `apps/web/playwright` to cover:
     - Main user flows introduced or changed by the story.
     - Regressions in previously working flows.
4. Run tests locally:
   - At minimum, run the relevant `pnpm` test commands for the affected packages/apps (unit + integration + Playwright where applicable).
   - Fix all test failures.
5. Update the story’s `dev-review` or `dev-plan` with:
   - What test suites were added/updated.
   - Any limitations (e.g., E2E not added and why, if truly not applicable).

All Vitest tests must pass before proceeding.

---

## Stage 7 – Linting & Type Checking

**Primary agent:** Dev

### Goal

Ensure the change passes all local quality gates (lint + types) before marking Ready for QA.

### Steps

1. Run the project’s lint and type-check commands (at minimum on changed files):
   - `pnpm lint`
   - `pnpm check-types`
2. Fix all lint and type errors; do not leave TODOs without explanation.
3. Confirm that **lint and type checks pass cleanly**.

---

## Stage 8 – Final Dev Review & Status Update

**Primary agent:** Dev

### Goal

Capture a Dev-focused summary and mark the story as **Ready for QA**.

### Steps

1. In the story, update or create a `dev-review` section that includes:
   - `score` (1–100) using Dev scoring model, after blockers.
   - `blockers` (if any remaining, even if not release-blocking).
   - `notes` (1–3 bullets, focusing on design, quality, risk).
   - `risk_summary` (short description of remaining technical risk).
   - `recommendations` (immediate vs future improvements).
2. **Update the story/epic status**:
   - Set the visible status to **"Ready for QA"**:
     - e.g., `Status: Ready for QA` or `## Status` section set to `Ready for QA`.
3. Optionally notify the user (and/or your team) that:
   - Implementation is complete.
   - Tests and lint pass.
   - The story is ready for the **Story/Epic QA Completion Review** workflow.

---

## Usage Pattern in Warp

1. Use the **Feature Implementation** Warp workflow (e.g. `.warp/workflows/feature-implementation.yaml`) to select a **story or epic**.
2. Open the target file and this checklist (`work/workflows/feature-implementation.md`).
3. Work through **Stage 0 → Stage 8**, updating status, `dev-plan`, `dev-implementation`, `infra-implementation`, and `dev-review` in the target document.
4. Once complete and all checks pass, the story/epic should be clearly marked **"Ready for QA"** and ready for the QA workflow.
