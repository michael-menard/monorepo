# <Feature Name> Product Requirements Document (PRD)

> Replace angle-bracketed placeholders (`<like this>`) and delete this block when you start.

---

## 1. Overview & Context

### 1.1 Summary

- **Feature name:** `<Feature / epic name>`
- **Owner:** `<Your name / role>`
- **Type:** `<New feature / enhancement / brownfield>`
- **Status:** `Draft`

Short elevator pitch (2–4 sentences) describing **what** this is and **why it matters now**.

### 1.2 Background

- Current state of the product / flow.
- Pain points or gaps this is addressing.
- Any relevant historical context or related initiatives.

---

## 2. Problem Statement

Describe the **core problem** in plain language:

- Who is impacted?
- What are they trying to do today?
- What makes it hard, slow, or risky?
- Why is solving this important now vs later?

---

## 3. Target Users & Value

### 3.1 Target Users

- Primary user(s): `<roles / personas>`
- Secondary user(s): `<if any>`

### 3.2 User Value

- What gets better for these users once this is live?
- How would they describe the benefit in their own words?

### 3.3 Product / Business Value

- How this supports your product vision / strategy.
- How it unblocks or de-risks future work.

---

## 4. Goals, Non‑Goals & Success Criteria

### 4.1 Goals

- G1: `<primary outcome you want>`
- G2: `<secondary outcome>`

### 4.2 Non‑Goals

Explicitly **out of scope** for this PRD (helps prevent scope creep):

- NG1: `<what this PRD will NOT do>`
- NG2: `<another non-goal>`

### 4.3 Success Criteria

Qualitative and/or simple quantitative signals that this was worth building:

- SC1: `<how you’ll know this is working for you/users>`
- SC2: `<support/ops, quality, or UX improvements>`

---

## 5. Requirements

### 5.1 Functional Requirements (FR)

Numbered, user-centered, testable requirements.

- **FR1**: `<As a <user>, I can … so that …>`
- **FR2**: `…`

### 5.2 Non‑Functional Requirements (NFR)

Performance, reliability, security, observability, reuse, etc.

- **NFR1**: `<e.g., page loads under X seconds for Y users>`
- **NFR2**: `<logging / metrics / rate limits / reuse constraints>`

### 5.3 UX Requirements

Requirements that are specifically UX/a11y/interaction focused and testable.

- **UXR1**: `<e.g., all primary actions are accessible via keyboard>`
- **UXR2**: `<e.g., empty/loading/error/success states are explicitly defined and implemented>`

---

## 6. User Experience

### 6.1 UX Principles & Experience Goals

- What should this feature **feel** like to use?
- Any tone / clarity / friction guidelines.

### 6.2 Primary User Journeys

Bullet the key flows step‑by‑step (from entry point to completion). For each main journey:

- Journey A: `<short name>`
  - Step 1: `…`
  - Step 2: `…`

### 6.3 States & Feedback

For key screens or flows, describe:

- Empty state(s)
- Loading state(s)
- Error state(s)
- Success / confirmation state(s)

### 6.4 Accessibility & Inclusivity Notes

- Keyboard navigation expectations.
- Screen reader / announcements.
- Contrast / motion / other a11y concerns.

### 6.5 Design System & Component Guidance

- Which existing components or patterns to reuse.
- Any patterns that should be avoided.

---

## 7. Dependencies & Integration

- Upstream dependencies (other epics, infra work, third‑party services).
- Downstream consumers (features that rely on this one existing).
- Data, auth, or API contracts this relies on.

---

## 8. Risks & Assumptions

### 8.1 Risks

- R1: `<what could go wrong if assumptions are wrong or this is implemented poorly>`
- R2: `<UX / a11y / security / performance risks>`

### 8.2 Assumptions

- A1: `<things you’re assuming are true about users, tech, or org>`
- A2: `…`

---

## 9. Open Questions

List anything that still feels fuzzy or undecided.

- Q1: `<question>`
- Q2: `<question>`

---

## 10. Next Steps

- What you would do **immediately after** this PRD is in a good place:
  - Architecture review?  Dev spike?  UX mocks?  Analytics plan?

---

## Appendix A – PO Interview Notes

Free‑form notes or transcript from the **PO interview** stage of the workflow.

---

## Appendix B – UX / UX Expert Interview Notes

Free‑form notes or transcript from the **UX stage** of the workflow.
