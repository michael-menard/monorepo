---
name: plan-refinement
description: "Transform an approved plan into a fully refined planning object with complete flows, gap analysis, and story decomposition guidance."
---

# Skill: Plan Refinement

## Purpose
Use this skill to transform an approved, actionable plan into a **fully refined planning object** capable of generating thin vertical slice stories for a smaller code model.

This is the heavy-thinking phase.

## Goal
Spend premium reasoning here so that downstream execution is cheap and deterministic.

## Preconditions
Only run full refinement when:
- the plan is approved
- the plan is actionable
- blockers are complete

Do not spend heavy refinement tokens on blocked plans.

## Responsibilities
Refinement owns:
- flow extraction and normalization
- flow coverage review
- gap analysis
- acceptance criteria strengthening
- definition of done clarity
- risk surfacing
- decomposition into thin vertical slices
- subtask generation
- dependency graph generation
- story readiness testing against a smaller model

## Required outputs
A fully refined plan should include:
- problem statement
- proposed solution
- scope / out of scope / deferred
- minimum path
- approved user flows
- acceptance criteria
- definition of done
- constraints
- dependencies
- warnings and open questions
- story generation guidance
- story decomposition model

## Workflow

### 1. Normalize the plan
Ensure the plan has consistent structure and language.

### 2. Extract flows
Flows may be:
- user-provided
- inferred
- merged

Each flow should track:
- source
- confidence
- status

### 3. Run coverage review
Check whether all expected flows are represented.

Examples:
- management flows missing update/delete
- save without view/use
- upload without validation/failure handling
- async action without retry/status path

### 4. Run gap analysis
Find:
- missing requirements
- forgotten features
- contradictions
- hidden dependencies
- missing states
- missing role/permission handling

### 5. Iterate (bounded)
Loop:
- identify gaps
- revise plan/flows
- retest

Use a hard cap on iterations.
Do not allow infinite refinement loops.

### 6. Human review
Surface flows and major changes for human review.
The reviewer can approve, reject, or correct the plan direction.

### 7. Final validation
After human review, validate only.
No major rewrites should happen here.

### 8. Story readiness check
Use a smaller or constrained model to test whether the refined output is actually understandable.

The smaller model should be able to:
- summarize the feature
- explain the minimum path
- identify the flows
- understand scope boundaries
- derive implementation intent without inventing behavior

If the smaller model hallucinates or misses critical information, refinement is not done.

## Story decomposition rules
Generate stories that are:
- thin vertical slices
- independently deployable
- independently testable
- customer-valuable

Default slicing strategy:
- one meaningful flow step per story, when possible

Generate subtasks automatically, but ensure they support the vertical slice rather than splitting the work into disconnected layered tasks.

## Completion rule
Refinement is complete when:
- the minimum path is clear
- flow coverage is sufficient
- no critical gaps remain
- the smaller-model readiness check passes
- stories can be materialized without additional interpretation work
