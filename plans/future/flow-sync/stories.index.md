---
doc_type: stories_index
title: "FLOW Stories Index"
status: active
story_prefix: "FLOW"
created_at: "2026-02-01T14:30:00Z"
updated_at: "2026-02-01T14:30:00Z"
---

# FLOW Stories Index

All stories in this epic use the `FLOW-XXX` naming convention (starting at 001).

## Progress Summary

| Status | Count |
|--------|-------|
| completed | 0 |
| generated | 0 |
| in-progress | 0 |
| pending | 21 |

---

## Ready to Start

Stories with all dependencies satisfied (can be worked in parallel):

| Story | Title | Feature |
|-------|-------|---------|
| FLOW-001 | Create Story State Enum | Create Zod enum for story lifecycle states |
| FLOW-004 | Align Checkpoint Artifact Schema | Rename checkpoint.ts to context.ts and align fields |
| FLOW-005 | Align Evidence Artifact Schema | Update evidence.ts to match proof.yaml structure |
| FLOW-006 | Align Plan Artifact Schema | Update plan.ts chunks structure |
| FLOW-007 | Align Verification Artifact Schema | Merge review.ts and qa-verify.ts |
| FLOW-012 | Verify KB Read Integration | Review load-knowledge-context.ts |

---

## FLOW-001: Create Story State Enum

**Status:** pending
**Phase:** 1 (Foundation)
**Depends On:** —
**Feature:** Create Zod enum for story lifecycle states (draft, backlog, ready-to-work, in-progress, ready-for-qa, uat, done)
**Goal:** Define type-safe story state enum matching Claude workflow
**Risk Notes:** None - straightforward enum definition

---

## FLOW-002: Update GraphState Schema

**Status:** pending
**Phase:** 1 (Foundation)
**Depends On:** FLOW-001
**Feature:** Add storyState and blockedBy fields to GraphState, remove redundant phase/stage fields
**Goal:** Align GraphState with simplified state model
**Risk Notes:** Breaking change - existing graphs may need migration

---

## FLOW-003: Update Story Artifact Schema

**Status:** pending
**Phase:** 1 (Foundation)
**Depends On:** FLOW-001
**Feature:** Update story.ts to use single state field, remove stage/phase/status fields, align with Claude's story.yaml
**Goal:** Standardize story artifact structure with Claude workflow
**Risk Notes:** Breaking change - existing story artifacts may need migration

---

## FLOW-004: Align Checkpoint Artifact Schema

**Status:** pending
**Phase:** 1 (Foundation)
**Depends On:** —
**Feature:** Rename checkpoint.ts to context.ts and align fields with Claude's context.yaml schema
**Goal:** Standardize context artifact structure
**Risk Notes:** Rename may break imports across codebase

---

## FLOW-005: Align Evidence Artifact Schema

**Status:** pending
**Phase:** 1 (Foundation)
**Depends On:** —
**Feature:** Update evidence.ts to match proof.yaml deliverables structure from Claude workflow
**Goal:** Standardize proof artifact structure
**Risk Notes:** None - schema alignment only

---

## FLOW-006: Align Plan Artifact Schema

**Status:** pending
**Phase:** 1 (Foundation)
**Depends On:** —
**Feature:** Update plan.ts chunks structure to match Claude's plan.yaml schema
**Goal:** Standardize plan artifact structure
**Risk Notes:** None - schema alignment only

---

## FLOW-007: Align Verification Artifact Schema

**Status:** pending
**Phase:** 1 (Foundation)
**Depends On:** —
**Feature:** Merge review.ts and qa-verify.ts into single verification.ts matching Claude's verification.yaml
**Goal:** Consolidate verification schemas into unified structure
**Risk Notes:** Breaking change - merging two schemas may require data migration

---

## FLOW-008: Create Story Repository

**Status:** pending
**Phase:** 2 (Database Integration)
**Depends On:** FLOW-001, FLOW-003
**Feature:** Implement StoryRepository for PostgreSQL with methods: getStory, updateStoryState, getWorkableStories, getNextAction
**Goal:** Enable story CRUD operations in PostgreSQL
**Infrastructure:** PostgreSQL connection pool, workflow_stories table
**Risk Notes:** Requires database schema from 002_workflow_tables.sql to be deployed

---

## FLOW-009: Create Workflow Repository

**Status:** pending
**Phase:** 2 (Database Integration)
**Depends On:** FLOW-004, FLOW-005, FLOW-006, FLOW-007
**Feature:** Implement WorkflowRepository with methods: saveElaboration, savePlan, saveVerification, saveProof, logTokenUsage
**Goal:** Enable workflow artifact persistence to PostgreSQL
**Infrastructure:** PostgreSQL connection pool, workflow_elaborations, workflow_plans, workflow_verification, workflow_proof tables
**Risk Notes:** Requires all workflow tables from 002_workflow_tables.sql

---

## FLOW-010: Create DB Load Node

**Status:** pending
**Phase:** 2 (Database Integration)
**Depends On:** FLOW-008, FLOW-009
**Feature:** Implement load-from-db.ts node that loads story and artifacts from PostgreSQL into GraphState
**Goal:** Enable loading workflow state from database
**Risk Notes:** Must handle missing/incomplete data gracefully

---

## FLOW-011: Create DB Save Node

**Status:** pending
**Phase:** 2 (Database Integration)
**Depends On:** FLOW-008, FLOW-009
**Feature:** Implement save-to-db.ts node that persists GraphState to PostgreSQL at phase boundaries
**Goal:** Enable workflow state persistence to database
**Risk Notes:** Must be transactional - rollback on failure

---

## FLOW-012: Verify KB Read Integration

**Status:** pending
**Phase:** 3 (Knowledge Base Integration)
**Depends On:** —
**Feature:** Review load-knowledge-context.ts to ensure KB query patterns match Claude's approach (domain-specific lessons, blocker queries)
**Goal:** Confirm KB read integration aligns with Claude workflow
**Infrastructure:** Knowledge Base service
**Risk Notes:** Verification only - low risk

---

## FLOW-013: Create KB Write Node

**Status:** pending
**Phase:** 3 (Knowledge Base Integration)
**Depends On:** FLOW-012
**Feature:** Implement persist-learnings.ts node that writes learnings to KB after story completion with deduplication (>0.85 similarity)
**Goal:** Enable automatic learning capture to Knowledge Base
**Infrastructure:** Knowledge Base service with kb_add and kb_search
**Risk Notes:** Deduplication logic critical - may create duplicates if threshold too low

---

## FLOW-014: Update Story Creation Graph

**Status:** pending
**Phase:** 4 (Graph Integration)
**Depends On:** FLOW-010, FLOW-011, FLOW-013
**Feature:** Add load_from_db, save_to_db, and persist_learnings nodes to story-creation.ts graph with proper transitions
**Goal:** Wire database and KB persistence into story creation workflow
**Risk Notes:** Graph structure changes - existing workflows may break

---

## FLOW-015: Update Elaboration Graph

**Status:** pending
**Phase:** 4 (Graph Integration)
**Depends On:** FLOW-010, FLOW-011
**Feature:** Add load_from_db and save_to_db nodes to elaboration.ts, update state transitions for PASS (ready-to-work) and FAIL (backlog)
**Goal:** Wire database persistence into elaboration workflow
**Risk Notes:** State transition logic must be carefully tested

---

## FLOW-016: Update Module Exports

**Status:** pending
**Phase:** 4 (Graph Integration)
**Depends On:** FLOW-008, FLOW-009, FLOW-010, FLOW-011, FLOW-013
**Feature:** Update src/index.ts to export new repositories, nodes, and updated artifact schemas
**Goal:** Make new modules available for external consumption
**Risk Notes:** None - export updates only

---

## FLOW-017: Unit Tests - Story Repository

**Status:** pending
**Phase:** 5 (Testing & Validation)
**Depends On:** FLOW-008
**Feature:** Create comprehensive unit tests for StoryRepository covering all CRUD operations and edge cases
**Goal:** Validate story repository functionality
**Infrastructure:** Test database
**Risk Notes:** None - testing only

---

## FLOW-018: Unit Tests - Workflow Repository

**Status:** pending
**Phase:** 5 (Testing & Validation)
**Depends On:** FLOW-009
**Feature:** Create comprehensive unit tests for WorkflowRepository covering all artifact persistence operations
**Goal:** Validate workflow repository functionality
**Infrastructure:** Test database
**Risk Notes:** None - testing only

---

## FLOW-019: Unit Tests - KB Write Node

**Status:** pending
**Phase:** 5 (Testing & Validation)
**Depends On:** FLOW-013
**Feature:** Create unit tests for persist-learnings.ts covering deduplication logic and KB write operations
**Goal:** Validate KB write node functionality
**Infrastructure:** Mocked KB service
**Risk Notes:** None - testing only

---

## FLOW-020: Integration Tests - Story Creation

**Status:** pending
**Phase:** 5 (Testing & Validation)
**Depends On:** FLOW-014, FLOW-017, FLOW-018
**Feature:** Create end-to-end integration test for complete story creation workflow with database persistence
**Goal:** Validate complete story creation workflow with persistence
**Infrastructure:** Test database, Mocked KB service
**Risk Notes:** Complex integration test - may be flaky if not properly isolated

---

## FLOW-021: Integration Tests - Elaboration

**Status:** pending
**Phase:** 5 (Testing & Validation)
**Depends On:** FLOW-015, FLOW-017, FLOW-018
**Feature:** Create end-to-end integration test for elaboration workflow with database persistence and state transitions
**Goal:** Validate elaboration workflow with persistence and state transitions
**Infrastructure:** Test database
**Risk Notes:** Must test both PASS and FAIL paths
