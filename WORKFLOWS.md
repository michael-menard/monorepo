# Workflow Guide

This document describes the **Warp-native and BMAD-inspired workflows** available in this repo. As we add more, they should be documented here.

## Conventions

- **Stories** live in `docs/stories/`
- **Epics/PRD shards** live in `docs/prd/`
- **Architecture docs** live in `docs/architecture/`
- **Warp workflows** for this repo live under `.warp/workflows/`
- **Role/agent specs** live under `work/agents/`

Each workflow is designed to be:
- **Role-aware** (PM, Architect, Dev, QA, UX)
- **Gate-driven** (READY / BLOCKED decisions per role)
- **File-centric** (you always work in concrete markdown artifacts: stories, epics, PRDs)

---

## 1. Story/Epic Elaboration (PM → Architect → Dev → QA → UX)

**Purpose:**

Take a single **story** or **epic** from a fuzzy idea to **READY_TO_WORK**, using your BMAD-style role specs and gates.

**Recommended model in Warp:** `openAI 5.1 codex medium`.

- PM/PO: scope, value, AC quality
- Architect: architecture & boundaries
- Infra: infra, security, reliability, observability, cost
- Dev: feasibility & implementation plan
- QA: test design & risk posture
- UX: usability, a11y, design-system alignment

### Files Involved

- **Warp workflow definition**: `.warp/workflows/story-epic-elaboration.yaml`
- **Checklist / detailed steps**: `work/workflows/story-elaboration.md`
- **Role specs**:
  - PM/SM: `work/agents/pm.md`
  - PO: `work/agents/po.md`
  - Architect: `work/agents/architect.md`
  - Infra: `work/agents/infra.md`
  - Dev: `work/agents/dev.md`
  - QA: `work/agents/qa.md`
  - UX: `work/agents/ux.md`
  - UX Expert: `work/agents/ux-expert.md`

### What It Does

The Warp workflow **does not modify files itself**. It:

1. Takes two arguments:
   - `kind`: `story` or `epic`
   - `file`: markdown file name (e.g. `story-123.md`, `epic-6-wishlist.md`)
2. Resolves the correct path:
   - `story` → `docs/stories/<file>`
   - `epic` → `docs/prd/<file>`
   - Appends `.md` if omitted.
3. Verifies the file exists.
4. Prints a concise guide telling you to:
   - Open the target file
   - Open `work/workflows/story-elaboration.md` as your checklist
   - Walk through the stages **PM → Architect → Dev → QA → UX**, filling in the `*-review` sections in the target document.

### Stage Overview

The detailed behavior of each stage is defined in `work/workflows/story-elaboration.md`, but at a high level:

1. **Stage 1 – PM/PO Story Definition**
   - Clarify value, ACs, scope, alignment.
   - Write `pm-po-review` into the story/epic.
   - Gate: `READY_FOR_ARCHITECT` or BLOCKED.

2. **Stage 2 – Architect Elaboration**
   - Map to services/modules, data flows, and NFRs.
   - Write `architect-review` into the doc.
   - Gate: `READY_FOR_DEV` or BLOCKED.

3. **Stage 3 – Infra / DevOps Architecture & Operations Review**
   - Evaluate infra design, security, reliability, observability, and cost posture.
   - Write `infra-review` into the doc.
   - Gate: `READY_FOR_DEV` or BLOCKED.

4. **Stage 4 – Dev Feasibility & Implementation Readiness**
   - Sketch implementation + test strategy.
   - Write `dev-plan` / `implementation-notes` and `dev-review`.
   - Gate: `READY_FOR_QA` or NOT READY.

5. **Stage 5 – QA Test Design & Risk Assessment**
   - Design layered tests (unit / integration / e2e) with AC→test mapping.
   - Write `qa-plan` and `qa-review`.
   - Gate: `READY_FOR_UX` or BLOCKED.

6. **Stage 6 – UX Review & Experience Design Hooks**
   - Ensure flows, states, a11y, and design-system use are specified.
   - Write `ux-review` / `ux-plan`.
   - Final gate: `READY_TO_WORK` or BLOCKED.

### How to Run (Warp)

1. Open the **Workflows** palette in Warp (search for workflows).
2. Select: **`Story/Epic: PM → Architect → Dev → QA → UX elaboration`**.
3. When prompted, fill in:
   - `kind`:
     - `story` for `docs/stories/...`
     - `epic` for `docs/prd/...`
   - `file`:
     - Example (story): `story-123-wishlist-empty-state.md`
     - Example (epic): `epic-6-wishlist.md`
4. Run the workflow.
5. Follow the printed instructions:
   - Open the resolved file path in your editor.
   - Open `work/workflows/story-elaboration.md` alongside it.
   - Work through each stage, updating the target document.

### Typical Flow Example

- For a **story**:
  - `kind = story`
  - `file = story-123-wishlist-empty-state.md`
- For an **epic**:
  - `kind = epic`
  - `file = epic-6-wishlist.md`

In both cases you’ll end up with the same elaboration pattern, but the surrounding context (PRD vs story) will differ.

---

## 2. Story/Epic QA Completion Review

**Purpose:**

Provide a **QA-centric, post-implementation review** for a single story or epic that is believed to be complete, using the BMAD QA agent spec and gates.

**Recommended model in Warp:** `openAI 5.1 codex medium`.

This assumes planning/elaboration is done and implementation work (plus tests) exists.

### Files Involved

- **Warp workflow definition**: `.warp/workflows/story-qa-review.yaml`
- **Checklist / detailed steps**: `work/workflows/story-qa-review.md`
- **QA agent spec**: `work/agents/qa.md`

### What It Does

The Warp workflow:

1. Takes two arguments:
   - `kind`: `story` or `epic`
   - `file`: markdown file name (e.g. `story-123.md`, `epic-6-wishlist.md`)
2. Resolves the correct path:
   - `story` → `docs/stories/<file>`
   - `epic` → `docs/prd/<file>`
   - Appends `.md` if omitted.
3. Verifies the file exists.
4. Prints a short guide telling you to:
   - Open the target file
   - Open `work/workflows/story-qa-review.md` as your checklist
   - Walk through the QA review stages, updating `qa-scope`, `qa-plan`, `qa-review`, and `gate_history` in the target document.

### Stage Overview

The detailed behavior of each stage is defined in `work/workflows/story-qa-review.md`, but at a high level:

1. **Stage 1 – Collect Evidence & Scope**
   - Identify ACs, impacted areas, implementation and test artifacts.
   - Capture `qa-scope` in the story/epic.

2. **Stage 2 – AC Traceability & Test Design Check**
   - Ensure each AC is testable and mapped to tests.
   - Update `qa-plan` and apply Q1–Q3 blockers as needed.

3. **Stage 3 – Execution & Coverage Assessment**
   - Run/verify unit, integration, and E2E tests.
   - Assess depth and regression protection; apply Q4–Q9 blockers.

4. **Stage 4 – Risk, NFRs, and Final QA Scoring**
   - Evaluate NFR risks (security, performance, reliability, etc.).
   - Compute QA `raw_score`, apply Q1–Q11 blockers, set final score.
   - Update `qa-review` and `gate_history` with gate decision (PASS / CONCERNS / FAIL / BLOCKED / WAIVED).

### How to Run (Warp)

1. Open the **Workflows** palette in Warp.
2. Select: **`Story/Epic: QA completion review`**.
3. When prompted, fill in:
   - `kind`:
     - `story` for `docs/stories/...`
     - `epic` for `docs/prd/...`
   - `file`:
     - Example (story): `story-123-wishlist-empty-state.md`
     - Example (epic): `epic-6-wishlist.md`
4. Run the workflow.
5. Follow the printed instructions:
   - Open the resolved file path in your editor.
   - Open `work/workflows/story-qa-review.md` alongside it.
   - Work through the QA stages, updating the target doc.

---

## 3. Story/Epic Feature Implementation (Dev)

**Purpose:**

Drive implementation of a **Ready to Work** story/epic using the Dev agent, from initial plan through code, tests, lint/type checks, and mark it **"Ready for QA"**.

**Recommended model in Warp:** `openAI 5.1 codex medium`.

This assumes the story/epic has already gone through elaboration and is ready for development.

### Files Involved

- **Warp workflow definition**: `.warp/workflows/feature-implementation.yaml`
- **Checklist / detailed steps**: `work/workflows/feature-implementation.md`
- **Dev agent spec**: `work/agents/dev.md`
- **Infra agent spec**: `work/agents/infra.md`

### What It Does

The Warp workflow:

1. Takes two arguments:
   - `kind`: `story` or `epic`
   - `file`: markdown file name (e.g. `story-123.md`, `epic-6-wishlist.md`)
2. Resolves the correct path:
   - `story` → `docs/stories/<file>`
   - `epic` → `docs/prd/<file>`
   - Appends `.md` if omitted.
3. Verifies the file exists.
4. Prints a guide telling you to:
   - Open the target file
   - Open `work/workflows/feature-implementation.md` as your checklist
   - Walk through Dev-driven stages from activation to **Ready for QA**.

### Stage Overview

The detailed behavior is in `work/workflows/feature-implementation.md`, but at a high level:

1. **Activation & Greeting** – Dev agent greets, confirms target story/epic.
2. **Set Status to "In Progress" & Read Context** – status set to `In Progress`, context loaded.
3. **Clarifying Questions & Implementation Plan** – questions asked, `dev-plan` written.
4. **Confirm Plan with User** – user explicitly approves the plan before coding.
5. **Implementation** – code changes implemented per plan, `dev-implementation` updated.
6. **Infra / DevOps Implementation & Checks** – infra changes and operational concerns addressed, `infra-implementation` updated.
7. **Tests (Vitest + Playwright)** – unit + integration tests added/updated; Playwright where applicable; all tests must pass.
8. **Linting & Type Checking** – `pnpm lint` and `pnpm check-types` run and pass.
9. **Final Dev Review & Status Update** – `dev-review` recorded; status set to **"Ready for QA"**.

### How to Run (Warp)

1. Open the **Workflows** palette in Warp.
2. Select: **`Story/Epic: Feature implementation (Dev)`**.
3. When prompted, fill in:
   - `kind`:
     - `story` for `docs/stories/...`
     - `epic` for `docs/prd/...`
   - `file`:
     - Example (story): `story-123-wishlist-empty-state.md`
     - Example (epic): `epic-6-wishlist.md`
4. Run the workflow.
5. Follow the printed instructions:
   - Open the resolved file path in your editor.
   - Open `work/workflows/feature-implementation.md` alongside it.
   - Work through the Dev stages until the story is marked **"Ready for QA"**.

---

## 4. Story/Epic Refinement Interviews

**Purpose:**

Use all elaboration agents to interview the user and enrich a story/epic with deeper context before formal elaboration or implementation.

**Recommended model in Warp:** `openAI 5.1 codex medium`.

### Files Involved

- **Warp workflow definition**: `.warp/workflows/story-refinement.yaml`
- **Checklist / detailed steps**: `work/workflows/story-refinement.md`
- **Agent specs**:
  - PM/SM: `work/agents/pm.md`
  - PO: `work/agents/po.md`
  - Analyst: `work/agents/analyst.md`
  - Architect: `work/agents/architect.md`
  - Dev: `work/agents/dev.md`
  - QA: `work/agents/qa.md`
  - UX / UX Expert: `work/agents/ux.md`, `work/agents/ux-expert.md`

### What It Does

The Warp workflow:

1. Takes two arguments:
   - `kind`: `story` or `epic`
   - `file`: markdown file name (e.g. `story-123.md`, `epic-6-wishlist.md`)
2. Resolves the correct path:
   - `story` → `docs/stories/<file>`
   - `epic` → `docs/prd/<file>`
   - Appends `.md` if omitted.
3. Verifies the file exists.
4. Prints a guide telling you to:
   - Open the target file
   - Open `work/workflows/story-refinement.md` as your checklist
   - Walk through each agent interview and then synthesize the results into the story/epic.

### Stage Overview

The detailed behavior is in `work/workflows/story-refinement.md`, but at a high level:

1. **Activation & Status** – confirm target, set status to `In Refinement`.
2. **PM/PO Interview** – clarify value, scope, success.
3. **Analyst Interview** – deepen requirements, flows, and edge cases.
4. **Architect Interview** – discuss architecture, boundaries, constraints.
5. **Dev Interview** – cover feasibility, complexity, dependencies.
6. **QA Interview** – testability and risk focus.
7. **UX / UX Expert Interview** – experience, states, a11y, design system.
8. **Synthesis & Embellishment** – update main story sections with richer content; set status to `Ready for Elaboration` or leave `In Refinement` if major gaps remain.

### How to Run (Warp)

1. Open the **Workflows** palette in Warp.
2. Select: **`Story/Epic: Refinement interviews`**.
3. When prompted, fill in:
   - `kind`:
     - `story` for `docs/stories/...`
     - `epic` for `docs/prd/...`
   - `file`:
     - Example (story): `story-123-wishlist-empty-state.md`
     - Example (epic): `epic-6-wishlist.md`
4. Run the workflow.
5. Follow the printed instructions:
   - Open the resolved file path in your editor.
   - Open `work/workflows/story-refinement.md` alongside it.
   - Let each agent interview you in turn and then synthesize the results into the main story/epic.

---

## 5. PRD Creation (PO + UX interviews)

**Purpose:**

Use just the **Product Owner** and **UX/UX Expert** agents to take a feature idea or short brief and turn it into a **fully fleshed-out PRD** under `docs/prd/`.

**Recommended model in Warp:** `openAI 5.1 codex medium`.

### Files Involved

- **Warp workflow definition**: `.warp/workflows/prd-po-ux-brainstorm.yaml`
- **Checklist / detailed steps**: `work/workflows/prd-po-ux-brainstorm.md`
- **Agent specs**:
  - PO: `work/agents/po.md`
  - UX: `work/agents/ux.md`
  - UX Expert (optional): `work/agents/ux-expert.md`

### What It Does

The Warp workflow:

1. Takes one argument:
   - `file`: PRD markdown file name under `docs/prd/` (e.g. `upload-moc-instructions-prd.md`, `epic-6-wishlist.md`).
2. Resolves the correct path:
   - `docs/prd/<file>`
   - Appends `.md` if omitted.
3. Verifies the file exists.
4. Prints a guide telling you to:
   - Open the target PRD file
   - Open `work/workflows/prd-po-ux-brainstorm.md` as your checklist
   - Run PO and UX interviews to flesh out goals, problem, value, journeys, states, and requirements.

### Stage Overview

The detailed behavior is in `work/workflows/prd-po-ux-brainstorm.md`, but at a high level:

1. **Activation & Inputs** – confirm PRD file, seed idea/brief, and any hard constraints.
2. **PO Interview** – clarify problem, value, scope, success criteria, dependencies.
3. **UX / UX Expert Interview** – define user journeys, key states, a11y expectations, and design-system guidance.
4. **Requirements Synthesis** – turn interview notes into structured functional, non-functional, and UX requirements.
5. **Risks & Next Steps** – capture risks, assumptions, open questions, and propose next steps (e.g., architecture review, mocks).

### How to Run (Warp)

1. Open the **Workflows** palette in Warp.
2. Select: **`PRD: PO + UX brainstorming interviews`**.
3. When prompted, fill in:
   - `file`: PRD markdown file name under `docs/prd/`.
4. Run the workflow.
5. Follow the printed instructions:
   - Open the resolved PRD file in your editor.
   - Open `work/workflows/prd-po-ux-brainstorm.md` alongside it.
   - Let the PO and UX agents interview you, then synthesize their output into a complete PRD.

---

## 6. PRD Completion Review (PO + QA + UX)

**Purpose:**

Evaluate a **completed PRD** against the delivered epics and stories, and decide whether
the overall feature **meets the PRD’s intent** (PASS / FAIL / WAIVED).

**Recommended model in Warp:** `openAI 5.1 codex medium`.

### Files Involved

- **Warp workflow definition**: `.warp/workflows/prd-review.yaml`
- **Checklist / detailed steps**: `work/workflows/prd-review.md`
- **Agent specs**:
  - PO: `work/agents/po.md`
  - QA: `work/agents/qa.md`
  - UX / UX Expert: `work/agents/ux.md`, `work/agents/ux-expert.md`

### What It Does

The Warp workflow:

1. Takes one argument:
   - `file`: PRD markdown file name under `docs/prd/` (e.g. `upload-moc-instructions-prd.md`,
     `epic-6-wishlist.md`).
2. Resolves the correct path:
   - `docs/prd/<file>`
   - Appends `.md` if omitted.
3. Verifies the file exists.
4. Prints a guide telling you to:
   - Open the target PRD file
   - Open `work/workflows/prd-review.md` as your checklist
   - Identify the epics and stories that implement this PRD and list them in the PRD
     under an `Implementation Scope` section.
   - Walk through PO, QA, and UX review stages to produce scores, verdicts, and gaps.

### Stage Overview

The detailed behavior is in `work/workflows/prd-review.md`, but at a high level:

1. **Activation & Inputs** – confirm PRD and implementation scope (epics/stories).
2. **PRD Intent Snapshot (PO)** – summarize goals, FRs, NFRs, UX requirements.
3. **Evidence Collection (QA)** – summarize what each epic/story delivered and how it was
   tested.
4. **PO PRD Review** – PO score, blockers, notes, and PASS/FAIL/WAIVED verdict.
5. **QA PRD Review** – QA score, blockers, notes, and PASS/FAIL verdict.
6. **UX PRD Review** – UX score, blockers, notes, and PASS/FAIL/NA verdict.
7. **Overall PRD Verdict** – combined verdict plus major gaps and follow‑ups.

### How to Run (Warp)

1. Open the **Workflows** palette in Warp.
2. Select: **`PRD: Completion review (PO + QA + UX)`**.
3. When prompted, fill in:
   - `file`: PRD markdown file name under `docs/prd/`.
4. Run the workflow.
5. Follow the printed instructions:
   - Open the resolved PRD file in your editor.
   - Open `work/workflows/prd-review.md` alongside it.
   - Walk through the stages with PO, QA, and UX agents, then record the final PRD
     verdict in the document.

---

## 7. Future Workflows

As we add new workflows, they should be:

- Defined under `.warp/workflows/` as Warp-native workflows.
- Backed by a detailed checklist under `work/workflows/` when they involve multiple roles/gates.
- Documented in this file with:
  - Name & purpose
  - Files involved
  - High-level stage overview
  - How to run (Warp workflow name + arguments)

Planned examples (to be implemented):

- **UX Deep Dive Workflow**
  - Extended UX/a11y review, potentially integrating with Playwright/DevTools.
- **Release/Feature Readiness Workflow**
  - PO + Infra + QA + Dev to decide if a feature is ready to ship.

**Purpose:**

Use all elaboration agents to interview the user and enrich a story/epic with deeper context before formal elaboration or implementation.

**Recommended model in Warp:** `openAI 5.1 codex medium`.

### Files Involved

- **Warp workflow definition**: `.warp/workflows/story-refinement.yaml`
- **Checklist / detailed steps**: `work/workflows/story-refinement.md`
- **Agent specs**:
  - PM/SM: `work/agents/pm.md`
  - PO: `work/agents/po.md`
  - Analyst: `work/agents/analyst.md`
  - Architect: `work/agents/architect.md`
  - Dev: `work/agents/dev.md`
  - QA: `work/agents/qa.md`
  - UX / UX Expert: `work/agents/ux.md`, `work/agents/ux-expert.md`

### What It Does

The Warp workflow:

1. Takes two arguments:
   - `kind`: `story` or `epic`
   - `file`: markdown file name (e.g. `story-123.md`, `epic-6-wishlist.md`)
2. Resolves the correct path:
   - `story` → `docs/stories/<file>`
   - `epic` → `docs/prd/<file>`
   - Appends `.md` if omitted.
3. Verifies the file exists.
4. Prints a guide telling you to:
   - Open the target file
   - Open `work/workflows/story-refinement.md` as your checklist
   - Walk through each agent interview and then synthesize the results into the story/epic.

### Stage Overview

The detailed behavior is in `work/workflows/story-refinement.md`, but at a high level:

1. **Activation & Status** – confirm target, set status to `In Refinement`.
2. **PM/PO Interview** – clarify value, scope, success.
3. **Analyst Interview** – deepen requirements, flows, and edge cases.
4. **Architect Interview** – discuss architecture, boundaries, constraints.
5. **Dev Interview** – cover feasibility, complexity, dependencies.
6. **QA Interview** – testability and risk focus.
7. **UX / UX Expert Interview** – experience, states, a11y, design system.
8. **Synthesis & Embellishment** – update main story sections with richer content; set status to `Ready for Elaboration` or leave `In Refinement` if major gaps remain.

### How to Run (Warp)

1. Open the **Workflows** palette in Warp.
2. Select: **`Story/Epic: Refinement interviews`**.
3. When prompted, fill in:
   - `kind`:
     - `story` for `docs/stories/...`
     - `epic` for `docs/prd/...`
   - `file`:
     - Example (story): `story-123-wishlist-empty-state.md`
     - Example (epic): `epic-6-wishlist.md`
4. Run the workflow.
5. Follow the printed instructions:
   - Open the resolved file path in your editor.
   - Open `work/workflows/story-refinement.md` alongside it.
   - Let each agent interview you in turn and then synthesize the results into the main story/epic.

---

## 5. PRD Creation (PO + UX interviews)

**Purpose:**

Use just the **Product Owner** and **UX/UX Expert** agents to take a feature idea or short brief and turn it into a **fully fleshed-out PRD** under `docs/prd/`.

**Recommended model in Warp:** `openAI 5.1 codex medium`.

### Files Involved

- **Warp workflow definition**: `.warp/workflows/prd-po-ux-brainstorm.yaml`
- **Checklist / detailed steps**: `work/workflows/prd-po-ux-brainstorm.md`
- **Agent specs**:
  - PO: `work/agents/po.md`
  - UX: `work/agents/ux.md`
  - UX Expert (optional): `work/agents/ux-expert.md`

### What It Does

The Warp workflow:

1. Takes one argument:
   - `file`: PRD markdown file name under `docs/prd/` (e.g. `upload-moc-instructions-prd.md`, `epic-6-wishlist.md`).
2. Resolves the correct path:
   - `docs/prd/<file>`
   - Appends `.md` if omitted.
3. Verifies the file exists.
4. Prints a guide telling you to:
   - Open the target PRD file
   - Open `work/workflows/prd-po-ux-brainstorm.md` as your checklist
   - Run PO and UX interviews to flesh out goals, problem, value, journeys, states, and requirements.

### Stage Overview

The detailed behavior is in `work/workflows/prd-po-ux-brainstorm.md`, but at a high level:

1. **Activation & Inputs** – confirm PRD file, seed idea/brief, and any hard constraints.
2. **PO Interview** – clarify problem, value, scope, success criteria, dependencies.
3. **UX / UX Expert Interview** – define user journeys, key states, a11y expectations, and design-system guidance.
4. **Requirements Synthesis** – turn interview notes into structured functional, non-functional, and UX requirements.
5. **Risks & Next Steps** – capture risks, assumptions, open questions, and propose next steps (e.g., architecture review, mocks).

### How to Run (Warp)

1. Open the **Workflows** palette in Warp.
2. Select: **`PRD: PO + UX brainstorming interviews`**.
3. When prompted, fill in:
   - `file`: PRD markdown file name under `docs/prd/`.
4. Run the workflow.
5. Follow the printed instructions:
   - Open the resolved PRD file in your editor.
   - Open `work/workflows/prd-po-ux-brainstorm.md` alongside it.
   - Let the PO and UX agents interview you, then synthesize their output into a complete PRD.

---

## 6. Future Workflows

As we add new workflows, they should be:

- Defined under `.warp/workflows/` as Warp-native workflows.
- Backed by a detailed checklist under `work/workflows/` when they involve multiple roles/gates.
- Documented in this file with:
  - Name & purpose
  - Files involved
  - High-level stage overview
  - How to run (Warp workflow name + arguments)

Planned examples (to be implemented):

- **UX Deep Dive Workflow**
  - Extended UX/a11y review, potentially integrating with Playwright/DevTools.
- **Release/Feature Readiness Workflow**
  - PO + Infra + QA + Dev to decide if a feature is ready to ship.

Use all elaboration agents to interview the user and enrich a story/epic with deeper context before formal elaboration or implementation.

**Recommended model in Warp:** `openAI 5.1 codex medium`.

### Files Involved

- **Warp workflow definition**: `.warp/workflows/story-refinement.yaml`
- **Checklist / detailed steps**: `work/workflows/story-refinement.md`
- **Agent specs**:
  - PM/SM: `work/agents/pm.md`
  - PO: `work/agents/po.md`
  - Analyst: `work/agents/analyst.md`
  - Architect: `work/agents/architect.md`
  - Dev: `work/agents/dev.md`
  - QA: `work/agents/qa.md`
  - UX / UX Expert: `work/agents/ux.md`, `work/agents/ux-expert.md`

### What It Does

The Warp workflow:

1. Takes two arguments:
   - `kind`: `story` or `epic`
   - `file`: markdown file name (e.g. `story-123.md`, `epic-6-wishlist.md`)
2. Resolves the correct path:
   - `story` → `docs/stories/<file>`
   - `epic` → `docs/prd/<file>`
   - Appends `.md` if omitted.
3. Verifies the file exists.
4. Prints a guide telling you to:
   - Open the target file
   - Open `work/workflows/story-refinement.md` as your checklist
   - Walk through each agent interview and then synthesize the results into the story/epic.

### Stage Overview

The detailed behavior is in `work/workflows/story-refinement.md`, but at a high level:

1. **Activation & Status** – confirm target, set status to `In Refinement`.
2. **PM/PO Interview** – clarify value, scope, success.
3. **Analyst Interview** – deepen requirements, flows, and edge cases.
4. **Architect Interview** – discuss architecture, boundaries, constraints.
5. **Dev Interview** – cover feasibility, complexity, dependencies.
6. **QA Interview** – testability and risk focus.
7. **UX / UX Expert Interview** – experience, states, a11y, design system.
8. **Synthesis & Embellishment** – update main story sections with richer content; set status to `Ready for Elaboration` or leave `In Refinement` if major gaps remain.

### How to Run (Warp)

1. Open the **Workflows** palette in Warp.
2. Select: **`Story/Epic: Refinement interviews`**.
3. When prompted, fill in:
   - `kind`:
     - `story` for `docs/stories/...`
     - `epic` for `docs/prd/...`
   - `file`:
     - Example (story): `story-123-wishlist-empty-state.md`
     - Example (epic): `epic-6-wishlist.md`
4. Run the workflow.
5. Follow the printed instructions:
   - Open the resolved file path in your editor.
   - Open `work/workflows/story-refinement.md` alongside it.
   - Let each agent interview you in turn and then synthesize the results into the main story/epic.

---

## 5. Future Workflows

As we add new workflows, they should be:

- Defined under `.warp/workflows/` as Warp-native workflows.
- Backed by a detailed checklist under `work/workflows/` when they involve multiple roles/gates.
- Documented in this file with:
  - Name & purpose
  - Files involved
  - High-level stage overview
  - How to run (Warp workflow name + arguments)

Planned examples (to be implemented):

- **UX Deep Dive Workflow**
  - Extended UX/a11y review, potentially integrating with Playwright/DevTools.
- **Release/Feature Readiness Workflow**
  - PO + Infra + QA + Dev to decide if a feature is ready to ship.
