---
name: story-generation-from-refined-plan
description: "Materialize stories from a fully refined plan as thin vertical slices with dependency graphs and subtasks ready for local model execution."
---

# Skill: Story Generation from Refined Plan

## Purpose
Use this skill to materialize stories from a fully refined plan.

This is not a thinking-heavy phase.
The heavy cognition has already happened in refinement.

## Goal
Generate a story graph that a smaller local code model can execute with minimal ambiguity.

## Preconditions
Only generate stories when:
- the plan is fully refined
- the plan is approved
- blockers are complete
- revalidation has passed if required

## Story principles
Every generated story should be:
- a thin vertical slice
- independently deployable
- independently testable
- customer-valuable

A story is not just a technical task.
It should represent a meaningful unit of user value.

## Slicing rules
Default behavior:
- generate one story per meaningful flow step when that step still delivers value

If a step is too large:
- split it into smaller vertical slices

Avoid generating stories that are only:
- backend shell work
- frontend shell work
- tests later
unless that isolated work still provides real user value

## Required story fields
Populate the existing story model with high-quality inputs, including:
- title
- description
- related plan link(s)
- blockers upstream/downstream
- in-scope / out-of-scope
- acceptance criteria
- risk
- status
- tags
- code snippets / implementation hints when available

Prefer adding or preserving:
- parent flow reference
- flow step reference
- minimum path marker
- revision/source metadata

## Subtasks
Generate subtasks automatically.
Subtasks should:
- help a smaller model execute in sequence
- support the vertical slice
- avoid collapsing back into disconnected layered tasks

## Dependency graph
Wire dependencies so that:
- minimum path stories are clear
- downstream stories do not run too early
- parallelizable work can be identified safely

## Output quality bar
A generated story should let a smaller local model answer:
- what behavior am I implementing?
- why does it matter?
- what is in and out of scope?
- what dependencies must already be true?
- what does done look like?

If the answer to those questions is not obvious from the story, story generation quality is too weak.

## Completion rule
Story generation is complete when the refined plan has been converted into a coherent dependency-linked story graph with subtasks that are ready for execution by the downstream coding system.
