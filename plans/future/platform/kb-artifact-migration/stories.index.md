---
doc_type: stories_index
title: "KBAR Stories Index"
status: active
story_prefix: "KBAR"
created_at: "2026-02-05T06:30:00Z"
updated_at: "2026-02-05T06:30:00Z"
---

# KBAR Stories Index

All stories in this epic use the `KBAR-XXX` naming convention (starting at 001).

## Progress Summary

| Status | Count |
|--------|-------|
| completed | 0 |
| generated | 0 |
| in-progress | 0 |
| pending | 27 |

---

## Ready to Start

Stories with all dependencies satisfied (can be worked in parallel):

| Story | Title | Blocked By |
|-------|-------|------------|
| KBAR-001 | Database Schema Migrations | — |

---

## KBAR-001: Database Schema Migrations

**Status:** pending
**Depends On:** none
**Phase:** 1

**Feature:** Create migrations for stories, story_dependencies, and story_artifacts tables

**Infrastructure:**
- PostgreSQL migration
- Drizzle schema

**Goal:** Establish database schema foundation for hybrid storage architecture

**Risk Notes:** Schema design must support future extensibility; migration rollback must preserve file-based workflow

---

## KBAR-002: Schema Tests & Validation

**Status:** pending
**Depends On:** KBAR-001
**Phase:** 1

**Feature:** Write comprehensive tests for new database schema and relationships

**Infrastructure:**
- Vitest tests

**Goal:** Ensure schema integrity, constraints, and indexes work correctly

**Risk Notes:** Must validate foreign key cascades and index performance

---

## KBAR-003: Story Sync Functions

**Status:** pending
**Depends On:** KBAR-002
**Phase:** 2

**Feature:** Implement syncStoryFromFiles() to read story.yaml and populate DB tables

**Infrastructure:**
- TypeScript utilities

**Goal:** Enable one-way sync from file system to database for story metadata

**Risk Notes:** Must handle file parsing errors gracefully; hash-based change detection required

---

## KBAR-004: Artifact Sync Functions

**Status:** pending
**Depends On:** KBAR-003
**Phase:** 2

**Feature:** Implement syncArtifactsFromFiles() to discover and index artifacts in _implementation/

**Infrastructure:**
- File system scanner

**Goal:** Automatically detect and catalog existing artifacts from file system

**Risk Notes:** Must handle missing files, corrupt YAML, and nested directory structures

---

## KBAR-005: CLI Sync Commands

**Status:** pending
**Depends On:** KBAR-004
**Phase:** 2

**Feature:** Create sync:story and sync:epic CLI commands with dry-run support

**Infrastructure:**
- CLI scripts in scripts/

**Goal:** Provide command-line interface for manual and automated story synchronization

**Risk Notes:** Must support incremental sync and provide clear progress/error reporting

---

## KBAR-006: Sync Integration Tests

**Status:** pending
**Depends On:** KBAR-005
**Phase:** 2

**Feature:** Test sync functions with real wish epic stories and edge cases

**Infrastructure:**
- Integration test suite

**Goal:** Validate sync accuracy and performance with production-like data

**Risk Notes:** Test data must cover all story states, dependencies, and artifact types

---

## KBAR-007: story_get Tool

**Status:** pending
**Depends On:** KBAR-006
**Phase:** 3

**Feature:** Implement MCP tool to retrieve story with optional artifacts and dependencies

**Infrastructure:**
- MCP tool handler

**Goal:** Enable agents to query story metadata from database efficiently

**Risk Notes:** Must handle missing stories and support eager loading of relations

---

## KBAR-008: story_list & story_update Tools

**Status:** pending
**Depends On:** KBAR-007
**Phase:** 3

**Feature:** Implement MCP tools for listing stories with filters and updating status/phase

**Infrastructure:**
- MCP tool handlers

**Goal:** Enable agents to query and update story state without file operations

**Risk Notes:** Updates must validate state transitions; filters must support complex queries

---

## KBAR-009: story_ready_to_start Tool

**Status:** pending
**Depends On:** KBAR-008
**Phase:** 3

**Feature:** Implement MCP tool to find stories ready to work (unblocked, dependencies satisfied)

**Infrastructure:**
- MCP tool handler with dependency resolution

**Goal:** Enable agents to discover next actionable story automatically

**Risk Notes:** Dependency resolution must handle circular dependencies and missing stories

---

## KBAR-010: Story Tools Integration Tests

**Status:** pending
**Depends On:** KBAR-009
**Phase:** 3

**Feature:** Write integration tests for all story MCP tools

**Infrastructure:**
- MCP integration tests

**Goal:** Ensure story tools work correctly via MCP server

**Risk Notes:** Must test error handling and edge cases via MCP protocol

---

## KBAR-011: artifact_write Tool

**Status:** pending
**Depends On:** KBAR-010
**Phase:** 4

**Feature:** Implement dual-write tool to save artifacts to file + optionally KB

**Infrastructure:**
- MCP tool handler
- KB integration

**Goal:** Enable agents to write artifacts with automatic KB indexing based on type

**Risk Notes:** Must handle write failures gracefully; KB write should not block file write. Sizing warning: true

---

## KBAR-012: artifact_read Tool

**Status:** pending
**Depends On:** KBAR-011
**Phase:** 4

**Feature:** Implement artifact reading with fallback from DB → file system

**Infrastructure:**
- MCP tool handler

**Goal:** Enable agents to read artifacts from database or files transparently

**Risk Notes:** Fallback logic must be fast; cache strategy needed for frequent reads

---

## KBAR-013: artifact_search Tool

**Status:** pending
**Depends On:** KBAR-011
**Phase:** 4

**Feature:** Implement semantic search across artifacts using KB embeddings

**Infrastructure:**
- MCP tool handler
- KB semantic search

**Goal:** Enable agents to find relevant artifacts across all stories using natural language

**Risk Notes:** Search quality depends on KB tagging consistency; must handle no-results gracefully

---

## KBAR-014: Artifact Summary Extraction

**Status:** pending
**Depends On:** KBAR-012, KBAR-013
**Phase:** 4

**Feature:** Implement summary extraction for each artifact type (plan, evidence, review, etc.)

**Infrastructure:**
- TypeScript utilities

**Goal:** Automatically generate concise summaries for artifact search results

**Risk Notes:** Summary logic must handle varying artifact structures; JSON schema validation needed

---

## KBAR-015: Artifact Tools Integration Tests

**Status:** pending
**Depends On:** KBAR-014
**Phase:** 4

**Feature:** Write integration tests for artifact_write, artifact_read, artifact_search

**Infrastructure:**
- MCP integration tests

**Goal:** Ensure artifact tools work correctly via MCP server with KB integration

**Risk Notes:** Must test KB write failures and file system errors

---

## KBAR-016: Update Setup & Plan Leaders

**Status:** pending
**Depends On:** KBAR-015
**Phase:** 5

**Feature:** Update dev-setup-leader and dev-plan-leader to use artifact_write for CHECKPOINT, SCOPE, PLAN

**Infrastructure:**
- Agent markdown files

**Goal:** Migrate setup and planning agents to use new MCP tools

**Risk Notes:** Must maintain backward compatibility during transition

---

## KBAR-017: Update Execute & Worker Agents

**Status:** pending
**Depends On:** KBAR-016
**Phase:** 5

**Feature:** Update dev-execute-leader, backend-coder, frontend-coder to use artifact_write for EVIDENCE, logs

**Infrastructure:**
- Agent markdown files

**Goal:** Migrate execution agents to use new MCP tools

**Risk Notes:** BACKEND-LOG and FRONTEND-LOG are high-frequency writes; performance critical

---

## KBAR-018: Update Code Review Agents

**Status:** pending
**Depends On:** KBAR-016
**Phase:** 5

**Feature:** Update all code-review-*.agent.md files to use artifact_write for REVIEW artifacts

**Infrastructure:**
- Agent markdown files

**Goal:** Migrate code review agents to use new MCP tools

**Risk Notes:** Review artifacts must be searchable in KB for pattern analysis

---

## KBAR-019: Update QA & Fix Agents

**Status:** pending
**Depends On:** KBAR-017, KBAR-018
**Phase:** 5

**Feature:** Update qa-verify-*.agent.md and dev-fix-fix-leader to use artifact_write

**Infrastructure:**
- Agent markdown files

**Goal:** Migrate QA and fix agents to use new MCP tools

**Risk Notes:** FIX-CONTEXT must link to original failure evidence

---

## KBAR-020: Update Knowledge Context Loader

**Status:** pending
**Depends On:** KBAR-019
**Phase:** 5

**Feature:** Update knowledge-context-loader to use artifact_search for pattern discovery

**Infrastructure:**
- Agent markdown file

**Goal:** Enable semantic search for relevant past solutions and patterns

**Risk Notes:** Search query construction critical for relevance

---

## KBAR-021: Update Orchestrator Commands

**Status:** pending
**Depends On:** KBAR-020
**Phase:** 5

**Feature:** Update workflow commands (dev-implement-story, elab-story, etc.) to use story_update

**Infrastructure:**
- Command markdown files

**Goal:** Migrate orchestrator commands to use new MCP tools for state management

**Risk Notes:** State transition validation must prevent invalid workflows

---

## KBAR-022: Agent Migration Testing

**Status:** pending
**Depends On:** KBAR-021
**Phase:** 5

**Feature:** End-to-end test of full story workflow using updated agents

**Infrastructure:**
- E2E test suite

**Goal:** Validate that updated agents work correctly in production workflow

**Risk Notes:** Must test with real story to catch integration issues

---

## KBAR-023: DB-Driven Index Generation

**Status:** pending
**Depends On:** KBAR-022
**Phase:** 6

**Feature:** Implement generateStoriesIndex() to create stories.index.md from database

**Infrastructure:**
- TypeScript utility

**Goal:** Replace manual index maintenance with automated DB-driven generation

**Risk Notes:** Index format must match existing manual format for backward compatibility

---

## KBAR-024: Regenerate Index CLI

**Status:** pending
**Depends On:** KBAR-023
**Phase:** 6

**Feature:** Create regenerate:index CLI command and integrate into workflow

**Infrastructure:**
- CLI script

**Goal:** Provide command-line interface for index regeneration

**Risk Notes:** Must run on pre-commit hook or workflow transitions

---

## KBAR-025: Lesson Extraction from Evidence

**Status:** pending
**Depends On:** KBAR-024
**Phase:** 7

**Feature:** Implement automatic extraction of lessons learned from completed EVIDENCE artifacts

**Infrastructure:**
- NLP utilities
- KB integration

**Goal:** Automatically capture reusable patterns from completed story execution

**Risk Notes:** Extraction quality depends on evidence structure; may need LLM summarization

---

## KBAR-026: Architectural Decision Extraction

**Status:** pending
**Depends On:** KBAR-025
**Phase:** 7

**Feature:** Extract and index architectural decisions for cross-story pattern search

**Infrastructure:**
- KB integration

**Goal:** Make architectural decisions searchable across all stories

**Risk Notes:** Decision format must be standardized for effective extraction

---

## KBAR-027: Lesson Extraction Integration

**Status:** pending
**Depends On:** KBAR-026
**Phase:** 7

**Feature:** Integrate lesson extraction into story completion workflow

**Infrastructure:**
- Workflow hook

**Goal:** Automatically run lesson extraction when story transitions to completed state

**Risk Notes:** Extraction must not block story completion; async processing preferred
