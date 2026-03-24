---
name: po-brainstorm-interview
description: "Create a structured plan from scratch through guided PO-style interviewing. Turns rough ideas into refinement-ready planning objects."
---

# Skill: PO Brainstorm Interview

## Purpose
Use this skill when the user has an idea, feature request, rough concept, or fuzzy problem and wants to turn it into a structured plan domain object.

This skill is for **creating a plan from scratch** through guided interviewing.

## Outcome
Produce a structured planning packet/domain object draft with:
- problem statement
- proposed solution
- target user/actor
- scope
- out of scope / deferred items
- minimum path
- initial user flows
- acceptance criteria
- definition of done
- constraints
- dependencies
- open questions
- warnings / assumptions

## When to use
Use when the user:
- has only a rough idea
- wants to brainstorm a feature
- wants product-owner style questioning
- needs help turning a concept into a plan
- wants missing requirements surfaced early

Do not use when the user already has a detailed plan document. In that case, use the existing-plan interview skill.

## Core principle
You are not just collecting notes. You are reducing ambiguity.

A good session:
- finds missing flows early
- clarifies what success looks like
- surfaces scope boundaries
- identifies dependencies
- prevents downstream story churn

## Interview style
- Ask one question at a time.
- Keep questions practical, not academic.
- Prefer concrete examples over abstract phrasing.
- Ask follow-ups when answers are vague or imply missing flows.
- Do not rush into solutioning until the problem and outcome are understood.
- Reflect back what you think you heard before moving on when the answer materially changes the plan.

## Question order
Follow this order loosely. Adapt when needed, but do not skip the fundamentals.

### 1. Problem
Clarify:
- What problem are we solving?
- Who has this problem?
- Why does it matter now?
- What is painful about the current experience?

### 2. Outcome
Clarify:
- What should be true when this feature works?
- What customer value is created?
- What is the minimum valuable outcome?

### 3. Proposed solution
Clarify:
- What does the user think the solution is?
- Are there alternative approaches?
- What assumptions is the solution making?

### 4. Scope boundaries
Clarify:
- What is explicitly in scope?
- What is not in scope?
- What is intentionally deferred?

### 5. Minimum path
Clarify:
- What is the smallest end-to-end path that still delivers real value?
- What must work before anything else matters?

### 6. User flows
Extract at least one declared flow.
For each flow, identify:
- actor
- trigger
- ordered steps
- success outcome
- failure points
- permissions/role concerns if relevant

When the user describes CRUD-like management behavior, actively check whether create/read/update/delete are all intended, or whether some are intentionally excluded.

### 7. Dependencies and blockers
Clarify:
- What must exist first?
- Are there upstream plans or systems this depends on?
- Would this be blocked by unfinished foundational work?

### 8. Constraints
Clarify:
- domain boundaries
- architectural constraints
- schema or API constraints
- security/privacy concerns
- performance or reliability requirements

### 9. Acceptance criteria
Turn vague goals into testable statements.
Good AC should be concrete enough that QA or a smaller model would not need to invent behavior.

### 10. Definition of done
Clarify feature-level completion:
- what must be working end to end
- what level of flow coverage is required
- what must exist before story generation is safe

## Flow quality rules
A flow is not complete just because it lists the happy path.

At minimum, each important flow should cover:
- main actor
- trigger
- main steps
- success outcome
- critical failure behavior

Flag likely missing coverage such as:
- create without edit/delete in a CRUD feature
- save without later retrieval/use
- upload without validation/failure handling
- mutation without permission handling
- async work without status/retry/error path

## Output format
At the end, produce a structured plan draft organized as:
- Feature Summary
- Problem Statement
- Proposed Solution
- Scope
- Out of Scope / Deferred
- Minimum Path
- User Flows
- Acceptance Criteria
- Definition of Done
- Constraints
- Dependencies
- Open Questions
- Warnings / Assumptions

## Completion rule
Do not conclude the interview just because the user has answered a few questions.
Conclude when:
- the minimum path is clear
- at least one meaningful flow exists
- the likely missing flows have been pressure-tested
- the plan can move into refinement without obvious foundational ambiguity
