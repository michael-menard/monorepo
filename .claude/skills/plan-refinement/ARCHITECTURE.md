# PLAN.md — Autonomous Plan Refinement & Story Generation System

## Overview

This system transforms high-level feature ideas into **fully refined, executable story graphs** using a multi-agent workflow.

Core principle:

> **Spend heavy tokens upfront to eliminate ambiguity → produce thin, deterministic vertical slices → execute with smaller local models**

---

## Goals

* Capture missing requirements **early**
* Ensure **full flow coverage**
* Eliminate ambiguity before implementation
* Generate **independently deployable, testable vertical slices**
* Enable execution by **local 14b models**
* Continuously improve via **retro + knowledge base**

---

## System Architecture

### Phases

1. **Intake**
2. **Refinement (Heavy / Multi-agent)**
3. **Approval**
4. **Revalidation (Conditional)**
5. **Story Generation**
6. **Execution**
7. **Retro + Learning**

---

## Core Domain Model

### Plan

* id
* title
* summary
* problem_statement
* proposed_solution
* scope:

  * in_scope
  * out_of_scope
  * deferred
* minimum_path
* acceptance_criteria
* definition_of_done
* constraints
* dependencies
* flows[]
* warnings[]
* open_questions[]
* approval_status (approved | unapproved)
* lifecycle_status
* is_blocked (bool)
* was_blocked_after_refinement (bool)
* revision_history

---

### Flow

* id
* name
* actor
* trigger
* steps[]
* success_outcome
* failure_conditions
* source (user | inferred | merged)
* confidence
* status (approved | unconfirmed | rejected | deferred)

---

### Flow Step

* id
* description
* success_state
* failure_state
* edge_cases

---

### Story

* id
* title
* description
* parent_plan_id
* parent_flow_id
* flow_step_reference
* dependencies (upstream/downstream)
* in_scope
* out_of_scope
* acceptance_criteria
* risk
* subtasks[]
* tags
* code_snippets
* minimum_path (bool)

---

## Lifecycle States

### Lifecycle Status

* draft
* blocked
* queued_for_refinement
* refining
* fully_refined
* needs_refresh
* ready_for_story_generation
* story_generation_in_progress
* stories_generated

### Approval Status

* unapproved
* approved

---

## Workflow

### 1. Intake

Sources:

* brainstorm session
* imported plan

Outputs:

* draft plan object
* dependencies captured

Rules:

* no heavy processing
* minimal structure required

---

### 2. Approval

Action:

* user approves plan

Effect:

* enters refinement queue

Unapproval:

* removes from queue
* resets plan to draft
* cascades to dependent plans

---

### 3. Refinement (LangGraph Flow)

Triggered when:

* approved
* not blocked

Includes:

#### a. Normalization

* standardize structure
* extract initial flows

#### b. Flow Extraction

* generate flows (if missing)
* tag:

  * source
  * confidence

#### c. Gap + Coverage Loop (Bounded)

Agents:

* coverage agent (ensures full flow representation)
* gap agents (find missing requirements)
* specialist agents (UX, QA, security, etc.)
* reconciliation agent

Focus:

* missing flows (CRUD, etc.)
* missing states (success/failure)
* hidden dependencies
* contradictions

Loop:

* add provisional flows
* revise plan
* repeat (bounded iterations)

---

#### d. Flow Review (Human)

User (you):

* reviews flows via dashboard
* approves / edits / rejects / defers

---

#### e. Final Validation

Agents:

* validate only (no major rewrites)

Checks:

* completeness
* consistency
* no critical blockers

---

#### f. Story Readiness Check (Small Model)

Test:

* can a small model understand the plan without guessing?

Failure:

* return to refinement

---

### Output:

➡️ `fully_refined`

---

### 4. Post-Refinement Transition

If:

* not blocked → `ready_for_story_generation`

If:

* blocked → wait + mark for revalidation

---

## 5. Revalidation (Just-in-Time)

Triggered when:

* plan was blocked after refinement
* user initiates story generation

Purpose:

> ensure plan is still valid given current system state

---

### Inputs:

* completed stories
* codebase
* schema/contracts
* dependency plans
* similar features

---

### Checks:

1. Already implemented?
2. Approach still valid?
3. Dependencies unchanged?
4. Scope still relevant?

---

### Outcomes:

* proceed
* proceed_with_adjustments
* needs_refresh
* obsolete

---

### Drift Handling

#### Minor Drift

* auto-update plan
* log revision
* proceed

#### Major Drift

* mark `needs_refresh`
* re-enter refinement

---

## 6. Story Generation

Triggered via LangGraph

Rules:

* generate **thin vertical slices**
* each story must:

  * be independently deployable
  * be testable
  * deliver user value

---

### Slicing Strategy

* default: **one story per meaningful flow step**
* must still deliver value
* may combine steps if needed

---

### Output:

* stories
* subtasks
* dependency graph

---

## 7. Subtasks

Generated automatically

Purpose:

* guide local model execution

Rules:

* support vertical slice (not layered tasks)
* represent implementation sequence

---

## 8. Execution

Handled by:

* local LLM (14b)

Inputs:

* structured story
* subtasks
* constraints

---

## 9. Retro + Learning

Captures:

* flow quality
* missed requirements
* story churn
* split effectiveness

Feeds:

* knowledge base
* improves:

  * flow extraction
  * coverage detection
  * slicing heuristics

---

## User Flows

### Flow 1 — Brainstorm Plan

1. User initiates brainstorming session
2. System captures problem and solution
3. System generates initial flows
4. Plan saved as draft

---

### Flow 2 — Import Plan

1. User uploads plan
2. System normalizes structure
3. System extracts flows (inferred)
4. Plan saved as draft

---

### Flow 3 — Approve Plan

1. User reviews plan
2. User checks approval
3. Plan enters refinement queue

---

### Flow 4 — Refinement

1. Plan enters LangGraph
2. Flows extracted and expanded
3. Gap/coverage loop runs
4. User reviews flows
5. Final validation
6. Plan marked fully refined

---

### Flow 5 — Generate Stories

1. User triggers generation
2. System checks:

   * was plan blocked?
3. If yes → run revalidation
4. If valid → generate stories

---

### Flow 6 — Revalidation

1. Compare plan vs current system
2. Detect drift
3. Classify drift
4. Decide:

   * proceed
   * refresh
   * obsolete

---

### Flow 7 — Execution

1. Local model receives story
2. Executes subtasks
3. Produces implementation

---

### Flow 8 — Retro

1. After implementation
2. Analyze:

   * quality
   * gaps
3. Store in knowledge base

---

## Key Design Principles

* **Front-load intelligence**
* **Flows drive completeness**
* **Coverage over creativity**
* **Autonomy with guardrails**
* **Bounded iteration**
* **Human approval at key points**
* **Revalidate before execution**
* **Learn from every run**

---

## Summary

This system transforms:

> vague ideas → structured plans → validated flows → thin executable slices

It ensures:

* fewer missed requirements
* less rework
* deterministic execution
* scalable AI-assisted development

---
