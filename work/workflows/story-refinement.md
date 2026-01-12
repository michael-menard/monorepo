# Story/Epic Refinement Workflow (Multi-Agent Interviews)

## Purpose

Help refine a **story or epic** by having each elaboration agent interview the user in turn, collect richer context, and then **embellish the story/epic document** with the new information.

**Recommended LLM model when running this workflow in Warp:** `openAI 5.1 codex medium` (or equivalent multi-role, reasoning-focused model).

Agents involved (same cast as elaboration):
- PM/PO (`work/agents/pm.md`, `work/agents/po.md`)
- Analyst (`work/agents/analyst.md`)
- Architect (`work/agents/architect.md`)
- Dev (`work/agents/dev.md`)
- QA (`work/agents/qa.md`)
- UX / UX Expert (`work/agents/ux.md`, `work/agents/ux-expert.md`)

This is primarily a **refinement** workflow; it does not attempt to fully gate the story, but it should leave it in a much clearer state, ready for elaboration and/or implementation.

---

## Stage 0 – Activation & Status: "In Refinement"

### Goal

Confirm target story/epic and mark it as being actively refined.

### Steps

1. Confirm inputs:
   - `kind`: `story` or `epic`.
   - `file`: markdown under `docs/stories/` or `docs/prd/`.
2. Open the target markdown file.
3. Update or add a visible status field:
   - Set status to **"In Refinement"** (e.g., `Status: In Refinement` or `## Status` section = `In Refinement`).
4. Briefly summarize the current story/epic back to the user to align on the starting point.

---

## Stage 1 – PM/PO Interview (Product & Value)

### Goal

Clarify goals, scope, and "what good looks like" **for you personally**, since this is a solo project without external stakeholders.

### Steps

1. As PM/PO, conduct an interview with the user. Focus questions on:
   - What pain or annoyance this is solving for you.
   - How you imagine using this when it exists (day‑in‑the‑life scenarios).
   - What would make you say "this was worth building" (simple, qualitative success criteria rather than metrics).
   - Scope boundaries (what you explicitly do *not* want to build right now).
2. Ask questions one at a time, allowing the user to respond.
3. Capture responses in the story/epic under a `pm-po-interview` section, grouped by theme:
   - Personal value & outcomes.
   - Scope & boundaries.
   - "Good enough" / success criteria for you.

---

## Stage 2 – Analyst Interview (Requirements & Flows)

### Goal

Deepen understanding of problem space, flows, and edge cases.

### Steps

1. As Analyst, ask follow-up questions that build on PM/PO answers:
   - Primary user and system flows (happy paths).
   - Important variants and edge cases.
   - Error paths and recovery expectations.
   - Non-functional requirements that may not be fully specified.
2. Ask questions sequentially, adjusting based on user answers.
3. Record answers in an `analyst-interview` section, e.g.:
   - `Primary Flows`
   - `Edge Cases`
   - `Error Handling`
   - `Open Questions`

---

## Stage 3 – Architect Interview (Architecture & Boundaries)

### Goal

Understand architectural expectations, constraints, and boundaries.

### Steps

1. As Architect, ask about:
   - Existing systems or modules this should integrate with.
   - Data ownership and boundaries (which service or domain owns what).
   - Constraints (scalability, data residency, isolation, etc.).
   - Reuse of existing patterns vs appetite for new structures.
2. Capture answers in an `architect-interview` section, including:
   - `Target Architecture / Modules`
   - `Data & Boundaries`
   - `Constraints & NFRs`

---

## Stage 4 – Dev Interview (Feasibility & Implementation Concerns)

### Goal

Surface implementation-level questions early: complexity, risks, dependencies.

### Steps

1. As Dev, ask about:
   - Complexity expectations (MVP vs robust solution).
   - Technical tradeoffs the user is willing to make.
   - Dependencies on other stories, teams, or systems.
   - Areas where maintainability or extensibility is especially important.
2. Capture answers in a `dev-interview` section, grouped by:
   - `Complexity & Scope`
   - `Dependencies`
   - `Technical Preferences`
   - `Risks`

---

## Stage 5 – QA Interview (Testability & Risk)

### Goal

Clarify how this should be tested and what risks worry the user most.

### Steps

1. As QA, ask about:
   - Critical behaviors that must never break.
   - How the team will know if this is working in production.
   - Tolerance for bugs in non-critical areas.
   - Any compliance, security, or data integrity concerns.
2. Record answers in a `qa-interview` section, including:
   - `Critical Behaviors`
   - `Risk Areas`
   - `Test Expectations`

---

## Stage 6 – UX / UX Expert Interview (Experience & A11y)

### Goal

Understand UX expectations, a11y needs, and content/design constraints.

### Steps

1. As UX/UX Expert, ask about:
   - Desired user experience (tone, pacing, discoverability).
   - Key states: empty, loading, error, success.
   - Accessibility expectations (keyboard navigation, screen readers, contrast, etc.).
   - Design-system constraints (must-use components, forbidden patterns).
2. Capture answers in a `ux-interview` section, e.g.:
   - `User Journeys`
   - `States & Feedback`
   - `Accessibility`
   - `Design System Notes`

---

## Stage 7 – Synthesis & Story/Epic Embellishment

### Goal

Combine all interview results into an improved, embellished story/epic document.

### Steps

1. Read through all interview sections:
   - `pm-po-interview`
   - `analyst-interview`
   - `architect-interview`
   - `dev-interview`
   - `qa-interview`
   - `ux-interview`
2. Update the **main body** of the story/epic (not just the interview sections) to reflect the refined understanding:
   - Improve the **problem statement**.
   - Clarify and expand **acceptance criteria** (ACs).
   - Add or refine **flows/scenarios** and **edge cases**.
   - Note **architecture and NFRs** where relevant.
   - Add brief **testing expectations** and **UX/a11y notes**.
3. Ensure that the story remains readable and not overloaded:
   - Keep interview sections as reference, but the top-level sections (Story, ACs, Flows, etc.) should be understandable on their own.
4. Optionally, add a short `refinement-summary` section summarizing:
   - What changed in the story/epic.
   - Remaining unknowns or explicit TODOs.

### Status After Refinement

After synthesis, you can:
- Set the status to **"Ready for Elaboration"** if the story is now well-shaped but still needs formal gating.
- Or leave as **"In Refinement"** if there are major open questions that still need work.

Update the visible status field accordingly.

---

## Usage Pattern in Warp

1. Use the **Story/Epic Refinement** Warp workflow (e.g. `.warp/workflows/story-refinement.yaml`) to select a **story or epic**.
2. Open the target file and this checklist (`work/workflows/story-refinement.md`).
3. Walk through each agent interview in order, capturing answers in their respective `*-interview` sections.
4. In the Synthesis stage, update the main story/epic content and adjust the status to reflect its new level of readiness.