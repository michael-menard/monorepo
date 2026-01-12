# PRD Completion Review Workflow (PO + QA + UX)

## Purpose

Evaluate a **completed PRD** after its associated epics and stories are done, and decide
whether the **delivered work matches what was asked**.

Use this when:

- The PRD has been implemented via one or more epics and stories.
- Those epics/stories have gone through implementation and QA.
- You want a **PO/QA/UX verdict**: PASS / FAIL (or WAIVED) for the PRD as a whole.

This is a **review/traceability workflow**, not an implementation workflow.

---

## Agents Involved

- **PO Agent** – `work/agents/po.md`
- **QA Agent** – `work/agents/qa.md`
- **UX / UX Expert Agent** – `work/agents/ux.md`, `work/agents/ux-expert.md`
- (Optional) **Architect / Dev** – for deeper NFR / technical coverage

You can run these sequentially or focus on PO + QA, with UX as an optional deep dive.

---

## Stage 0 – Activation & Inputs

### Goal

Confirm the PRD under review and the set of epics/stories that are supposed to deliver it.

### Steps

1. Confirm the **target PRD file** under `docs/prd/`.
2. Identify the **epics and stories** that implement this PRD. Sources might include:
   - Links within the PRD itself
   - Backlog entries (e.g., a section listing epics/stories)
   - Naming conventions (e.g., `epic-6-*`, stories tagged with this PRD)
3. Make a short list inside the PRD under `## Implementation Scope` (if not present):
   - `Epics:` bullet list with file names / IDs
   - `Stories:` bullet list with file names / IDs
4. Verify that each listed epic/story is:
   - Marked as implemented / DONE / Ready to Ship in its own gates
   - Has QA review and test coverage recorded (where applicable)

---

## Stage 1 – Extract PRD Intent (PO Lens)

### Goal

Summarize **what the PRD actually asked for** so you can compare it to what shipped.

### Steps

1. From the PRD, pull out and (optionally) restate:
   - **Goals** and **Non‑Goals**
   - Key **Functional Requirements (FR)**
   - Key **Non‑Functional Requirements (NFR)**
   - Critical **UX requirements / experience goals**
2. Create or refine a section in the PRD:
   - `## PRD Review – Intent Snapshot`
3. Under that section, capture:
   - `Goals (from PRD)` – numbered list, as‑written but tightened if needed
   - `Key FRs` – 5–15 bullets covering the essence of what should exist
   - `Key NFRs` – performance, reliability, security, observability, reuse, etc.
   - `Key UX/Accessibility Expectations`
4. Keep this section **as close to the original PRD** as possible; do not quietly
   lower the bar here.

---

## Stage 2 – Evidence Collection Across Epics/Stories (QA Lens)

### Goal

Understand **what actually shipped** across all epics and stories and how it was tested.

### Steps

1. For each epic/story listed in `Implementation Scope`:
   - Skim its final state: gates, QA review, dev notes, UX review (if present).
   - Note:
     - What user‑facing behavior it delivered.
     - Any explicit **de‑scopes or compromises** documented.
     - QA results: test types, coverage notes, major risks.
2. In the PRD, add a subsection under `## PRD Review – Evidence`:
   - `### Implemented Epics & Stories`
   - For each epic/story, add bullets like:
     - `- Epic 6 – Wishlist: delivered X, Y; left out Z (per QA/Dev notes); QA score ~N.`
3. Pay special attention to:
   - Features that were cut or changed during implementation.
   - NFRs that were deferred.
   - UX requirements that were changed or simplified.

You are not judging yet; this is **evidence gathering**.

---

## Stage 3 – PO PRD Review (Value & Scope)

### Goal

From the PO perspective, decide whether the **delivered backlog** fulfills the PRD’s
intent and whether any gaps are acceptable.

### Steps

1. Using the **PO agent spec (`work/agents/po.md`)** and the intent snapshot:
   - Evaluate **Strategic Alignment** – is what shipped still aligned with why this PRD
     existed?
   - Check **Backlog Integrity** – do the set of epics/stories cover the PRD, or are
     there obvious gaps/overlaps?
   - Assess **Acceptance & Definition of Done** – did the epics/stories have clear PO
     acceptance conditions and were they actually met?
   - Assess **Value & Outcome Clarity** – does what shipped plausibly deliver the value
     the PRD promised?
2. Capture a `### PO PRD Review` subsection under `## PRD Review`:
   - `po_score`: 1–100 using the PO scoring rubric
   - `po_blockers`: bullets derived from applicable PO blocker rules (O1–O6)
   - `po_notes`: 2–4 short bullets summarizing major observations (e.g., scope trimmed,
     value mostly intact; or misaligned feature shipped).
3. Decide and record a **PO verdict** for the PRD:
   - `PO_verdict: PASS` (meets intent with acceptable compromises)
   - `PO_verdict: FAIL` (meaningful goals/requirements not met)
   - Optionally `WAIVED` with justification if gaps are consciously accepted.

---

## Stage 4 – QA PRD Review (Quality & Coverage)

### Goal

From the QA perspective, decide whether the aggregate implementation **safely covers**
what the PRD required.

### Steps

1. Using the **QA agent spec (`work/agents/qa.md`)** and evidence from Stage 2:
   - Check that each **key FR** from the PRD has:
     - At least one associated epic/story
     - At least one associated test path (unit, integration, E2E where appropriate)
   - Identify FRs that are only partially covered or effectively untested.
   - Look at NFRs (performance, reliability, security) and whether they were addressed
     anywhere.
2. In the PRD `## PRD Review` section, add `### QA PRD Review`:
   - `qa_score`: 1–100 aggregated across the PRD (not per story)
   - `qa_blockers`: list of blocking findings referencing QA blocker rules (Qx) where
     appropriate
   - `qa_notes`: 2–4 bullets about test depth, risk areas, and regression posture.
3. Decide and record a **QA verdict** for the PRD:
   - `QA_verdict: PASS` – coverage is adequate; risks are understood and acceptable.
   - `QA_verdict: FAIL` – important FRs not tested, NFR risks unaddressed, or major QA
     blockers.

---

## Stage 5 – UX PRD Review (Experience & A11y)

### Goal

From the UX perspective, decide whether the **shipped experience matches the PRD’s UX
intent** and is acceptable for production.

### Steps

1. Using the **UX / UX Expert specs** and the PRD’s UX sections:
   - Compare the **intended journeys and states** to what actually shipped (via epics,
     stories, and, if you want, live UI or E2E tests).
   - Evaluate **accessibility** and design‑system alignment for the flows this PRD
     introduced or changed.
2. In the PRD `## PRD Review` section, add `### UX PRD Review`:
   - `ux_score`: 1–100
   - `ux_blockers`: list of major UX/a11y issues (U1–U6 style)
   - `ux_notes`: 2–4 bullets focusing on journeys, states, and a11y.
3. Decide and record a **UX verdict** for the PRD:
   - `UX_verdict: PASS` – experience broadly matches intent and meets bar.
   - `UX_verdict: FAIL` – core journeys or a11y are not acceptable vs what PRD asked.

(If UX wasn’t a big part of this PRD, you can mark this section as **Not Applicable** but
still briefly state why.)

---

## Stage 6 – PRD Verdict & Traceability Summary

### Goal

Combine PO, QA, and UX views into a **single PRD‑level verdict** and capture a short,
readable summary.

### Steps

1. Under `## PRD Review`, add a final subsection:
   - `### Overall PRD Verdict`
2. Capture:
   - `overall_verdict: PASS | FAIL | WAIVED`
   - `summary:` 2–3 sentences summarizing whether the product you have matches the PRD’s
     intent.
   - `major_gaps:` bullet list of the top 3–5 gaps or deviations (if any).
   - `followups:` concrete next steps (e.g., additional story to close a gap, UX polish,
     NFR hardening).
3. Optionally, maintain a **lightweight traceability list**:
   - For each **Goal** or key FR in the PRD, list:
     - Implementing epics/stories
     - References to tests or QA sections
   - This does not need to be a full matrix; a small list is enough to understand
     coverage.

---

## Usage Pattern in Warp

1. Run the **PRD completion review** workflow from Warp (see
   `.warp/workflows/prd-review.yaml`).
2. When prompted, point it at the target PRD file in `docs/prd/`.
3. Open:
   - The PRD file
   - This checklist (`work/workflows/prd-review.md`)
   - Relevant epic/story docs and their QA/Dev/UX review sections
4. Walk through stages 0–6, letting PO, QA, and UX agents take turns where indicated.
5. At the end, ensure `## PRD Review` in the PRD contains:
   - Intent snapshot
   - Evidence summary
   - PO / QA / UX scores and verdicts
   - Overall PRD verdict and follow‑ups.
