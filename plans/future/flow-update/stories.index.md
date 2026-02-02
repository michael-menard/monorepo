---
doc_type: stories_index
title: "FLOW Stories Index"
status: active
story_prefix: "FLOW"
created_at: "2026-02-01T12:50:00Z"
updated_at: "2026-02-01T12:50:00Z"
---

# FLOW Stories Index

All stories in this epic use the `FLOW-XXX` naming convention (starting at 001).

## Progress Summary

| Status | Count |
|--------|-------|
| completed | 0 |
| generated | 22 |
| in-progress | 0 |
| pending | 22 |

---

## Ready to Start

Stories with all dependencies satisfied (can be worked in parallel):

| Story | Feature | Blocked By |
|-------|---------|------------|
| FLOW-001 | Audit Existing Dev/Review/QA Infrastructure | — |

---

## FLOW-001: Audit Existing Dev/Review/QA Infrastructure

**Status:** pending
**Depends On:** none
**Phase:** 0 (Audit & Analysis)
**Feature:** Inventory all commands and agents for dev implementation, code review, and QA verification
**Endpoints:** —
**Infrastructure:** —
**Goal:** Document current command/agent architecture, identify duplication, and highlight token-risk hotspots
**Risk Notes:** Must accurately capture all existing agents and their responsibilities. Incomplete audit leads to missed optimizations.

---

## FLOW-002: Propose Refactored Command/Agent Architecture

**Status:** pending
**Depends On:** FLOW-001
**Phase:** 0 (Audit & Analysis)
**Feature:** Design new phase-leader architecture with BEFORE/AFTER diagrams and migration plan
**Endpoints:** —
**Infrastructure:** —
**Goal:** Provide clear redesign proposal with token savings rationale and step-by-step migration plan
**Risk Notes:** Architecture decisions here affect all downstream stories. Needs careful validation.

---

## FLOW-003: Create Knowledge Context Loader

**Status:** pending
**Depends On:** FLOW-002
**Phase:** 1 (Shared Infrastructure)
**Feature:** Implement reusable load-knowledge-context node for lessons learned and ADR integration
**Endpoints:** —
**Infrastructure:** —
**Goal:** Create deterministic knowledge loader that queries KB and ADR-LOG.md based on story scope
**Risk Notes:** Must handle KB unavailability gracefully without blocking workflow

---

## FLOW-004: Define Evidence Bundle Schema (EVIDENCE.yaml)

**Status:** pending
**Depends On:** FLOW-002
**Phase:** 1 (Shared Infrastructure)
**Feature:** Create EVIDENCE.yaml schema as single source of truth for implementation artifacts
**Endpoints:** —
**Infrastructure:** —
**Goal:** Define structured artifact for acceptance criteria evidence, touched files, commands run, and endpoints exercised
**Risk Notes:** Schema must be comprehensive yet concise to avoid token bloat

---

## FLOW-005: Define Checkpoint and Scope Schemas

**Status:** pending
**Depends On:** FLOW-002
**Phase:** 1 (Shared Infrastructure)
**Feature:** Create CHECKPOINT.yaml and SCOPE.yaml schemas for phase tracking and scope analysis
**Endpoints:** —
**Infrastructure:** —
**Goal:** Enable deterministic resume capabilities and diff-aware agent selection
**Risk Notes:** Checkpoint schema must support iteration counters and resume hints

---

## FLOW-006: Define Plan, Review, and QA Schemas

**Status:** pending
**Depends On:** FLOW-002
**Phase:** 1 (Shared Infrastructure)
**Feature:** Create PLAN.yaml, REVIEW.yaml, and QA-VERIFY.yaml schemas for phase outputs
**Endpoints:** —
**Infrastructure:** —
**Goal:** Define structured phase outputs that minimize token consumption in downstream phases
**Risk Notes:** Schemas must be diff-friendly and human-readable

---

## FLOW-007: Implement Dev Setup Leader

**Status:** pending
**Depends On:** FLOW-005
**Phase:** 2 (Dev Implementation Refactor)
**Feature:** Create dev-setup-leader (Phase 0) to validate story state and create CHECKPOINT/SCOPE artifacts
**Endpoints:** —
**Infrastructure:** —
**Goal:** Minimal-read setup phase using haiku model to initialize story workspace
**Risk Notes:** Must correctly infer scope from minimal story frontmatter reads

---

## FLOW-008: Implement Dev Plan Leader

**Status:** pending
**Depends On:** FLOW-003, FLOW-004, FLOW-006, FLOW-007
**Phase:** 2 (Dev Implementation Refactor)
**Feature:** Create dev-plan-leader (Phase 1) to generate PLAN.yaml with knowledge context integration
**Endpoints:** —
**Infrastructure:** —
**Goal:** Generate implementation plan referencing ADR constraints and lessons applied
**Risk Notes:** Must correctly invoke knowledge loader and produce actionable PLAN.yaml

---

## FLOW-009: Implement Dev Execute Leader

**Status:** pending
**Depends On:** FLOW-008
**Phase:** 2 (Dev Implementation Refactor)
**Feature:** Create dev-execute-leader (Phase 2) to orchestrate targeted coders and merge into EVIDENCE.yaml
**Endpoints:** —
**Infrastructure:** —
**Goal:** Spawn only impacted slice coders and aggregate results into evidence bundle
**Risk Notes:** Complex orchestration logic with multiple workers. High token consumption phase. [SIZING WARNING]

---

## FLOW-010: Implement Dev Proof Leader

**Status:** pending
**Depends On:** FLOW-009
**Phase:** 2 (Dev Implementation Refactor)
**Feature:** Create dev-proof-leader (Phase 3) to generate PROOF from EVIDENCE.yaml without new reasoning
**Endpoints:** —
**Infrastructure:** —
**Goal:** Validate evidence completeness and render proof document using haiku model
**Risk Notes:** Must detect missing AC evidence without reading full story

---

## FLOW-011: Integrate Review/Fix Loop into Dev Flow

**Status:** pending
**Depends On:** FLOW-010, FLOW-014
**Phase:** 2 (Dev Implementation Refactor)
**Feature:** Add internal /dev-code-review invocation with fix iteration support in dev-implement-story
**Endpoints:** —
**Infrastructure:** —
**Goal:** Enable automated review and fix cycles using REVIEW.yaml + EVIDENCE.yaml
**Risk Notes:** Fix loop must not reread story. Requires careful artifact passing.

---

## FLOW-012: Implement Review Setup Leader

**Status:** pending
**Depends On:** FLOW-004, FLOW-005
**Phase:** 3 (Code Review Refactor)
**Feature:** Create review-setup-leader (Phase 0) to read EVIDENCE/SCOPE and decide which workers to run
**Endpoints:** —
**Infrastructure:** —
**Goal:** Diff-aware worker selection using haiku model to minimize unnecessary review work
**Risk Notes:** Must correctly interpret SCOPE.yaml to select relevant review workers

---

## FLOW-013: Update Review Workers for Diff-Aware Operation

**Status:** pending
**Depends On:** FLOW-012
**Phase:** 3 (Code Review Refactor)
**Feature:** Modify existing review workers to use touched file lists and output YAML only
**Endpoints:** —
**Infrastructure:** —
**Goal:** Convert existing review workers to evidence-first pattern with structured output
**Risk Notes:** Multiple workers to update. Must maintain existing check quality. [SIZING WARNING]

---

## FLOW-014: Implement Review Aggregate Leader

**Status:** pending
**Depends On:** FLOW-013
**Phase:** 3 (Code Review Refactor)
**Feature:** Create review-aggregate-leader (Phase 2) to merge worker outputs into REVIEW.yaml
**Endpoints:** —
**Infrastructure:** —
**Goal:** Produce ranked patch list from worker outputs using haiku model
**Risk Notes:** Must correctly prioritize findings across multiple review dimensions

---

## FLOW-015: Implement QA Verify Setup Leader

**Status:** pending
**Depends On:** FLOW-004, FLOW-006
**Phase:** 4 (QA Verify Refactor)
**Feature:** Create qa-verify-setup-leader (Phase 0) to validate preconditions and read EVIDENCE/REVIEW
**Endpoints:** —
**Infrastructure:** —
**Goal:** Minimal-read setup to prepare QA verification workspace using haiku model
**Risk Notes:** Must detect if review passed before allowing QA verification

---

## FLOW-016: Implement QA Verify Verification Leader

**Status:** pending
**Depends On:** FLOW-015
**Phase:** 4 (QA Verify Refactor)
**Feature:** Create qa-verify-verification-leader (Phase 1) to verify ACs via EVIDENCE mapping
**Endpoints:** —
**Infrastructure:** —
**Goal:** Evidence-first AC verification that only opens detailed files when evidence is missing
**Risk Notes:** Core QA logic phase. Must maintain verification quality while reducing token usage. [SIZING WARNING]

---

## FLOW-017: Implement QA Verify Completion Leader

**Status:** pending
**Depends On:** FLOW-016
**Phase:** 4 (QA Verify Refactor)
**Feature:** Create qa-verify-completion-leader (Phase 2) to update status and trigger KB write-back
**Endpoints:** —
**Infrastructure:** —
**Goal:** Finalize QA phase with lesson deduplication and token summary using haiku model
**Risk Notes:** Must correctly dedupe lessons before KB write to avoid noise

---

## FLOW-018: Implement KB Writer Agent

**Status:** pending
**Depends On:** FLOW-003
**Phase:** 1 (Shared Infrastructure)
**Feature:** Create kb-writer agent for lesson write-back with deduplication
**Endpoints:** —
**Infrastructure:** —
**Goal:** Safely write new learnings to KB without duplicating existing entries
**Risk Notes:** Must query KB to dedupe before writing. Handle KB unavailability gracefully.

---

## FLOW-019: Update Dev Command to Use New Leaders

**Status:** pending
**Depends On:** FLOW-011
**Phase:** 2 (Dev Implementation Refactor)
**Feature:** Modify /dev-implement-story command to orchestrate new phase leaders
**Endpoints:** —
**Infrastructure:** —
**Goal:** Wire new phase leaders into existing command interface
**Risk Notes:** Must preserve existing command semantics for backward compatibility

---

## FLOW-020: Update Code Review Command to Use New Leaders

**Status:** pending
**Depends On:** FLOW-014
**Phase:** 3 (Code Review Refactor)
**Feature:** Modify /dev-code-review command to orchestrate new phase leaders
**Endpoints:** —
**Infrastructure:** —
**Goal:** Wire new phase leaders into existing command interface
**Risk Notes:** Must preserve standalone code review capability

---

## FLOW-021: Update QA Verify Command to Use New Leaders

**Status:** pending
**Depends On:** FLOW-017
**Phase:** 4 (QA Verify Refactor)
**Feature:** Modify /qa-verify-story command to orchestrate new phase leaders
**Endpoints:** —
**Infrastructure:** —
**Goal:** Wire new phase leaders into existing command interface
**Risk Notes:** Must preserve existing QA verification semantics

---

## FLOW-022: End-to-End Integration Testing

**Status:** pending
**Depends On:** FLOW-019, FLOW-020, FLOW-021
**Phase:** 4 (QA Verify Refactor)
**Feature:** Test full workflow from /dev-implement-story through /qa-verify-story with new artifacts
**Endpoints:** —
**Infrastructure:** —
**Goal:** Validate complete refactored workflow produces correct artifacts and reduces token usage
**Risk Notes:** Integration testing across all phases. May reveal unforeseen edge cases. [SIZING WARNING]
