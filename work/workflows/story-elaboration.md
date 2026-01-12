# Story Elaboration Workflow

## Purpose

Guide a single story from rough idea to "READY_TO_WORK" using the existing BMad-style gates and your role specs. This workflow lives entirely in Warp (`work/agents` + `work/workflows`), but it mirrors the Analyst → Architect → Dev flow from the BMAD orchestrator.

**Recommended LLM model when running this workflow in Warp:** `openAI 5.1 codex medium` (or equivalent code-focused model).

## When to Use

Use this workflow any time you have:
- A new story in `docs/stories` that needs elaboration, **or**
- An existing story that feels fuzzy on requirements, architecture, or feasibility.

It assumes the broader PRD/epic/architecture context lives in:
- PRD shards: `docs/prd/`
- Architecture shards: `docs/architecture/`
- Stories: `docs/stories/`

## Inputs

Minimal inputs to start:
- Target story file path (e.g., `docs/stories/story-123.md`)
- Related epic/PRD references (if known)
- Any open questions or constraints you already know about

## Outputs

By the end of the workflow, you should have for the target story:
- Updated story doc with:
  - Clear problem statement and primary user flows
  - Concrete, testable ACs
  - Explicit edge cases and error paths
- A **gate/decision** per role:
  - `Analyst` gate: problem/requirements clarity
  - `Architect` gate: architecture/boundaries/NFRs
  - `Dev` gate: feasibility, complexity, and implementation readiness
- Scores + blockers for each role (per the agent specs)
- A single-sentence **risk_summary** per role

---

## Stage 1 – PM/PO Story Definition

**Primary agents:** `PM/SM` (`work/agents/pm.md`), `PO` (`work/agents/po.md`)

### Goal

Ensure the story is clearly defined, aligned with product goals, and small enough to be a meaningful, vertical slice before any architecture or dev planning work.

### Steps

1. Load context:
   - Story file in `docs/stories`
   - Relevant PRD/epic shards in `docs/prd/`
2. As PM/PO, focus on:
   - Requirements quality & clarity
   - Alignment & traceability to epic/PRD and OKRs
   - Scope & slicing (vertical, sprint-sized)
   - Value & outcomes
3. Refine or add to the story:
   - User value statement
   - Clear, testable ACs (Given–When–Then or equivalent)
   - Any explicit dependencies and risks
4. Apply the **PM/SM** and **PO** scoring models from `work/agents/pm.md` and `work/agents/po.md`:
   - Compute `raw_score` for each role using their weighted dimensions
   - Apply relevant blockers (P1–P7 and O1–O6)
   - Set final PM and PO scores and blockers
5. Record outputs in the story (e.g., under a `pm-po-review` section):
   - `score_pm`, `score_po`
   - `blockers_pm`, `blockers_po`
   - `notes`
   - `risk_summary`
   - `recommendations` (immediate vs future)

### Gate

- If PM/PO gate is effectively `BLOCKED` (e.g., conflicting requirements, missing core flows, no success criteria), **stop here** until resolved.
- Otherwise, mark the planning gate as **READY_FOR_ARCHITECT**.

---

## Stage 2 – Architect Elaboration

**Primary agent:** `Architect` (`work/agents/architect.md`)

### Goal

Validate that the story fits the current architecture, respects boundaries, and considers cross-cutting concerns (auth, logging, observability, NFRs).

### Steps

1. Load context:
   - Story (including `pm-po-review` section)
   - Architecture docs in `docs/architecture/`
2. As Architect, focus on:
   - Architectural fit & cohesion
   - Cross-cutting concerns (auth, validation, logging, observability)
   - Scalability & performance
   - Security & data integrity
   - Evolvability & simplicity
3. Identify and document for this story:
   - Which modules/services/functions are likely involved
   - Key data flows and boundaries it will cross
   - Any cross-cutting mechanisms it should reuse (auth, validation, logging, metrics)
4. Capture explicit notes in the story:
   - Recommended module/service boundaries
   - Any new interfaces/contracts/APIs required
   - NFR expectations (latency, throughput, security, a11y where relevant)
5. Apply the **Architect scoring model** from `work/agents/architect.md`:
   - Compute `raw_score` from the weighted dimensions
   - Apply any blockers (A1–A5)
   - Set `final Architect score` and `blockers`
6. Record outputs in the story under an `architect-review` section:
   - `score`
   - `blockers`
   - `notes`
   - `risk_summary`
   - `recommendations` (immediate vs future)

### Gate

- If architecture blockers (A1–A4 especially) are present such that the gate must be `BLOCKED`, **stop here** and send the story back to PM/PO.
- Otherwise, mark the Architect gate as **READY_FOR_INFRA**.

---

## Stage 3 – Infra / DevOps Architecture & Operations Review

**Primary agent:** `Infra` (`work/agents/infra.md`)

### Goal

Evaluate infrastructure and platform implications of the story, ensuring security, reliability, observability, and cost posture are acceptable.

### Steps

1. Load context:
   - Story (including `pm-po-review` and `architect-review` sections)
   - Relevant infra/ops docs (e.g., infra architecture, monitoring, deployment strategy) if available.
2. As Infra, focus on:
   - Architecture & consistency with existing platform patterns (networking, IAM, data stores).
   - Security & compliance (least privilege, encryption, boundaries).
   - Reliability & resilience (redundancy, failover, backups as appropriate).
   - Observability & operations (metrics, logs, alerts, runbooks).
   - Cost & efficiency (no obvious unbounded cost risks).
3. Identify any infra changes or new resources the story will likely require:
   - New or modified infrastructure components (Lambdas, queues, topics, buckets, etc.).
   - Monitoring / alerting additions.
   - Deployment or rollback considerations.
4. Capture explicit notes in the story in an `infra-review` section:
   - Key infra decisions or expectations.
   - Any required infra work items (can reference future tasks or stories).
5. Apply the **Infra scoring model** from `work/agents/infra.md`:
   - Compute `raw_score` from the weighted dimensions.
   - Apply blockers I1–I5 as appropriate.
   - Set `final Infra score` and `blockers`.

### Gate

- If Infra blockers (especially I1/I2/I3/I4) force the gate to `BLOCKED`, send the story back to Architect/Dev for adjustment.
- Otherwise, mark the Infra gate as **READY_FOR_DEV**.

---

## Stage 4 – Dev Feasibility & Implementation Readiness

**Primary agent:** `Dev` (`work/agents/dev.md`)

### Goal

Confirm that the story is **implementable as a reasonable slice** with clear mapping to components/modules, and that it meets your quality/test expectations before coding starts.

### Steps

1. Load context:
   - Story (including `pm-po-review` and `architect-review` sections)
   - Coding standards / tech stack docs (`docs/architecture/coding-standards.md`, `tech-stack.md`, `source-tree.md` if present)
2. As Dev, focus on:
   - Code quality & readability implications
   - Design & architectural fit (using Architect’s guidance)
   - Test coverage expectations (unit, integration, e2e)
   - Operational & NFR considerations
   - Implementation hygiene (lint, types, local consistency)
3. For this story, sketch (at least at a high level):
   - Expected code changes by module/component
   - Expected **code paths** and branches per AC (happy paths, edge cases, error conditions) so each can be covered by at least one unit test.
   - Testing strategy per AC (unit/integration/e2e, plus regression expectations)
   - Any obvious risks or fragile areas
4. Update the story doc with a `dev-plan` or `implementation-notes` section containing:
   - High-level implementation approach
   - A **test plan** that:
     - Maps ACs and expected code paths to unit tests (Vitest)
     - Identifies where integration tests are needed (cross-boundary behavior)
     - Identifies which user flows should be covered by Playwright/E2E tests
   - Any assumptions or TODOs
5. Apply the **Dev scoring model** from `work/agents/dev.md`:
   - Compute `raw_score` from the weighted dimensions
   - Apply blockers (D1–D6), especially around missing tests and architecture violations
   - Set `final Dev score` and `blockers`
6. Record outputs in the story under `dev-review`:
   - `score`
   - `blockers`
   - `notes`
   - `risk_summary`
   - `recommendations` (immediate vs future)

### Gate

- If Dev sees D1/D2/D3-type blockers or 3+ blockers total, the story is **NOT READY** for implementation.
- Otherwise, mark the Dev gate as **READY_FOR_QA**.

---

## Stage 5 – QA Test Design & Risk Assessment

**Primary agent:** `QA` (`work/agents/qa.md`)

### Goal

Design a credible, layered test strategy for the story (unit, integration, e2e), with AC → test traceability and explicit risk coverage before implementation begins.

### Steps

1. Load context:
   - Story (including `pm-po-review`, `architect-review`, and `dev-review` / `dev-plan` sections)
2. As QA, focus on:
   - AC traceability and testability
   - Coverage & depth across unit/integration/e2e
   - Regression protection for touched areas
   - NFR, security, and performance risks
3. For each AC, define:
   - Expected test types (unit/integration/e2e)
   - Whether a regression test is needed (for bugfix/behavior change)
4. Ensure the test plan is **thorough by design**:
   - Every expected **code path** and branch identified in `dev-plan` has at least one planned unit test (Vitest).
   - Every reasonable **user flow / journey** that will matter in practice has at least one planned Playwright/E2E test.
   - Integration tests are planned for all behavior that crosses system or service boundaries.
5. Update or add a `qa-plan` section in the story containing:
   - AC → test mapping (can be a simple list/table in markdown)
   - Explicit mapping from expected code paths to unit tests
   - Planned regression tests
   - Identified high-risk areas and how they’ll be covered
6. Apply the **QA scoring model** from `work/agents/qa.md`:
   - Compute `raw_score` from the weighted dimensions
   - Apply blockers Q1–Q11 where applicable
   - Set `final QA score` and `blockers`
6. Record outputs in the story under `qa-review`:
   - `score`
   - `blockers`
   - `notes`
   - `risk_summary`
   - `recommendations` (immediate vs future)

### Gate

- If any AC is untestable or unplanned (Q1/Q2/Q3/Q4, etc.), the QA gate is **BLOCKED** and the story must be refined.
- Otherwise, mark the QA gate as **READY_FOR_UX**.

---

## Stage 6 – UX Review & Experience Design Hooks

**Primary agents:** `UX` (`work/agents/ux.md`), `UX Expert` (`work/agents/ux-expert.md`)

### Goal

Ensure the story’s flows are usable, accessible, and aligned with the design system, and that there is enough UX specification for implementation.

### Steps

1. Load context:
   - Story (including `pm-po-review`, `architect-review`, `dev-plan`, and `qa-plan`)
2. As UX/UX Expert, focus on:
   - Usability & flow quality for the main user journeys
   - Information architecture & content clarity
   - Accessibility (keyboard, contrast, semantics) and inclusivity
   - Design system & visual consistency
   - Implementation readiness of UX specs
3. For this story, capture in a `ux-plan` or `ux-review` section:
   - Primary **user journeys/flows** (end‑to‑end scenarios a real user will follow)
   - Primary screens/states for those flows (happy path, loading, error, empty)
   - Any UX/a11y constraints or guidelines (e.g. focus order, ARIA usage)
   - Design-system components to use (not bespoke UI)
   - Links to external design artifacts (Figma, Storybook) if available
4. Where possible, annotate user journeys/flows in a way that can be directly reused by QA and Dev when designing Playwright/E2E tests (e.g. step lists or Given–When–Then style flows).
4. Apply the **UX Expert** scoring model from `work/agents/ux-expert.md` (or simpler UX rubric if preferred):
   - Compute `raw_score` from the weighted dimensions
   - Apply blockers U1–U6 where relevant
   - Set `final UX score` and `blockers`
5. Record outputs in the story under `ux-review`:
   - `score`
   - `blockers`
   - `notes`
   - `risk_summary`
   - `recommendations` (immediate vs future)

### Gate

- If there are critical usability/a11y issues (U1/U2) or the UX spec is not implementation-ready (U5), the UX gate is **BLOCKED**.
- Otherwise, mark the UX gate as **READY_TO_WORK**.
- In addition to the gate, **update the story/epic status in the document**:
  - If the overall elaboration passes (UX gate not BLOCKED), set status to **"Ready to Work"**.
  - If the elaboration does not pass (any blocking gate remains), set status to **"Blocked - Needs Refinement"**.
  - Update the visible status field(s) in the markdown (e.g., `Status:` line or `## Status` section) to reflect this.

---

## Usage Pattern in Warp

1. Open the relevant story file in your editor.
2. Open this workflow file (`work/workflows/story-elaboration.md`) as your checklist.
3. Move through **Stage 1 → Stage 2 → Stage 3 → Stage 4 → Stage 5 → Stage 6**, updating the story document and agent review sections as you go.
4. When UX marks the story as **READY_TO_WORK**, hand off to implementation and execution of tests as designed.
