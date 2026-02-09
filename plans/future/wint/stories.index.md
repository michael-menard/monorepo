---
doc_type: stories_index
title: "WINT Stories Index"
status: active
story_prefix: "WINT"
created_at: "2026-02-09T22:30:00Z"
updated_at: "2026-02-09T22:30:00Z"
---

# WINT Stories Index

All stories use `WINT-{phase}{story}{variant}` format (e.g., `WINT-1010` for Phase 1, Story 01, original).

## Progress Summary

| Status | Count |
|--------|-------|
| completed | 0 |
| in-progress | 0 |
| pending | 134 |

---

## Ready to Start

Stories with all dependencies satisfied (can be worked in parallel):

| Story | Feature | Blocked By |
|-------|---------|------------|
| WINT-0010 | Create Core Database Schemas | — |
| WINT-0150 | Create doc-sync Skill | — |
| WINT-0180 | Define Examples + Negative Examples Framework | — |
| WINT-1020 | Flatten Story Directories | — |
| WINT-4060 | Create scope-defender Agent | — |
| WINT-4070 | Create evidence-judge Agent | — |
| WINT-7010 | Audit Agent Directory References | — |

---

## Phase 0: Bootstrap

Bootstrap phase - Manual setup of database schemas, MCP tools, and doc-sync infrastructure (untracked, prerequisite for all other phases)

### WINT-0010: Create Core Database Schemas

**Status:** pending
**Depends On:** none
**Phase:** 0
**Feature:** Create 6 database schemas in existing postgres-knowledgebase: core, context_cache, telemetry, ml, graph, workflow with pgvector already available
**Infrastructure:**
- postgres-knowledgebase database
- pgvector extension

**Goal:** Establish schema structure for all workflow data storage

**Risk Notes:** Requires database migration script, must not break existing KB functionality

---

### WINT-0020: Create Story Management Tables

**Status:** pending
**Depends On:** WINT-0010
**Phase:** 0
**Feature:** Create stories table (id, feature_id, title, status, priority, assignee) and story_outcomes table in core schema
**Infrastructure:**
- core schema tables

**Goal:** Enable database-driven story tracking to replace file-based status

**Risk Notes:** Schema must support existing story ID format and status transitions

---

### WINT-0030: Create Context Cache Tables

**Status:** pending
**Depends On:** WINT-0010
**Phase:** 0
**Feature:** Create project_context, agent_missions, domain_kb, library_cache, and sessions tables in context_cache schema
**Infrastructure:**
- context_cache schema tables
- JSONB columns

**Goal:** Replace .cache/ files with database storage for agent context

**Risk Notes:** Must support complex nested JSONB structures efficiently

---

### WINT-0040: Create Telemetry Tables

**Status:** pending
**Depends On:** WINT-0010
**Phase:** 0
**Feature:** Create agent_invocations, hitl_decisions (with embeddings), and story_outcomes tables in telemetry schema
**Infrastructure:**
- telemetry schema tables
- pgvector for embeddings

**Goal:** Enable full observability of agent invocations and human decisions

**Risk Notes:** Volume could be high, needs indexing strategy for performance

---

### WINT-0050: Create ML Pipeline Tables

**Status:** pending
**Depends On:** WINT-0010
**Phase:** 0
**Feature:** Create router_training, models (bytea storage), and predictions tables in ml schema
**Infrastructure:**
- ml schema tables
- bytea for model binaries

**Goal:** Support model training and prediction storage for ML automation

**Risk Notes:** Model binary storage may require size limits or external storage

---

### WINT-0060: Create Graph Relational Tables

**Status:** pending
**Depends On:** WINT-0010
**Phase:** 0
**Feature:** Create capabilities, features, epics, feature_capabilities, and views (feature_cohesion, franken_features) in graph schema using relational approach (no AGE)
**Infrastructure:**
- graph schema tables
- materialized views

**Goal:** Enable graph-based cohesion checks using standard SQL

**Risk Notes:** View performance needs monitoring as graph grows

---

### WINT-0070: Create Workflow Tracking Tables

**Status:** pending
**Depends On:** WINT-0010
**Phase:** 0
**Feature:** Create phases and components tables in workflow schema with status, dependencies, and timestamps
**Infrastructure:**
- workflow schema tables

**Goal:** Track phase and component status in database instead of files

**Risk Notes:** Must handle circular dependency detection

---

### WINT-0080: Seed Initial Workflow Data

**Status:** pending
**Depends On:** WINT-0070, WINT-0060
**Phase:** 0
**Feature:** Seed workflow.phases with 8 phases (0-7), seed graph.capabilities with standard CRUD operations, seed current 115 agents, 28 commands, 13 skills
**Infrastructure:**
- seed data scripts

**Goal:** Populate foundational reference data for workflow tracking

**Risk Notes:** Agent metadata extraction may require parsing .agent.md files

---

### WINT-0090: Create Story Management MCP Tools

**Status:** pending
**Depends On:** WINT-0020
**Phase:** 0
**Feature:** Add MCP tools to postgres-knowledgebase: story_get_status, story_update_status, story_get_by_status, story_get_by_feature
**Infrastructure:**
- MCP server extension

**Goal:** Enable agents to query and update story status via MCP

**Risk Notes:** MCP tool API must align with existing knowledgebase tools

---

### WINT-0100: Create Context Cache MCP Tools

**Status:** pending
**Depends On:** WINT-0030
**Phase:** 0
**Feature:** Add MCP tools: workflow_get_project_context, workflow_get_agent_mission, workflow_get_domain_kb, workflow_get_library_cache
**Infrastructure:**
- MCP server extension

**Goal:** Enable agents to retrieve cached context from database

**Risk Notes:** Cache invalidation strategy needs careful design

---

### WINT-0110: Create Session Management MCP Tools

**Status:** pending
**Depends On:** WINT-0030
**Phase:** 0
**Feature:** Add MCP tools: workflow_create_session, workflow_get_session, workflow_update_session, workflow_add_decision
**Infrastructure:**
- MCP server extension

**Goal:** Enable leader→worker context sharing via database sessions

**Acceptance Criteria (Phase 0):**
- Database RBAC strategy design document with role definitions and least privilege principle
- Schema design reviewed for authorization constraints
- Role assignments and permissions matrix documented
- Session lifecycle management rules established

**Risk Notes:** Session lifecycle management needs clear ownership rules

---

### WINT-0120: Create Telemetry MCP Tools

**Status:** pending
**Depends On:** WINT-0040
**Phase:** 0
**Feature:** Add MCP tools: workflow_log_invocation, workflow_log_decision, workflow_log_outcome, workflow_get_story_telemetry
**Infrastructure:**
- MCP server extension

**Goal:** Enable agents to log telemetry data for observability and ML training

**Risk Notes:** High-frequency writes need batching or async strategy

---

### WINT-0130: Create Graph Query MCP Tools

**Status:** pending
**Depends On:** WINT-0060
**Phase:** 0
**Feature:** Add MCP tools: graph_check_cohesion, graph_get_franken_features, graph_get_capability_coverage, graph_apply_rules
**Infrastructure:**
- MCP server extension

**Goal:** Enable agents to query graph for cohesion and completeness checks

**Acceptance Criteria (Phase 0):**
- Explicit input validation requirements for all MCP tool parameters
- Parameterized queries (prepared statements) mandatory for all database access
- SQL injection risk mitigation testing completed
- Input sanitization and validation library usage documented
- Security review checklist for Phase 0 completion

**Risk Notes:** Complex graph queries may need optimization or caching

---

### WINT-0140: Create ML Pipeline MCP Tools

**Status:** pending
**Depends On:** WINT-0050
**Phase:** 0
**Feature:** Add MCP tools: workflow_get_model_recommendation, workflow_get_preference_prediction, workflow_get_similar_tasks, workflow_should_auto_accept
**Infrastructure:**
- MCP server extension

**Goal:** Enable agents to query ML models for predictions and recommendations

**Acceptance Criteria (Phase 0):**
- Explicit input validation requirements for all MCP tool parameters
- Parameterized queries (prepared statements) mandatory for all database access
- SQL injection risk mitigation testing completed
- Input sanitization and validation library usage documented
- Security review checklist for Phase 0 completion

**Risk Notes:** ML models won't exist until Phase 5, tools need graceful degradation

---

### WINT-0150: Create doc-sync Skill

**Status:** pending
**Depends On:** none
**Phase:** 0
**Feature:** Create skill that updates AGENTS.md, COMMANDS.md, SKILLS.md, and docs/workflow/ by reading current state from database and .agent.md/.command.md/.skill.md files
**Infrastructure:**
- new skill file

**Goal:** Automate documentation sync at phase/story completion

**Risk Notes:** Must parse various metadata formats correctly

---

### WINT-0160: Create doc-sync Agent

**Status:** pending
**Depends On:** WINT-0150
**Phase:** 0
**Feature:** Create haiku-powered worker agent that implements doc-sync skill logic
**Infrastructure:**
- new agent file

**Goal:** Execute documentation updates when triggered

**Risk Notes:** Must handle concurrent edits to docs gracefully

---

### WINT-0170: Add Doc-Sync Gate to Phase/Story Completion

**Status:** pending
**Depends On:** WINT-0160
**Phase:** 0
**Feature:** Modify phase/story completion workflows to require doc-sync check before marking complete
**Infrastructure:**
- workflow orchestration updates

**Goal:** Enforce documentation currency at all completion points

**Risk Notes:** May slow down completion if doc-sync is slow

---

### WINT-0180: Define Examples + Negative Examples Framework

**Status:** pending
**Depends On:** none
**Phase:** 0
**Feature:** Create framework for role packs with max 2 positive + 1 negative example per role. Define pattern skeleton format (10-25 lines), decision rule + proof requirements. Establish where examples live: prompts/role-packs/*, KB MCP, context-pack sidecar injection.
**Infrastructure:**
- .claude/prompts/role-packs/ directory
- Example template format

**Goal:** Reduce scope creep and rework by making "minimum viable" patterns explicit with canonical examples

**Risk Notes:** Must keep examples small (token budget) while remaining useful

---

### WINT-0190: Create Patch Queue Pattern and Schema

**Status:** pending
**Depends On:** WINT-0180
**Phase:** 0
**Feature:** Define Patch Queue pattern for small diffs with verification. Create patch-plan.schema.json with patch ordering (types/schema→API→UI→tests→cleanup), max_files, max_diff_lines constraints. Include Repair Loop pattern (fix only referenced errors, minimal changes, rerun until green).
**Infrastructure:**
- schemas/patch-plan.schema.json
- Dev role pack update

**Goal:** Stop mega-patches that touch UI+API+DB+tests+refactors in one commit

**Risk Notes:** Patch size limits need tuning per codebase

---

### WINT-0200: Create User Flows Schema with State/Capability Enums

**Status:** pending
**Depends On:** WINT-0180
**Phase:** 0
**Feature:** Create user-flows.schema.json with required states enum (loading, empty, validation_error, server_error, permission_denied) and capabilities enum (create, view, edit, delete, upload, replace, download). Enforce max 5 flows, max 7 steps per flow.
**Infrastructure:**
- schemas/user-flows.schema.json

**Goal:** Standardize user flow definitions for PO cohesion checks

**Risk Notes:** States/capabilities list may need expansion for edge cases

---

### WINT-0210: Populate Role Pack Templates

**Status:** pending
**Depends On:** WINT-0180, WINT-0190, WINT-0200
**Phase:** 0
**Feature:** Create role pack templates with examples: Dev (Patch Queue + Reuse Shared Packages + Repair Loop), PO (hard caps: max 5 findings, max 2 blocking), DA (hard caps: max 5 challenges, cannot challenge blocking items), QA (AC→Evidence trace pattern, ac-trace.json output).
**Infrastructure:**
- .claude/prompts/role-packs/dev.md
- .claude/prompts/role-packs/po.md
- .claude/prompts/role-packs/da.md
- .claude/prompts/role-packs/qa.md

**Goal:** Provide focused 150-300 token role instructions with canonical examples

**Risk Notes:** Must keep under token budget while being actionable

---

## Phase 1: Foundation

Foundation phase - Story flattening, core tables, compatibility shim for directory→DB fallback, single source of truth

### WINT-1010: Create Compatibility Shim Module

**Status:** pending
**Depends On:** WINT-0090
**Phase:** 1
**Feature:** Create shared module that checks DB first, falls back to directory structure, used by all agents during migration
**Infrastructure:**
- shared TypeScript/Python module

**Goal:** Enable gradual migration without breaking existing agents

**Acceptance Criteria (Phase 0):**
- Database migration rollback script development completed
- Rollback procedure pre-tested with recovery validation
- Disaster recovery documentation provided
- Rollback testing conducted in staging environment
- Phase 1 gate validation (WINT-1080) includes rollback procedure sign-off

**Risk Notes:** Must maintain performance, avoid double-reads

---

### WINT-1020: Flatten Story Directories

**Status:** pending
**Depends On:** none
**Phase:** 1
**Feature:** Move all stories from swim-lane structure (backlog/ready/in-progress/UAT/done) to flat /stories/ directory under each epic
**Infrastructure:**
- file system migration script

**Goal:** Simplify directory structure with status in database

**Risk Notes:** Must preserve git history, update all references

---

### WINT-1030: Populate Story Status from Directories

**Status:** pending
**Depends On:** WINT-1020, WINT-0020
**Phase:** 1
**Feature:** Scan existing story directories, infer status from location (backlog/ready/UAT/done), populate core.stories table
**Infrastructure:**
- migration script

**Goal:** Initialize database with current story status

**Risk Notes:** Edge cases like stories in wrong directories need handling

---

### WINT-1040: Update story-status Command to Use DB

**Status:** pending
**Depends On:** WINT-1010, WINT-1030
**Phase:** 1
**Feature:** Modify /story-status command to query core.stories table instead of directory structure
**Infrastructure:**

**Goal:** First command to use database as source of truth

**Risk Notes:** Must maintain backward compatibility via shim

---

### WINT-1050: Update story-update Command to Use DB

**Status:** pending
**Depends On:** WINT-1010, WINT-1030
**Phase:** 1
**Feature:** Modify /story-update command to update core.stories table instead of moving directories
**Infrastructure:**

**Goal:** Enable status updates via database

**Acceptance Criteria (Phase 0):**
- Comprehensive compatibility shim test suite deliverables
- Integration test requirements explicitly documented
- Phase 0 test infrastructure setup (WINT-0120 prerequisite)
- Agent logic compatibility validation checklist

**Risk Notes:** Must handle concurrent updates correctly

---

### WINT-1060: Update story-move Command to Use DB

**Status:** pending
**Depends On:** WINT-1010, WINT-1030
**Phase:** 1
**Feature:** Modify /story-move command to update database status instead of moving directories
**Infrastructure:**

**Goal:** Deprecate directory-based story movement

**Acceptance Criteria (Phase 0):**
- Comprehensive compatibility shim test suite deliverables
- Integration test requirements explicitly documented
- Phase 0 test infrastructure setup (WINT-0120 prerequisite)
- Agent logic compatibility validation checklist

**Risk Notes:** May still need to move directories for backward compatibility

---

### WINT-1070: Deprecate stories.index.md as Source of Truth

**Status:** pending
**Depends On:** WINT-1030
**Phase:** 1
**Feature:** Change stories.index.md to generated/read-only, create generation script that reads from database
**Infrastructure:**
- generation script

**Goal:** Make index file reflect database state, not define it

**Risk Notes:** Must run generation automatically after DB changes

---

### WINT-1080: Reconcile WINT Schema with LangGraph

**Status:** pending
**Depends On:** WINT-0010
**Phase:** 1
**Feature:** Compare WINT core.stories schema with existing LangGraph 002_workflow_tables.sql, create unified schema supporting both systems
**Infrastructure:**
- Schema diff analysis
- Unified migration script

**Goal:** Single source of truth for both Claude Code and LangGraph

**Risk Notes:** Must preserve existing LangGraph functionality

---

### WINT-1090: Update LangGraph Repositories for Unified Schema

**Status:** pending
**Depends On:** WINT-1080
**Phase:** 1
**Feature:** Update story-repository.ts and workflow-repository.ts in packages/backend/orchestrator to use unified schema
**Infrastructure:**
- packages/backend/orchestrator/src/db/

**Goal:** LangGraph reads/writes same tables as Claude Code agents

**Risk Notes:** Must maintain backward compatibility during transition

---

### WINT-1100: Create Shared TypeScript Types

**Status:** pending
**Depends On:** WINT-1080
**Phase:** 1
**Feature:** Create shared Zod schemas in packages/backend/orchestrator that both LangGraph nodes and MCP tools use
**Infrastructure:**
- New shared types package or module

**Goal:** Type-safe unified schema across both systems

**Risk Notes:** None - standard practice

---

### WINT-1110: Migrate Existing LangGraph Data

**Status:** pending
**Depends On:** WINT-1090
**Phase:** 1
**Feature:** Create migration script to move any existing data from LangGraph tables to unified schema format
**Infrastructure:**
- Migration script with rollback

**Goal:** No data loss during unification

**Risk Notes:** Must test thoroughly before production run

---

### WINT-1120: Validate Foundation Phase

**Status:** pending
**Depends On:** WINT-1040, WINT-1050, WINT-1060, WINT-1070, WINT-1110, WINT-1160
**Phase:** 1
**Feature:** Verify all story CRUD operations work via DB, shim fallback functions correctly, 3 updated commands use DB, both LangGraph and Claude Code agents operate on unified schema, AND worktree integration works for parallel development
**Infrastructure:**

**Goal:** Ensure foundation is solid before context cache work

**Risk Notes:** Integration testing required for both systems

---

### WINT-1130: Track Worktree-to-Story Mapping in Database

**Status:** pending
**Depends On:** WINT-0020
**Phase:** 1
**Feature:** Add worktree tracking table to core schema: story_id, worktree_path, branch_name, created_at, status (active/merged/abandoned). Create MCP tools: worktree_register, worktree_get_by_story, worktree_list_active, worktree_mark_complete.
**Infrastructure:**
- core.worktrees table
- MCP tools for worktree tracking

**Goal:** Enable database-driven coordination of parallel work across multiple sessions

**Risk Notes:** Must handle orphaned worktrees (session died without cleanup)

---

### WINT-1140: Integrate Worktree Creation into dev-implement-story

**Status:** pending
**Depends On:** WINT-1130
**Phase:** 1
**Feature:** Modify dev-implement-story to automatically create worktree via /wt-new at story start. Register worktree in database. If worktree already exists for story, switch to it instead of creating new. Add pre-flight check: if story has active worktree in different session, warn and confirm.
**Infrastructure:**
- dev-implement-story agent update
- Integration with wt-new skill

**Goal:** Automatic isolation for every story implementation

**Risk Notes:** Must handle case where user wants to continue in existing worktree

---

### WINT-1150: Integrate Worktree Cleanup into Story Completion

**Status:** pending
**Depends On:** WINT-1130
**Phase:** 1
**Feature:** Modify story completion workflow (qa-verify-story success, story-update to 'done') to automatically run /wt-finish: merge branch, push, cleanup worktree, update database status. Add option to defer cleanup if PR review pending.
**Infrastructure:**
- qa-verify-story agent update
- story-update command update
- Integration with wt-finish skill

**Goal:** Automatic cleanup prevents worktree sprawl and ensures branches are merged

**Risk Notes:** Must not auto-merge if CI is failing or PR has requested changes

---

### WINT-1160: Add Parallel Work Conflict Prevention

**Status:** pending
**Depends On:** WINT-1130, WINT-1140
**Phase:** 1
**Feature:** Before starting work on a story, check database for active worktrees. If story has active worktree on different machine/session, show warning with options: (1) switch to that worktree, (2) take over (mark old as abandoned), (3) abort. Add /wt-status enhancement to show which stories have active worktrees.
**Infrastructure:**
- Conflict detection logic
- wt-status command enhancement

**Goal:** Prevent two sessions from working on the same story simultaneously

**Risk Notes:** "Take over" option must be explicit to avoid accidental work loss

---

### WINT-1170: Add Worktree-Aware Batch Processing

**Status:** pending
**Depends On:** WINT-1160, WINT-6010
**Phase:** 1
**Feature:** Enhance batch-coordinator to create separate worktrees for each story in batch. Track all worktrees in database. On batch completion, offer bulk merge or individual review. Add /batch-status enhancement to show worktree status per story.
**Infrastructure:**
- batch-coordinator agent update
- Bulk worktree operations

**Goal:** Enable true parallel execution of batch stories across worktrees

**Risk Notes:** Many worktrees consume disk space; add cleanup recommendations

---

## Phase 2: Context Cache & Sidecars

Context cache and sidecars phase - Shared sidecar services, agent missions, KB cache, sessions in DB to achieve 80% token reduction

### WINT-2010: Create Role Pack Sidecar

**Status:** pending
**Depends On:** WINT-1120
**Phase:** 2
**Feature:** Create versioned role pack sidecar service at GET /role-pack?role=pm|dev|qa|po&v=X returning 150-300 token role instructions
**Infrastructure:**
- packages/backend/sidecars/role-pack/
- HTTP endpoint + MCP tool wrapper

**Goal:** Stop re-teaching agents their job every spawn

**Risk Notes:** Must keep role packs versioned and small

---

### WINT-2020: Create Context Pack Sidecar

**Status:** pending
**Depends On:** WINT-2010
**Phase:** 2
**Feature:** Create context pack sidecar at POST /context-pack returning node-scoped context: story_brief, kb_facts, kb_rules, kb_links, repo_snippets
**Infrastructure:**
- packages/backend/sidecars/context-pack/
- HTTP endpoint + MCP tool wrapper

**Goal:** Provide relevant context without token bloat

**Risk Notes:** Must query KB efficiently, respect token budgets

---

### WINT-2030: Populate Project Context Cache

**Status:** pending
**Depends On:** WINT-2020, WINT-0030, WINT-0100
**Phase:** 2
**Feature:** Extract conventions, patterns, tech stack from CLAUDE.md, tech-stack docs, testing docs and populate context_cache.project_context
**Infrastructure:**

**Goal:** Cache static project knowledge for agent retrieval

**Risk Notes:** Must keep cache in sync when docs change

---

### WINT-2040: Populate Agent Mission Cache

**Status:** pending
**Depends On:** WINT-2020, WINT-0030, WINT-0100
**Phase:** 2
**Feature:** Parse all 115 .agent.md files, extract mission/scope/signals, populate context_cache.agent_missions
**Infrastructure:**
- agent metadata parser

**Goal:** Cache agent identity for quick retrieval

**Risk Notes:** Parser must handle various frontmatter formats

---

### WINT-2050: Populate Domain Knowledge Cache

**Status:** pending
**Depends On:** WINT-2020, WINT-0030, WINT-0100
**Phase:** 2
**Feature:** Extract domain patterns, ADRs, blockers, lessons from docs/ and populate context_cache.domain_kb
**Infrastructure:**
- docs parser

**Goal:** Cache domain knowledge by area (frontend, backend, testing, etc.)

**Risk Notes:** Domain categorization may need manual review

---

### WINT-2060: Populate Library Cache

**Status:** pending
**Depends On:** WINT-2020, WINT-0030, WINT-0100
**Phase:** 2
**Feature:** Cache common library patterns (React 19, Tailwind, Zod, Vitest) from existing code examples and docs
**Infrastructure:**
- code example extractor

**Goal:** Cache library usage patterns for agent reference

**Risk Notes:** Must stay current with library updates

---

### WINT-2070: Implement Cache Warming Strategy

**Status:** pending
**Depends On:** WINT-2030, WINT-2040, WINT-2050, WINT-2060
**Phase:** 2
**Feature:** Create cache-warm skill that pre-populates all caches before workflow starts
**Infrastructure:**
- new skill

**Goal:** Ensure caches are fresh before high-volume operations

**Risk Notes:** Warming all caches may be slow

---

### WINT-2080: Create context-warmer Agent

**Status:** pending
**Depends On:** WINT-2070
**Phase:** 2
**Feature:** Create haiku-powered worker agent that implements cache-warm skill
**Infrastructure:**
- new agent file

**Goal:** Execute cache warming when triggered

**Risk Notes:** Must handle partial failures gracefully

---

### WINT-2090: Implement Session Context Management

**Status:** pending
**Depends On:** WINT-0110
**Phase:** 2
**Feature:** Create session-create, session-inherit skills for leader→worker context sharing
**Infrastructure:**
- new skills

**Goal:** Enable stateful workflows with shared context

**Risk Notes:** Session cleanup strategy needed

---

### WINT-2100: Create session-manager Agent

**Status:** pending
**Depends On:** WINT-2090
**Phase:** 2
**Feature:** Create haiku-powered worker agent that manages session lifecycle
**Infrastructure:**
- new agent file

**Goal:** Handle session creation, updates, cleanup

**Risk Notes:** Must prevent session leaks

---

### WINT-2110: Update 5 High-Volume Agents to Use Cache

**Status:** pending
**Depends On:** WINT-2030, WINT-2040, WINT-2050, WINT-2060, WINT-0100
**Phase:** 2
**Feature:** Update pm-bootstrap-workflow, dev-implement-story, elab-story, qa-verify-story, dev-fix-story to use context cache
**Infrastructure:**

**Goal:** Achieve initial token reduction in most active agents

**Risk Notes:** Must measure token usage before/after

---

### WINT-2120: Measure Token Reduction

**Status:** pending
**Depends On:** WINT-2110
**Phase:** 2
**Feature:** Run benchmark comparing token usage before/after cache implementation, target 80% reduction
**Infrastructure:**
- benchmark scripts

**Goal:** Validate cache effectiveness

**Risk Notes:** May need cache tuning if targets not met

---

## Phase 3: Telemetry

Telemetry phase - Gatekeeper sidecar, invocation logging, HiTL capture, full observability for all agent actions

### WINT-3010: Create Gatekeeper Sidecar

**Status:** pending
**Depends On:** WINT-2020
**Phase:** 3
**Feature:** Create gatekeeper sidecar at POST /gate/check for stages: POST_BOOTSTRAP, ELAB_COMPLETE, SCOPE_OK, PATCH_COMPLETE with "proof or it didn't happen" enforcement
**Infrastructure:**
- packages/backend/sidecars/gatekeeper/
- HTTP endpoint + MCP tool wrapper

**Goal:** Centralize gate enforcement, block vibes-based approvals

**Risk Notes:** Must not block legitimate completions

---

### WINT-3020: Implement Invocation Logging

**Status:** pending
**Depends On:** WINT-0120
**Phase:** 3
**Feature:** Create telemetry-log skill that logs every agent spawn with tokens, latency, success/failure to telemetry.agent_invocations
**Infrastructure:**
- new skill

**Goal:** Track all agent activity for analysis

**Risk Notes:** High-frequency writes need batching

---

### WINT-3030: Create telemetry-logger Agent

**Status:** pending
**Depends On:** WINT-3010
**Phase:** 3
**Feature:** Create haiku-powered worker agent that implements telemetry logging
**Infrastructure:**
- new agent file

**Goal:** Execute telemetry logging when triggered

**Risk Notes:** Must not add significant latency to workflows

---

### WINT-3040: Implement Decision Logging with Embeddings

**Status:** pending
**Depends On:** WINT-0120
**Phase:** 3
**Feature:** Create telemetry-decision skill that logs HiTL decisions with context embeddings to telemetry.hitl_decisions
**Infrastructure:**
- new skill
- embedding generation

**Goal:** Capture human decisions for preference learning

**Risk Notes:** Embedding generation adds latency

---

### WINT-3050: Implement Outcome Logging

**Status:** pending
**Depends On:** WINT-0120
**Phase:** 3
**Feature:** Add workflow_log_outcome calls at story completion to track quality_score, tokens, cost, churn
**Infrastructure:**

**Goal:** Track story-level outcomes for quality prediction

**Risk Notes:** Quality scoring needs clear definition

---

### WINT-3060: Create Telemetry Query Command

**Status:** pending
**Depends On:** WINT-3010, WINT-3030, WINT-3040
**Phase:** 3
**Feature:** Create /telemetry command that shows story-level telemetry: agent invocations, decisions, outcomes
**Infrastructure:**
- new command

**Goal:** Enable human review of telemetry data

**Risk Notes:** Query performance needs optimization

---

### WINT-3070: Update 10 Core Workflow Agents with Telemetry

**Status:** pending
**Depends On:** WINT-3020
**Phase:** 3
**Feature:** Add telemetry-log calls to workflow orchestrators: pm-bootstrap-workflow, elab-epic, elab-story, dev-implement-story, dev-fix-story, qa-verify-story, pm-refine-story, story-status, story-update, story-move
**Infrastructure:**

**Goal:** Capture telemetry from primary workflow paths

**Risk Notes:** Must not break existing workflows

---

### WINT-3080: Validate Telemetry Collection

**Status:** pending
**Depends On:** WINT-3060
**Phase:** 3
**Feature:** Run full story workflow, verify all invocations and decisions are logged correctly
**Infrastructure:**

**Goal:** Ensure telemetry system is working end-to-end

**Risk Notes:** May discover missing instrumentation points

---

### WINT-3090: Add Scoreboard Metrics to Telemetry

**Status:** pending
**Depends On:** WINT-3020, WINT-3050
**Phase:** 3
**Feature:** Add scoreboard metrics tracking: % stories reaching QA with "missing functionality" findings, Dev↔QA loop count, typecheck/lint failures reaching QA (target: zero), tokens spent in loops vs forward progress ratio, PO blocking findings trend over time. Create views/queries for dashboard.
**Infrastructure:**
- telemetry.scoreboard_metrics table
- Aggregation views

**Goal:** Prove adversarial layer is working with measurable improvement trends

**Risk Notes:** Need baseline measurements before tracking improvement

---

### WINT-3100: Create State Transition Event Log

**Status:** pending
**Depends On:** WINT-0040
**Phase:** 3
**Feature:** Create event log table tracking state transitions: story_id, from_state, to_state, timestamp, reason, actor (agent/user). Enable bottleneck analysis by gate failure frequency, time-in-state metrics, and churn tracking (Dev↔Repair, QA↔Dev, Elab↔Fix-story loops).
**Infrastructure:**
- telemetry.state_transitions table
- telemetry.bottleneck_analysis view
- telemetry.churn_metrics view

**Goal:** Identify workflow bottlenecks and quantify churn per phase/feature/capability

**Risk Notes:** High-frequency writes need efficient indexing strategy

---

## Phase 4: Graph & Cohesion

Graph & cohesion phase - Cohesion/Rules sidecars, capabilities, rules, PO agent for completeness detection and franken-feature prevention

### WINT-4010: Create Cohesion Sidecar

**Status:** pending
**Depends On:** WINT-2020, WINT-1080
**Phase:** 4
**Feature:** Create cohesion sidecar at POST /cohesion/audit (post-bootstrap) and POST /cohesion/check (gates) to detect Franken-features and capability gaps
**Infrastructure:**
- packages/backend/sidecars/cohesion/
- HTTP endpoint + MCP tool wrapper

**Goal:** Compute lifecycle/capability coverage, detect incomplete features

**Risk Notes:** Must accurately parse story index and graph data

---

### WINT-4020: Create Rules Registry Sidecar

**Status:** pending
**Depends On:** WINT-2020
**Phase:** 4
**Feature:** Create rules registry sidecar at GET/POST /rules for enforceable rules from retros with propose/promote workflow
**Infrastructure:**
- packages/backend/sidecars/rules-registry/
- HTTP endpoint + MCP tool wrapper

**Goal:** Convert retrospective learnings into enforceable gates/lints/prompt injections

**Risk Notes:** Rule conflicts need resolution strategy

---

### WINT-4030: Populate Graph with Existing Features

**Status:** pending
**Depends On:** WINT-0060, WINT-0130
**Phase:** 4
**Feature:** Scan all existing features, populate graph.epics and graph.features tables
**Infrastructure:**
- graph population script

**Goal:** Build initial graph from current codebase

**Risk Notes:** Feature extraction may need manual validation

---

### WINT-4040: Infer Existing Capabilities

**Status:** pending
**Depends On:** WINT-4010
**Phase:** 4
**Feature:** Analyze existing stories to infer which capabilities (create/view/edit/delete/upload/replace/download) each feature has, populate graph.feature_capabilities
**Infrastructure:**
- capability inference script

**Goal:** Build capability graph from historical data

**Risk Notes:** Inference may miss capabilities, need validation

---

### WINT-4050: Create Cohesion Rules

**Status:** pending
**Depends On:** WINT-4020
**Phase:** 4
**Feature:** Define rules: features with 'create' need 'delete', features with 'upload' need 'replace', etc.
**Infrastructure:**
- rules table

**Goal:** Formalize cohesion requirements

**Risk Notes:** Rules may need exceptions

---

### WINT-4060: Create graph-checker Agent

**Status:** pending
**Depends On:** WINT-4030, WINT-0130
**Phase:** 4
**Feature:** Create haiku-powered worker agent that queries graph views (franken_features, capability_coverage) and applies rules
**Infrastructure:**
- new agent file

**Goal:** Detect incomplete features automatically

**Risk Notes:** Must provide actionable feedback

---

### WINT-4070: Create cohesion-prosecutor Agent (PO Role)

**Status:** pending
**Depends On:** WINT-4040
**Phase:** 4
**Feature:** Create sonnet-powered worker agent that acts as Product Owner, ensuring features have all necessary CRUD capabilities before marking complete
**Infrastructure:**
- new agent file

**Goal:** Enforce feature completeness at workflow gates

**Risk Notes:** May create friction if too strict

---

### WINT-4080: Create scope-defender Agent (Devil's Advocate)

**Status:** pending
**Depends On:** none
**Phase:** 4
**Feature:** Create haiku-powered worker agent that challenges non-MVP features and defers to backlog
**Infrastructure:**
- new agent file

**Goal:** Prevent scope creep during implementation

**Risk Notes:** Needs clear MVP definition

---

### WINT-4090: Create evidence-judge Agent

**Status:** pending
**Depends On:** none
**Phase:** 4
**Feature:** Create haiku-powered worker agent that requires proof for all acceptance criteria, no vibes-based approval
**Infrastructure:**
- new agent file

**Goal:** Ensure rigorous QA standards

**Risk Notes:** May slow down approvals

---

### WINT-4100: Create backlog-curator Agent

**Status:** pending
**Depends On:** WINT-4060
**Phase:** 4
**Feature:** Create haiku-powered worker agent that manages deferred items and surfaces for PM review
**Infrastructure:**
- new agent file

**Goal:** Properly capture and track deferred work

**Risk Notes:** Backlog management strategy needed

---

### WINT-4110: Create Cohesion Check Command

**Status:** pending
**Depends On:** WINT-4040
**Phase:** 4
**Feature:** Create /cohesion-check command that spawns graph-checker agent for a given feature
**Infrastructure:**
- new command

**Goal:** Enable manual cohesion verification

**Risk Notes:** Should auto-run at story completion

---

### WINT-4120: Integrate Cohesion Checks into Workflow

**Status:** pending
**Depends On:** WINT-4050, WINT-4090
**Phase:** 4
**Feature:** Add cohesion-prosecutor calls to qa-verify-story and dev-implement-story workflows
**Infrastructure:**

**Goal:** Automate cohesion enforcement

**Risk Notes:** Must handle failures gracefully

---

### WINT-4130: Validate Graph & Cohesion System

**Status:** pending
**Depends On:** WINT-4100
**Phase:** 4
**Feature:** Test on existing franken-features (upload without replace, create without delete), verify detection and enforcement
**Infrastructure:**

**Goal:** Ensure graph system catches real issues

**Risk Notes:** May need rule tuning

---

### WINT-4140: Create Round Table Agent

**Status:** pending
**Depends On:** WINT-4070, WINT-4080
**Phase:** 4
**Feature:** Create haiku-powered worker agent that performs mechanical synthesis after PO and DA complete. Round Table converges findings into final-scope.json—NO brainstorming, NO new ideas. Takes PO cohesion-findings + DA scope-challenges + elab gaps and produces authoritative final scope with explicit followups deferred.
**Infrastructure:**
- .claude/agents/round-table.agent.md

**Goal:** Converge adversarial outputs into single actionable scope without debate

**Risk Notes:** Must strictly enforce "synthesis only" constraint

---

### WINT-4150: Standardize Elab Output Artifacts

**Status:** pending
**Depends On:** WINT-4140, WINT-0200
**Phase:** 4
**Feature:** Define and enforce standard elab output artifacts: story-brief.md, gaps.json (blocking/non-blocking split), user-flows.json (per schema), cohesion-findings.json (max 5/2 blocking), mvp-slice.json, scope-challenges.json (max 5), final-scope.json (+ followups), evidence-expectations.json. Add validation to elab-complete gate.
**Infrastructure:**
- schemas/ for each JSON artifact
- Gate validation logic

**Goal:** Consistent, machine-readable elab outputs for downstream consumption

**Risk Notes:** Existing elab agents need updates to produce new artifact format

---

## Phase 5: ML Pipeline

ML pipeline phase - HiTL sidecar, router, quality predictor, preferences for smart automation with 85%+ accuracy

### WINT-5010: Create HiTL Interview Sidecar

**Status:** pending
**Depends On:** WINT-2020, WINT-3040
**Phase:** 5
**Feature:** Create HiTL interview sidecar at POST /hitl/should-interview, /hitl/build-interview, /hitl/apply-decisions for decision cards and quick overrides
**Infrastructure:**
- packages/backend/sidecars/hitl-interview/
- HTTP endpoint + MCP tool wrapper

**Goal:** Flag-driven decision cards, reduce unnecessary HiTL prompts

**Risk Notes:** Must not auto-accept dangerous decisions

---

### WINT-5020: Create Classification Agent

**Status:** pending
**Depends On:** WINT-3030
**Phase:** 5
**Feature:** Create haiku-powered worker agent that classifies decisions as MVP/Feature/Moonshot/Critical
**Infrastructure:**
- new agent file

**Goal:** Categorize decisions for routing and learning

**Risk Notes:** Classification accuracy needs validation

---

### WINT-5030: Create classify-decision Skill

**Status:** pending
**Depends On:** WINT-5010
**Phase:** 5
**Feature:** Create skill that invokes classification agent at decision points
**Infrastructure:**
- new skill

**Goal:** Integrate classification into workflows

**Risk Notes:** Adds latency to decision flow

---

### WINT-5040: Collect ML Training Data

**Status:** pending
**Depends On:** WINT-3070
**Phase:** 5
**Feature:** Wait for 30-50 stories of telemetry data (invocations, decisions, outcomes) before training models
**Infrastructure:**

**Goal:** Ensure sufficient training data

**Risk Notes:** May take several weeks to accumulate

---

### WINT-5050: Train Model Router (LightGBM)

**Status:** pending
**Depends On:** WINT-5030
**Phase:** 5
**Feature:** Train LightGBM model on task features → model choice (haiku/sonnet) with 85%+ accuracy target
**Infrastructure:**
- Python ML environment
- model storage

**Goal:** Automate model selection for agents

**Risk Notes:** Model accuracy depends on training data quality

---

### WINT-5060: Train Quality Predictor (XGBoost)

**Status:** pending
**Depends On:** WINT-5030
**Phase:** 5
**Feature:** Train XGBoost model on story features → quality_score prediction
**Infrastructure:**
- Python ML environment
- model storage

**Goal:** Predict story outcomes before starting

**Risk Notes:** Quality scoring needs clear definition

---

### WINT-5070: Train Preference Learner (Random Forest)

**Status:** pending
**Depends On:** WINT-5030
**Phase:** 5
**Feature:** Train Random Forest on decision context embeddings → user choice with confidence
**Infrastructure:**
- Python ML environment
- model storage

**Goal:** Enable auto-accept for high-confidence predictions

**Risk Notes:** Must avoid dangerous auto-accepts

---

### WINT-5080: Create model-recommender Agent

**Status:** pending
**Depends On:** WINT-5040, WINT-0140
**Phase:** 5
**Feature:** Create haiku-powered worker agent that queries trained model router
**Infrastructure:**
- new agent file

**Goal:** Serve model recommendations to workflows

**Risk Notes:** Must handle cold-start (no model yet)

---

### WINT-5090: Create preference-predictor Agent

**Status:** pending
**Depends On:** WINT-5060, WINT-0140
**Phase:** 5
**Feature:** Create haiku-powered worker agent that queries preference learner
**Infrastructure:**
- new agent file

**Goal:** Predict user choices at decision points

**Risk Notes:** Must show confidence level

---

### WINT-5100: Create predict-preference Skill

**Status:** pending
**Depends On:** WINT-5080
**Phase:** 5
**Feature:** Create skill that calls preference-predictor before HiTL prompts, auto-accepts if confidence > 90%
**Infrastructure:**
- new skill

**Goal:** Reduce HiTL prompts from 10-15 to 3-5 per story

**Risk Notes:** Must allow override of auto-accepts

---

### WINT-5110: Create Model Recommendation Command

**Status:** pending
**Depends On:** WINT-5070
**Phase:** 5
**Feature:** Create /model-recommend command for manual model selection queries
**Infrastructure:**
- new command

**Goal:** Enable explicit model recommendations

**Risk Notes:** Should integrate into agent spawning

---

### WINT-5120: Create Preference Check Command

**Status:** pending
**Depends On:** WINT-5080
**Phase:** 5
**Feature:** Create /preference-check command to test predictions before committing
**Infrastructure:**
- new command

**Goal:** Allow testing of preference predictions

**Risk Notes:** Useful for debugging but not for production

---

### WINT-5130: Integrate ML into 5 High-Volume Workflows

**Status:** pending
**Depends On:** WINT-5090
**Phase:** 5
**Feature:** Add predict-preference skill to pm-refine-story, dev-implement-story, qa-verify-story, dev-fix-story, elab-story
**Infrastructure:**

**Goal:** Achieve HiTL reduction in primary workflows

**Risk Notes:** Must measure HiTL reduction before/after

---

### WINT-5140: Measure ML Effectiveness

**Status:** pending
**Depends On:** WINT-5120
**Phase:** 5
**Feature:** Run benchmark comparing HiTL prompts, auto-accept accuracy (target 90%), model routing accuracy (target 85%)
**Infrastructure:**
- benchmark scripts

**Goal:** Validate ML pipeline effectiveness

**Risk Notes:** May need model retraining if targets not met

---

## Phase 6: Batch Mode

Batch mode phase - Unattended processing, weekly reports, 5-10 stories hands-off

### WINT-6010: Create batch-coordinator Agent

**Status:** pending
**Depends On:** WINT-5090
**Phase:** 6
**Feature:** Create sonnet-powered leader agent that orchestrates multi-story processing with minimal human intervention
**Infrastructure:**
- new agent file

**Goal:** Enable batch processing of 5-10 stories

**Risk Notes:** Error handling must be robust

---

### WINT-6020: Create Batch Process Command

**Status:** pending
**Depends On:** WINT-6010
**Phase:** 6
**Feature:** Create /batch-process command that takes epic + count, spawns batch-coordinator with story queue
**Infrastructure:**
- new command

**Goal:** Trigger unattended batch workflows

**Risk Notes:** Must handle partial failures gracefully

---

### WINT-6030: Create Batch Status Command

**Status:** pending
**Depends On:** WINT-6020
**Phase:** 6
**Feature:** Create /batch-status command that shows progress of current batch operation
**Infrastructure:**
- new command

**Goal:** Monitor batch progress without interruption

**Risk Notes:** Needs real-time updates

---

### WINT-6040: Create batch-summary Skill

**Status:** pending
**Depends On:** WINT-6010
**Phase:** 6
**Feature:** Create skill that generates completion report after batch run: successes, failures, tokens, time
**Infrastructure:**
- new skill

**Goal:** Provide batch outcome summary

**Risk Notes:** Summary needs actionable insights

---

### WINT-6050: Implement Batch Queue with Approval Gate

**Status:** pending
**Depends On:** WINT-6040
**Phase:** 6
**Feature:** Queue completed stories for review before merge, with summary report
**Infrastructure:**
- queue management

**Goal:** Allow human review before batch merge

**Risk Notes:** Queue may grow if not reviewed regularly

---

### WINT-6060: Create weekly-analyst Agent

**Status:** pending
**Depends On:** WINT-3070
**Phase:** 6
**Feature:** Create sonnet-powered worker agent that analyzes week's telemetry and generates improvement recommendations
**Infrastructure:**
- new agent file

**Goal:** Enable continuous workflow improvement

**Risk Notes:** Analysis quality depends on telemetry richness

---

### WINT-6070: Create Weekly Report Command

**Status:** pending
**Depends On:** WINT-6060
**Phase:** 6
**Feature:** Create /weekly-report command that spawns weekly-analyst
**Infrastructure:**
- new command

**Goal:** Trigger weekly analysis on demand

**Risk Notes:** Should also run automatically

---

### WINT-6080: Test Batch Processing on 5 Stories

**Status:** pending
**Depends On:** WINT-6050
**Phase:** 6
**Feature:** Run batch-process on small epic with 5 stories, validate end-to-end flow
**Infrastructure:**

**Goal:** Ensure batch mode works before scaling

**Risk Notes:** May reveal edge cases

---

### WINT-6090: Test Batch Processing on 10 Stories

**Status:** pending
**Depends On:** WINT-6080
**Phase:** 6
**Feature:** Run batch-process on medium epic with 10 stories, measure token usage and time
**Infrastructure:**

**Goal:** Validate batch scalability

**Risk Notes:** May hit rate limits or performance issues

---

## Phase 7: Migration

Migration phase - Update all 52 agents, sync docs, achieve zero directory references

### WINT-7010: Audit Agent Directory References

**Status:** pending
**Depends On:** none
**Phase:** 7
**Feature:** Scan all 115 .agent.md files for references to swim-lane directories (backlog/ready/in-progress/UAT/done)
**Infrastructure:**
- audit script

**Goal:** Identify all agents needing migration

**Risk Notes:** Some references may be in comments or examples

---

### WINT-7020: Create Agent Migration Plan

**Status:** pending
**Depends On:** WINT-7010
**Phase:** 7
**Feature:** Categorize 52 agents by risk, create migration order (5-10 per iteration)
**Infrastructure:**
- migration plan doc

**Goal:** Systematic migration strategy

**Risk Notes:** High-risk agents need careful testing

---

### WINT-7030: Migrate Batch 1 Agents (Story Management)

**Status:** pending
**Depends On:** WINT-7020, WINT-1080
**Phase:** 7
**Feature:** Update story-status, story-update, story-move, index-update agents to use DB exclusively
**Infrastructure:**

**Goal:** Migrate core story management agents

**Risk Notes:** Critical path agents, need thorough testing

---

### WINT-7040: Migrate Batch 2 Agents (Workflow Orchestration)

**Status:** pending
**Depends On:** WINT-7030
**Phase:** 7
**Feature:** Update pm-bootstrap-workflow, elab-epic, elab-story, pm-refine-story, workflow-batch agents
**Infrastructure:**

**Goal:** Migrate workflow orchestrators

**Risk Notes:** Complex agents, may need extensive changes

---

### WINT-7050: Migrate Batch 3 Agents (Development)

**Status:** pending
**Depends On:** WINT-7040
**Phase:** 7
**Feature:** Update dev-implement-story, dev-code-review, dev-fix-story agents
**Infrastructure:**

**Goal:** Migrate development workflow agents

**Risk Notes:** High-volume agents, performance critical

---

### WINT-7060: Migrate Batch 4 Agents (QA)

**Status:** pending
**Depends On:** WINT-7050
**Phase:** 7
**Feature:** Update qa-verify-story, qa-gate, evidence-judge agents
**Infrastructure:**

**Goal:** Migrate QA workflow agents

**Risk Notes:** Quality gates must remain rigorous

---

### WINT-7070: Migrate Batch 5 Agents (Review)

**Status:** pending
**Depends On:** WINT-7060
**Phase:** 7
**Feature:** Update review, review-draft-story, architect-review, ui-ux-review agents
**Infrastructure:**

**Goal:** Migrate review workflow agents

**Risk Notes:** Review quality must not degrade

---

### WINT-7080: Migrate Batch 6 Agents (Reporting)

**Status:** pending
**Depends On:** WINT-7070
**Phase:** 7
**Feature:** Update token-log, token-report, calibration-report, workflow-retro, scrum-master agents
**Infrastructure:**

**Goal:** Migrate reporting and analysis agents

**Risk Notes:** Historical data queries may need adjustment

---

### WINT-7090: Migrate Batch 7 Agents (Utility)

**Status:** pending
**Depends On:** WINT-7080
**Phase:** 7
**Feature:** Update remaining agents: feedback, checkpoint, precondition-check, context-init, pm-fix-story, pm-generate-story-000-harness
**Infrastructure:**

**Goal:** Complete agent migration

**Risk Notes:** Final cleanup of low-frequency agents

---

### WINT-7100: Remove Compatibility Shim

**Status:** pending
**Depends On:** WINT-7090
**Phase:** 7
**Feature:** Remove directory fallback code from compatibility shim, make DB-only
**Infrastructure:**

**Goal:** Eliminate dual-source complexity

**Risk Notes:** Must ensure all agents migrated first

---

### WINT-7110: Run Full Workflow Test Suite

**Status:** pending
**Depends On:** WINT-7100
**Phase:** 7
**Feature:** Execute complete story workflow (bootstrap → elab → dev → QA → done) using only DB queries
**Infrastructure:**

**Goal:** Validate end-to-end migration

**Risk Notes:** May discover edge cases or regressions

---

### WINT-7120: Final Documentation Sync

**Status:** pending
**Depends On:** WINT-7110
**Phase:** 7
**Feature:** Run doc-sync to update all docs with final agent states, workflow changes, and new capabilities
**Infrastructure:**

**Goal:** Ensure docs reflect completed migration

**Risk Notes:** Large doc update, need careful review

---

### WINT-7130: Archive Legacy Directory Structure

**Status:** pending
**Depends On:** WINT-7120
**Phase:** 7
**Feature:** Document legacy swim-lane structure for reference, mark as deprecated
**Infrastructure:**

**Goal:** Preserve historical context

**Risk Notes:** Don't delete directories, just document

---

## Phase 8: Backlog Management

Backlog management phase - Storage, refinement, and promotion of post-MVP items with PO-driven prioritization

### WINT-8010: Add Backlog Status to Stories Schema

**Status:** pending
**Depends On:** WINT-1010
**Phase:** 8
**Feature:** Extend core.stories table to support status='backlog' with priority, source, and category fields
**Infrastructure:**
- core.stories table extension
- Migration script

**Goal:** Unified storage for backlog items in stories table

**Risk Notes:** Schema migration on existing data

---

### WINT-8020: Create Backlog MCP Tools

**Status:** pending
**Depends On:** WINT-8010
**Phase:** 8
**Feature:** Add MCP tools: backlog_add, backlog_list, backlog_prioritize, backlog_promote
**Infrastructure:**
- postgres-knowledgebase MCP extension

**Goal:** Programmatic backlog management

**Risk Notes:** Input validation for user-provided content

---

### WINT-8030: Create /backlog-add Command

**Status:** pending
**Depends On:** WINT-8020
**Phase:** 8
**Feature:** Command to capture new backlog items with title, description, category, source
**Infrastructure:**
- .claude/commands/backlog-add.md

**Goal:** Easy capture of ideas and deferred work

**Risk Notes:** None - simple CRUD

---

### WINT-8040: Create /backlog-review Command

**Status:** pending
**Depends On:** WINT-8020
**Phase:** 8
**Feature:** On-demand refinement session: PO agent presents items, user provides priority input, updates stored
**Infrastructure:**
- .claude/commands/backlog-review.md
- backlog-curator agent

**Goal:** Interactive prioritization with user input

**Risk Notes:** User fatigue if too many items - need pagination

---

### WINT-8050: Create /backlog-promote Command

**Status:** pending
**Depends On:** WINT-8040
**Phase:** 8
**Feature:** Convert backlog item to active story: assign phase, generate story ID, update status
**Infrastructure:**
- .claude/commands/backlog-promote.md

**Goal:** Seamless transition from idea to actionable story

**Risk Notes:** Must validate phase assignment and dependencies

---

### WINT-8060: Integrate scope-defender with Backlog

**Status:** pending
**Depends On:** WINT-8030, WINT-4060
**Phase:** 8
**Feature:** When scope-defender defers items, automatically add to backlog with source='scope-defender'
**Infrastructure:**
- scope-defender agent update

**Goal:** Automatic capture of deferred scope

**Risk Notes:** May generate many low-priority items

---

### WINT-8070: Create backlog-curator Agent

**Status:** pending
**Depends On:** WINT-8020
**Phase:** 8
**Feature:** PO agent for backlog management: prioritization logic, category suggestions, promotion recommendations
**Infrastructure:**
- .claude/agents/backlog-curator.agent.md

**Goal:** Intelligent backlog curation with user collaboration

**Risk Notes:** Balance automation vs user control

---

### WINT-8080: Import FUTURE-ROADMAP Items

**Status:** pending
**Depends On:** WINT-8010
**Phase:** 8
**Feature:** One-time import of 15 items from FUTURE-ROADMAP.yaml into backlog with source='epic-elaboration'
**Infrastructure:**
- Migration script

**Goal:** Seed backlog with known future work

**Risk Notes:** Ensure no duplicates

---

### WINT-8090: Add Backlog Metrics to Dashboard

**Status:** pending
**Depends On:** WINT-8070
**Phase:** 8
**Feature:** Track backlog size, age, promotion rate, source distribution in telemetry
**Infrastructure:**
- telemetry.backlog_metrics table

**Goal:** Visibility into backlog health

**Risk Notes:** None

---

## Phase 9: LangGraph Parity

LangGraph parity phase - Port all WINT agents to LangGraph nodes for full feature parity between workflows

### WINT-9010: Create Shared Business Logic Package

**Status:** pending
**Depends On:** WINT-1100
**Phase:** 9
**Feature:** Extract business logic from agents into shared TypeScript package that both Claude Code MCP tools and LangGraph nodes can use
**Infrastructure:**
- packages/backend/workflow-logic/

**Goal:** Single implementation, two execution paths

**Risk Notes:** Must maintain clean separation from runtime concerns

---

### WINT-9020: Create doc-sync LangGraph Node

**Status:** pending
**Depends On:** WINT-9010, WINT-0160
**Phase:** 9
**Feature:** Port doc-sync agent logic to LangGraph node at nodes/sync/doc-sync.ts
**Infrastructure:**
- packages/backend/orchestrator/src/nodes/sync/

**Goal:** Documentation sync works in both workflows

**Risk Notes:** Must produce identical outputs

---

### WINT-9030: Create cohesion-prosecutor LangGraph Node

**Status:** pending
**Depends On:** WINT-9010, WINT-4010
**Phase:** 9
**Feature:** Port cohesion-prosecutor agent to LangGraph node at nodes/story/cohesion-check.ts
**Infrastructure:**
- packages/backend/orchestrator/src/nodes/story/

**Goal:** Feature cohesion checks work in both workflows

**Risk Notes:** Graph queries must work identically

---

### WINT-9040: Create scope-defender LangGraph Node

**Status:** pending
**Depends On:** WINT-9010, WINT-4060
**Phase:** 9
**Feature:** Port scope-defender agent to LangGraph node at nodes/story/scope-defend.ts
**Infrastructure:**
- packages/backend/orchestrator/src/nodes/story/

**Goal:** Scope defense works in both workflows

**Risk Notes:** Must integrate with backlog in same way

---

### WINT-9050: Create evidence-judge LangGraph Node

**Status:** pending
**Depends On:** WINT-9010, WINT-4070
**Phase:** 9
**Feature:** Port evidence-judge agent to LangGraph node at nodes/qa/evidence-judge.ts
**Infrastructure:**
- packages/backend/orchestrator/src/nodes/qa/

**Goal:** Evidence-based QA works in both workflows

**Risk Notes:** None

---

### WINT-9060: Create batch-coordinator LangGraph Graph

**Status:** pending
**Depends On:** WINT-9020, WINT-9030, WINT-9040, WINT-9050
**Phase:** 9
**Feature:** Port batch-coordinator leader agent to LangGraph graph that orchestrates batch story processing
**Infrastructure:**
- packages/backend/orchestrator/src/graphs/batch-process.ts

**Goal:** Batch mode works in both workflows

**Risk Notes:** Must handle failures/retries identically

---

### WINT-9070: Create backlog-curator LangGraph Node

**Status:** pending
**Depends On:** WINT-9010, WINT-8070
**Phase:** 9
**Feature:** Port backlog-curator agent to LangGraph node at nodes/backlog/curator.ts
**Infrastructure:**
- packages/backend/orchestrator/src/nodes/backlog/

**Goal:** Backlog management works in both workflows

**Risk Notes:** User interaction patterns may differ

---

### WINT-9080: Create ML Pipeline LangGraph Nodes

**Status:** pending
**Depends On:** WINT-9010, WINT-5070
**Phase:** 9
**Feature:** Port model-recommender, preference-predictor, classification-agent to LangGraph nodes
**Infrastructure:**
- packages/backend/orchestrator/src/nodes/ml/

**Goal:** ML-driven automation works in both workflows

**Risk Notes:** Model loading/inference must be consistent

---

### WINT-9090: Create Context Cache LangGraph Nodes

**Status:** pending
**Depends On:** WINT-9010, WINT-2100
**Phase:** 9
**Feature:** Port context-warmer, session-manager to LangGraph nodes
**Infrastructure:**
- packages/backend/orchestrator/src/nodes/context/

**Goal:** Context caching works in both workflows

**Risk Notes:** Cache invalidation must be synchronized

---

### WINT-9100: Create Telemetry LangGraph Nodes

**Status:** pending
**Depends On:** WINT-9010, WINT-3070
**Phase:** 9
**Feature:** Port telemetry-logger to LangGraph node, ensure all node invocations logged
**Infrastructure:**
- packages/backend/orchestrator/src/nodes/telemetry/

**Goal:** Full observability in both workflows

**Risk Notes:** None

---

### WINT-9110: Create Full Workflow LangGraph Graphs

**Status:** pending
**Depends On:** WINT-9060, WINT-9070, WINT-9080, WINT-9090, WINT-9100
**Phase:** 9
**Feature:** Create complete LangGraph graphs for: bootstrap, elab-epic, elab-story, dev-implement, qa-verify, backlog-review
**Infrastructure:**
- packages/backend/orchestrator/src/graphs/

**Goal:** All major workflows executable via LangGraph

**Risk Notes:** Complex orchestration - test thoroughly

---

### WINT-9120: Create Workflow Parity Test Suite

**Status:** pending
**Depends On:** WINT-9110
**Phase:** 9
**Feature:** Create test suite that runs same inputs through both Claude Code and LangGraph, verifies identical outputs
**Infrastructure:**
- packages/backend/orchestrator/src/__tests__/parity/

**Goal:** Guarantee feature parity

**Risk Notes:** May reveal subtle differences to fix

---

### WINT-9130: Document Migration Path

**Status:** pending
**Depends On:** WINT-9120
**Phase:** 9
**Feature:** Create documentation for migrating from Claude Code to LangGraph workflow, including feature comparison and decision guide
**Infrastructure:**
- docs/workflow/langraph-migration.md

**Goal:** Clear guidance for workflow transition

**Risk Notes:** None

---

### WINT-9140: Validate LangGraph Parity Phase

**Status:** pending
**Depends On:** WINT-9120, WINT-9130
**Phase:** 9
**Feature:** Execute complete workflow in both systems, verify parity, sign off on Phase 9 completion
**Infrastructure:**

**Goal:** Confirm full feature parity achieved

**Risk Notes:** May require iterations to fix parity gaps

---
