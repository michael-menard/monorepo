---
name: grill-me
description: 'Relentless design interview for non-coding plans. Walks every branch of the design tree, resolves dependencies between decisions, and provides recommended answers.'
---

# Skill: Grill Me

## Usage

```
/grill-me                         # Start interview from scratch — user describes the plan
/grill-me <plan-slug>             # Load plan from KB and interview against it
```

## Purpose

Use this skill when the user has a plan, process, or design (non-coding) and wants every aspect interrogated until a shared understanding is reached.

This skill is for **non-coding plans** — workflows, processes, organizational decisions, product strategy, or anything that does not require codebase exploration.

## When to use

Use when the user:

- has a plan or process to pressure-test
- wants to validate decisions and surface blind spots
- needs dependencies between decisions surfaced and resolved
- wants recommended answers for each question

For coding-specific plans where the codebase matters, use `/grill-me-code` instead.

## Inputs

| Argument  | Required | Description                                                                                                                                                                       |
| --------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| plan-slug | no       | If provided, fetch the plan from KB via `kb_get_plan` and use its content as the starting context. Interview focuses on validating, challenging, and deepening the existing plan. |
| (none)    | —        | If no slug provided, ask the user to describe their plan.                                                                                                                         |

## Startup behavior

### With a plan slug

1. Call `kb_get_plan` with the provided slug to fetch the plan content.
2. Read the plan thoroughly — understand the goals, process, decisions, and scope.
3. Begin the interview by summarizing what the plan proposes, then immediately start challenging the first unresolved or under-specified area.
4. Do not re-ask questions that the plan already answers clearly. Focus on gaps, implicit assumptions, and unstated dependencies.

### Without a plan slug

1. Ask the user what they want to plan.
2. Begin the interview from the highest-level decisions.

## Core principle

You are not collecting answers. You are resolving a design tree.

Each decision may depend on or constrain other decisions. Walk down each branch, resolve dependencies one by one, and do not move on until the current branch is settled.

## Interview style

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

Start from the highest-level decisions and work down:

1. **What is the goal?** (desired outcome, success criteria)
2. **Who is involved?** (actors, stakeholders, responsibilities)
3. **What is the process?** (steps, sequence, triggers)
4. **What are the inputs and outputs?** (data, artifacts, deliverables)
5. **What are the decision points?** (branching logic, approvals, gates)
6. **What are the failure modes?** (what can go wrong, recovery paths)
7. **What are the constraints?** (time, budget, dependencies, policies)
8. **How is success measured?** (metrics, validation, feedback loops)

### Resolve dependencies

When a decision depends on another:

- Identify the dependency explicitly
- Resolve the upstream decision first
- Then return to the dependent decision with the constraint applied

### Challenge assumptions

- If the user assumes something is true, ask for evidence
- If the user proposes a step, ask what happens when it fails
- If the user skips a concern, raise it

## Completion rule

Do not conclude the interview just because many questions have been asked.

Conclude when:

- Every branch of the design tree has been walked to a leaf decision
- Dependencies between decisions are resolved
- The plan could be handed to someone for execution without ambiguity
- Failure modes and recovery paths have been addressed

## Output

At the end, summarize all decisions in a concise table or list. If the plan should be persisted (e.g., to the KB), offer to write it.
