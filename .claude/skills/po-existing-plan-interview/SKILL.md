---
name: po-existing-plan-interview
description: "Review and strengthen an existing plan through structured PO-style questioning. Finds gaps, missing flows, and weak AC before refinement."
---

# Skill: PO Existing Plan Interview

## Purpose
Use this skill when the user already has a plan and wants to turn it into a stronger, refinement-ready planning object through structured review and questioning.

This skill starts from an **existing plan** rather than from a blank slate.

## Outcome
Produce a reviewed and strengthened plan with:
- normalized problem statement
- clarified proposed solution
- explicit scope boundaries
- extracted or corrected user flows
- improved acceptance criteria
- minimum path
- dependencies
- risks, warnings, and open questions
- a clear recommendation: refine now, revise first, or block pending dependencies

## When to use
Use when the user:
- uploads or pastes a plan
- wants to validate a draft plan
- wants PO-style questioning against an existing proposal
- needs help finding missing requirements before refinement

Do not use when the user only has a fuzzy idea. Use the brainstorm interview skill for that.

## Core principle
Treat the plan as a draft to be challenged, not trusted blindly.

Your job is to identify:
- gaps
- implied but missing flows
- missing scope boundaries
- weak or non-testable acceptance criteria
- dependency risks
- places where the plan is too abstract for reliable downstream story generation

## Interview style
- Start by summarizing the plan in plain language.
- Ask one question at a time.
- Ask targeted questions based on what is missing or inconsistent.
- Prefer identifying the most important ambiguity first.
- Do not ask generic questions the plan already answers.

## Review process

### 1. Normalize the draft
Extract or confirm:
- feature summary
- problem statement
- proposed solution
- target actor
- scope
- constraints
- dependencies

### 2. Evaluate scope boundaries
Look for:
- fuzzy in-scope language
- missing non-goals
- features implied but not explicitly included or excluded

### 3. Extract and test flows
If flows are missing, derive draft flows from the plan.
If flows are present, pressure-test them.

Check for:
- missing CRUD coverage when management is implied
- missing success path
- missing failure path
- missing downstream use after creation
- permissions and role assumptions
- data mutation/update behavior

### 4. Pressure-test the minimum path
Ask:
- What is the smallest valuable end-to-end path?
- Does the current plan actually support it?
- Are the required flows present?

### 5. Evaluate acceptance criteria
Flag AC that is:
- vague
- non-testable
- missing edge-case behavior
- disconnected from flows

### 6. Evaluate dependencies
Ask:
- Is this plan actionable now?
- What upstream work must be complete first?
- Would refining this now be wasted if blockers change?

### 7. Determine readiness
Classify the plan as one of:
- ready for refinement
- revise before refinement
- blocked pending dependencies

## Coverage rules
When the plan promises a capability, that capability must be represented in the flow set or explicitly excluded.

Examples:
- "manage X" should trigger CRUD coverage questions
- "upload and save" should prompt questions about validation, retry, and viewing/using the saved artifact
- "private gallery" should prompt visibility and permission questions

## Output format
Return:
- Normalized Plan Summary
- Missing or Weak Areas
- Extracted / Revised User Flows
- Revised Acceptance Criteria
- Dependencies / Blockers
- Open Questions
- Recommendation:
  - refine now
  - revise first
  - blocked

## Completion rule
Stop when the plan has been either:
- made refinement-ready
- or clearly diagnosed as needing revision/blocker resolution first
