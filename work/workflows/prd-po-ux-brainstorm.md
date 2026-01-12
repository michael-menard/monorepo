# PRD Creation Workflow (PO + UX Interviews)

## Purpose

Guide the creation of a **fully fleshed-out PRD** for a single feature/epic by:
- Using only the **Product Owner (PO)** and **UX/UX Expert** agents from the elaboration cast
- Running focused **brainstorming/interview sessions**
- Synthesizing the results into a PRD document under `docs/prd/`

This workflow assumes you already have **at least a feature idea or short brief** (e.g., a line item in the backlog or a short description in a doc).

---

## Agents Involved

- **PO Agent** – `work/agents/po.md`
- **UX Agent** – `work/agents/ux.md`
- **UX Expert Agent (optional, deeper dive)** – `work/agents/ux-expert.md`

You can treat the UX and UX Expert specs as a single "UX specialist" role; use the Expert spec when you want deeper IA/a11y coverage.

---

## Stage 0 – Activation & Inputs

### Goal

Confirm the target feature/epic, the PRD file you are shaping, and the initial seed of the idea.

### Steps

1. Confirm:
   - Target PRD file path under `docs/prd/` (e.g., `upload-moc-instructions-prd.md`, `epic-6-wishlist.md`).
   - The seed input: existing brief, backlog item, or 2–3 sentence description.
2. Open the target PRD markdown file.
3. If it is mostly empty, add a minimal skeleton:
   - Title
   - Short one-paragraph **idea summary**
   - Placeholder sections you typically use for PRDs (Goals, Problem, Users, Requirements, UX, Risks, etc.).
4. Briefly restate the idea back to the user and confirm any **hard constraints** (timeline, scope, tech, dependencies).

---

## Stage 1 – PO Interview (Value, Scope, Outcomes)

### Goal

Have the PO agent interview you to clarify **why** this feature exists, what success looks like, and what is explicitly in or out of scope.

### Interview Focus & Style

The PO agent should **not** read a fixed script. Instead, treat the bullets below as a
question bank and:

- Skim the existing PRD content and any prior answers before asking new questions.
- Start with the 1–2 questions that would most reduce uncertainty.
- Ask follow‑up questions to clarify vague answers ("can you give a concrete example?",
  "what would that look like in the UI?", "what would make this feel wrong to you?").
- Rephrase and reflect back what you heard ("so it sounds like the real pain is X; did I
  get that right?") and adjust your next question based on the confirmation.
- Skip questions that are already clearly answered in the doc or earlier discussion.

Use that adaptive style to explore:

- **Problem & motivation**
  - What pain or friction is this feature solving for you?
  - What currently happens instead; how do you work around it today?
- **User and business value**
  - Who benefits most from this feature (which users, which flows)?
  - What will be meaningfully better once this exists?
- **Scope & boundaries**
  - What *must* be in the first version vs. can wait?
  - What is explicitly **out of scope** for this PRD?
- **Success criteria & non-goals**
  - How will you know, qualitatively, that this was worth building?
  - What tradeoffs are acceptable (e.g., manual steps, missing automation)?
- **Dependencies & sequencing**
  - Does this depend on other epics or infrastructure work?
  - Does it unlock or de-risk future work you care about?

### Documentation in PRD

Capture the results in clearly labeled sections in the PRD, for example:

- `## Goals`
- `## Problem Statement`
- `## Target Users and Value`
- `## In Scope`
- `## Out of Scope`
- `## Success Criteria`
- `## Dependencies & Sequencing`

The PO agent should propose **crisp bullets and short paragraphs**, not long essays.

---

## Stage 2 – UX / UX Expert Interview (Experience & Journeys)

### Goal

Have the UX specialist interview you to define **how the feature should feel and behave** from a user perspective, without over-specifying implementation.

### Interview Focus & Style

The UX specialist should also avoid a rigid script. Use the bullets below as a menu and:

- Look at the current PRD sections and any wireframe/idea notes first.
- Ask the **most relevant** question for the current level of clarity, not every question
  in order.
- Drill into anything hand‑wavy ("smooth onboarding", "better empty state") with
  follow‑ups like "what does that actually look like on screen?" or "how would a new user
  know what to do next?".
- When answers conflict or seem too broad, propose 2–3 concrete options and ask which is
  closest to what you want.
- Periodically summarize a journey or state back to the user ("let me play this back:
  entry via X, then Y, then Z; is anything missing?") and refine based on corrections.

Within that adaptive style, make sure you eventually cover:

- **Primary journeys**
  - What is the main task flow this feature supports? (Walk through it step by step.)
  - What entry points exist (navigation, deep links, empty states)?
- **Key states & feedback**
  - What should users see in **empty**, **loading**, **error**, and **success** states?
  - What feedback is needed to make users feel confident about outcomes?
- **Information architecture & navigation**
  - Where does this feature live in the overall app structure?
  - How do users get back to where they came from?
- **Accessibility & constraints**
  - Any specific a11y expectations beyond the default (keyboard flows, announcements, etc.)?
  - Content or language constraints (tone, terminology, localization)?
- **Design system alignment**
  - Which existing components or patterns should be reused?
  - Any patterns you explicitly want to avoid?

### Documentation in PRD

Summarize the answers into UX-focused sections, for example:

- `## UX Principles & Experience Goals`
- `## Primary User Journeys`
- `## States & Feedback (empty, loading, error, success)`
- `## Accessibility & Inclusivity Notes`
- `## Design System & Component Guidance`

These sections should be specific enough that Dev and QA **do not have to guess** about core flows and states.

---

## Stage 3 – Requirements Synthesis (PO + UX)

### Goal

Turn interview notes into a **coherent PRD** with requirements that are testable, designable, and implementable.

### Steps

1. Read through the PO and UX interview sections.
2. Synthesize them into structured requirements, for example:
   - **Functional Requirements (FR)** – numbered list, each phrased in user-centered, testable terms.
   - **Non-Functional Requirements (NFR)** – performance, security, a11y, observability, reuse constraints.
   - **Compatibility / Integration Requirements** – how this interacts with existing systems.
3. Ensure each major goal from Stage 1 is reflected in at least one FR and one success metric.
4. For UX input, ensure each primary journey and key state has at least:
   - A short description under journeys/states
   - At least one FR that makes it implementable
5. Create or refine sections like:
   - `## Functional Requirements`
   - `## Non-Functional Requirements`
   - `## UX Requirements`
   - `## Open Questions`

Keep interview sections (`po-interview`, `ux-interview`) in the PRD as an **appendix/reference**, but make sure the main PRD can be read on its own.

---

## Stage 4 – Risks, Open Questions, and Next Steps

### Goal

Capture known **risks**, **assumptions**, and **open questions** so the PRD is honest about uncertainty.

### Steps

1. With the PO mindset, list:
   - Product/portfolio risks
   - Dependencies or sequencing risks
   - "If we ship this as written and are wrong, what goes wrong?"
2. With the UX mindset, list:
   - UX/a11y risks and edge cases you are not fully confident about
   - Places where you would ideally run usability tests or A/B experiments
3. Record them in sections like:
   - `## Risks`
   - `## Assumptions`
   - `## Open Questions`
4. Add a short `## Next Steps` section that suggests:
   - Whether this PRD is **ready for elaboration/implementation**
   - Follow-up work (e.g., architecture review, analytics planning, UX mocks)

---

## Usage Pattern in Warp

1. Run the dedicated **PRD PO+UX workflow** from Warp (see `.warp/workflows/prd-po-ux-brainstorm.yaml`).
2. When prompted, point it at the target PRD file in `docs/prd/`.
3. Open:
   - The PRD file you are shaping
   - This checklist (`work/workflows/prd-po-ux-brainstorm.md`)
   - The relevant agent specs (`work/agents/po.md`, `work/agents/ux.md`, optionally `work/agents/ux-expert.md`)
4. Let the PO and UX agents interview you in turn, then synthesize into a **self-contained PRD**.
