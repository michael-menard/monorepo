---
name: grill-me-code
description: 'Relentless design interview for coding plans. Walks every branch of the design tree, resolves dependencies between decisions, explores the codebase to answer its own questions, and provides recommended answers.'
---

# Skill: Grill Me (Code)

## Usage

```
/grill-me-code                    # Start interview from scratch — user describes the plan
/grill-me-code <plan-slug>        # Load plan from KB and interview against it
```

## Purpose

Use this skill when the user has a coding plan, feature design, or technical architecture and wants every aspect interrogated until a shared understanding is reached.

This skill is for **coding-specific plans** where the codebase is relevant context.

## When to use

Use when the user:

- has a technical plan or feature design to pressure-test
- wants to validate architectural decisions against the existing codebase
- needs dependencies between design decisions surfaced and resolved
- wants recommended answers grounded in what the code actually does today

Do not use for non-technical plans (process, workflow, organizational). Use `/grill-me` instead.

## Inputs

| Argument  | Required | Description                                                                                                                                                                       |
| --------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| plan-slug | no       | If provided, fetch the plan from KB via `kb_get_plan` and use its content as the starting context. Interview focuses on validating, challenging, and deepening the existing plan. |
| (none)    | —        | If no slug provided, ask the user to describe what they want to build.                                                                                                            |

## Startup behavior

### With a plan slug

1. Call `kb_get_plan` with the provided slug to fetch the plan content.
2. Read the plan thoroughly — understand the architecture, decisions, phases, and scope.
3. Begin the interview by summarizing what the plan proposes, then immediately start challenging the first unresolved or under-specified area.
4. Do not re-ask questions that the plan already answers clearly. Focus on gaps, implicit assumptions, and areas where the codebase may have diverged from the plan's assumptions.

### Without a plan slug

1. Ask the user what they want to build.
2. Begin the interview from the highest-level architectural decisions.

## Core principle

You are not collecting answers. You are resolving a design tree.

Each design decision may depend on or constrain other decisions. Walk down each branch, resolve dependencies one by one, and do not move on until the current branch is settled.

## Interview style

### Self-service first

If a question can be answered by exploring the codebase, **explore the codebase instead of asking the user**. Read files, check schemas, inspect routes, review existing patterns. Only ask the user when:

- The answer requires a product/business decision
- The answer is a preference or priority call
- The information does not exist in the code

### Provide recommendations

For every question you ask, provide your recommended answer with rationale. The user should be able to say "agreed" and move on. Make it easy to make decisions quickly.

### One decision at a time

- Present one question per turn (or a tightly coupled pair).
- State what decision is being made and why it matters.
- Show the options with trade-offs.
- Give your recommendation.
- Wait for the user's response before moving on.

### Track decisions

Keep a running mental model of resolved decisions. Reference prior decisions when they constrain current options. If a new answer contradicts an earlier decision, surface the conflict immediately.

## Question strategy

### Walk the design tree

Start from the highest-level architectural decisions and work down:

1. **Where does this run?** (runtime, infrastructure, deployment)
2. **How does data flow?** (inputs, transformations, outputs, storage)
3. **What exists already?** (explore codebase for reusable patterns, existing schemas, endpoints)
4. **What needs to change?** (API additions, schema changes, new packages)
5. **What are the integration points?** (other services, external APIs, databases)
6. **What are the edge cases?** (error handling, retry logic, idempotency)
7. **How is it tested?** (unit, integration, E2E strategy)
8. **How is it operated?** (monitoring, notifications, scheduling)

### Resolve dependencies

When a decision depends on another:

- Identify the dependency explicitly
- Resolve the upstream decision first
- Then return to the dependent decision with the constraint applied

### Challenge assumptions

- If the user assumes something exists, verify it in the code
- If the user proposes a pattern, check if the codebase uses a different one
- If the user skips a concern, raise it

## Completion rule

Do not conclude the interview just because many questions have been asked.

Conclude when:

- Every branch of the design tree has been walked to a leaf decision
- Dependencies between decisions are resolved
- The plan could be handed to an implementer without ambiguity
- Edge cases and error handling have been addressed

## Output

At the end, summarize all decisions in a concise table or list. If the plan should be persisted (e.g., to the KB), offer to write it.
