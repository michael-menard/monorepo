---
name: grill-me-plan
description: 'Codebase-aware design interview that builds a structured plan from scratch. Combines PO-style requirement gathering with relentless design-tree interrogation. Provides recommended answers, resolves decision dependencies, and explores the codebase to ground every decision in reality.'
---

# Skill: Grill Me Plan

## Usage

```
/grill-me-plan                    # Start interview from scratch — user describes the idea
/grill-me-plan <plan-slug>        # Load plan from KB and interview against it
```

## Purpose

Use this skill when the user has an idea, feature request, or rough concept and wants it turned into a structured, implementation-ready plan through rigorous questioning.

This skill combines two approaches:

- **PO-style requirement gathering** — builds up a structured plan with problem statement, scope, flows, acceptance criteria, and definition of done
- **Design-tree interrogation** — challenges every decision, provides recommendations, resolves dependencies, and grounds answers in the actual codebase

## When to use

Use when the user:

- has a rough idea and wants it turned into a plan
- wants product-owner style questioning with engineering rigor
- wants recommended answers grounded in the codebase
- needs dependencies between decisions surfaced and resolved
- wants missing requirements, flows, and edge cases surfaced early

## Inputs

| Argument  | Required | Description                                                                                                                                                                |
| --------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| plan-slug | no       | If provided, fetch the plan from KB via `kb_get_plan` and use its content as starting context. Interview focuses on gaps, implicit assumptions, and under-specified areas. |
| (none)    | ---      | If no slug provided, ask the user to describe their idea.                                                                                                                  |

## Startup behavior

### With a plan slug

1. Call `kb_get_plan` with the provided slug to fetch the plan content.
2. Read the plan thoroughly — understand the goals, architecture, decisions, and scope.
3. Summarize what the plan proposes, then immediately start challenging the first unresolved or under-specified area.
4. Do not re-ask questions the plan already answers clearly. Focus on gaps.

### Without a plan slug

1. Ask the user to describe their idea in a sentence or two.
2. Begin the interview from the problem statement.

## Core principles

### You are resolving a design tree, not collecting notes

Each decision may depend on or constrain other decisions. Walk down each branch, resolve dependencies one by one, and do not move on until the current branch is settled.

### Self-service first

If a question can be answered by exploring the codebase, **explore the codebase instead of asking the user**. Read files, check schemas, inspect routes, review existing patterns. Only ask the user when:

- The answer requires a product/business decision
- The answer is a preference or priority call
- The information does not exist in the code

### Provide recommendations

For every question you ask, provide your recommended answer with rationale. The user should be able to say "agreed" and move on. Make it easy to make decisions quickly.

Format:

```
**Decision:** [what needs to be decided]
**Why it matters:** [consequence of getting this wrong]
**Options:**
  A) ... — [trade-off]
  B) ... — [trade-off]
**Recommendation:** [your pick and why]
```

### Track decisions

Keep a running mental model of resolved decisions. Reference prior decisions when they constrain current options. If a new answer contradicts an earlier decision, surface the conflict immediately.

## Interview style

- One question (or tightly coupled pair) per turn.
- State what decision is being made and why it matters.
- Show options with trade-offs.
- Give your recommendation.
- Wait for the user's response before moving on.
- Ask follow-ups when answers are vague or imply missing flows.
- Reflect back what you heard when an answer materially changes the plan.

## Question order

Follow this order. Adapt when needed, but do not skip the fundamentals.

### 1. Problem & Outcome

Clarify:

- What problem are we solving?
- Who has this problem?
- Why does it matter now?
- What should be true when this feature works?
- What is the minimum valuable outcome?

### 2. Proposed Solution

Clarify:

- What does the user think the solution is?
- What assumptions is the solution making?
- **Explore the codebase** to verify those assumptions

### 3. Scope Boundaries

Clarify:

- What is explicitly in scope?
- What is not in scope?
- What is intentionally deferred?
- Recommend deferrals for anything that isn't core to the minimum path

### 4. Minimum Path

Clarify:

- What is the smallest end-to-end path that delivers real value?
- What must work before anything else matters?

### 5. Data & Architecture

**Explore the codebase** to answer as much as possible before asking:

- Where does this run? (runtime, infrastructure)
- How does data flow? (inputs, transformations, outputs, storage)
- What exists already? (schemas, endpoints, components, patterns to reuse)
- What needs to change? (API additions, schema changes, new tables, new packages)
- What are the integration points? (other services, external APIs, databases)

### 6. User Flows

Extract at least one declared flow. For each flow, identify:

- actor
- trigger
- ordered steps
- success outcome
- failure points

When the user describes CRUD-like behavior, actively check whether create/read/update/delete are all intended.

Flag likely missing coverage:

- create without edit/delete
- save without later retrieval/use
- upload without validation/failure handling
- mutation without permission handling
- async work without status/retry/error path

### 7. Dependencies & Constraints

Clarify and resolve:

- What must exist first?
- Are there upstream plans or systems this depends on?
- Domain boundaries, schema constraints, API constraints
- Security/privacy concerns
- Performance or reliability requirements

When a decision depends on another, resolve the upstream decision first, then return.

### 8. Edge Cases & Error Handling

Challenge:

- What happens when this fails?
- What happens with empty/null data?
- What happens at scale?
- What happens on re-run / idempotency?

### 9. Acceptance Criteria

Turn vague goals into testable statements. Good AC should be concrete enough that QA or a developer would not need to invent behavior.

### 10. Definition of Done

Clarify feature-level completion:

- What must be working end to end?
- What level of test coverage is required?
- What must exist before this can ship?

## Completion rule

Do not conclude the interview just because many questions have been asked.

Conclude when:

- Every branch of the design tree has been walked to a leaf decision
- Dependencies between decisions are resolved
- The minimum path is clear
- At least one meaningful user flow exists with failure coverage
- The plan could be handed to an implementer without ambiguity

## Output

At the end, produce a structured plan organized as:

```markdown
# [Feature Name]

## Feature Summary

[1-2 sentence summary]

## Problem Statement

[What problem, who has it, why now]

## Proposed Solution

[Concrete approach, grounded in codebase exploration]

## Scope

### In Scope

- ...

### Out of Scope / Deferred

- ...

## Minimum Path

[Smallest end-to-end slice that delivers value]

## Data & Architecture

[Schema changes, API changes, data flow — referencing existing files/patterns]

## User Flows

### Flow 1: [Name]

- **Actor:** ...
- **Trigger:** ...
- **Steps:** ...
- **Success:** ...
- **Failure:** ...

## Resolved Decisions

| #   | Decision | Resolution | Rationale |
| --- | -------- | ---------- | --------- |
| 1   | ...      | ...        | ...       |

## Acceptance Criteria

- [ ] ...

## Definition of Done

- [ ] ...

## Constraints

- ...

## Dependencies

- ...

## Open Questions

- ...

## Warnings / Assumptions

- ...
```

If the plan should be persisted to the KB, offer to write it via `kb_upsert_plan`.
