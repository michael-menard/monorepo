---
name: plan-revalidation
description: "Lightweight drift check for refined plans that were blocked or idle. Determines if story generation should proceed, adjust, refresh, or stop."
---

# Skill: Plan Revalidation

## Purpose
Use this skill when a plan was fully refined earlier, then sat blocked or waiting, and now needs a lightweight check before story generation.

This is not full refinement.
It is a drift check.

## Goal
Answer:
- Is this plan still needed?
- Is it already partially or fully implemented?
- Is the approved solution still valid?
- Did blockers or upstream work change assumptions?
- Should story generation proceed, adjust, refresh, or stop?

## When to use
Use when:
- the plan is fully refined
- story generation is about to happen
- the plan was blocked or idle long enough that reality may have changed

Do not use this as a substitute for full refinement.

## Inputs to inspect
Prefer grounding the revalidation against current system reality such as:
- related or completed stories
- related or completed plans
- current codebase
- current schema / contracts
- dependency status
- implementation patterns that now exist

## Checks

### 1. Already implemented?
Look for overlap with:
- shipped stories
- existing code
- existing UI/API behavior

### 2. Approach still valid?
Check whether the original proposed solution still fits:
- schema
- architecture
- boundaries
- current implementation patterns

### 3. Dependencies still support this plan?
Check whether completed blockers materially changed assumptions.

### 4. Scope or intent drifted?
Look for:
- overlap with newer plans
- duplicate functionality
- changed roadmap direction
- partially obsolete solution choices

## Output classifications
Return one of:
- proceed
- proceed_with_adjustments
- needs_refresh
- obsolete_or_merge

## Drift rules

### Minor drift
Examples:
- naming changes
- small schema adjustments
- small flow wording changes
- small dependency ordering changes

Action:
- create a visible revision
- log what changed
- proceed

### Major drift
Examples:
- core flow changed
- architecture assumption invalid
- dependency changed solution shape
- significant overlap with already implemented work

Action:
- do not generate stories
- mark plan as needing refresh
- send back to refinement

## Safety rule
Do not silently rewrite product intent.
Any change, even minor, should be visible and auditable.

## Completion rule
Revalidation is complete when it has produced a grounded recommendation about whether the plan should proceed to story generation right now.
