---
doc_type: stories_index
title: "KNOW Stories Index"
status: active
story_prefix: "KNOW"
created_at: "2026-01-24T23:55:00Z"
updated_at: "2026-01-31T00:00:00Z"
---

# KNOW Stories Index

A focused knowledge base MCP server for capturing and retrieving institutional knowledge.

## Progress Summary

| Status | Count |
|--------|-------|
| completed | 9 |
| uat | 7 |
| in-progress | 0 |
| ready-for-code-review | 0 |
| ready-for-qa | 2 |
| ready-to-work | 0 |
| elaboration | 0 |
| backlog | 6 |
| deferred | 6 |
| cancelled | 1 |

**Goal:** Get to a working, usable KB. Then iterate based on real experience.

**Archived:** 35 stories moved to `stories-future.index.md` - premature optimizations and scope creep.

---

## What's Next

**Immediate:** QA and ship KNOW-006 and KNOW-007. Then you have a working KB.

**After that:** Use it for 2-3 real stories. Then decide what's missing.

---

## User Acceptance Testing (UAT)

### KNOW-016: PostgreSQL Monitoring

**Status:** uat
**Depends On:** KNOW-001
**Feature:** CloudWatch dashboards, alarms, SNS alerts for PostgreSQL monitoring with disk space and no-data monitoring

**Why it matters:** Production deployment requires comprehensive observability to enable proactive incident management. Prevents silent service degradation from connection exhaustion, high CPU, disk space issues, or monitoring pipeline failures.

**Story Document:** plans/future/knowledgebase-mcp/UAT/KNOW-016/KNOW-016.md

**Implementation Summary:**
- 10 Terraform files in `infra/monitoring/`
- 7-widget CloudWatch dashboard
- 6 CloudWatch alarms (connections, CPU, memory, latency, disk, no-data)
- SNS topic with email subscription support
- Comprehensive runbook documentation in README
- Multi-environment support (staging/production)

**Code Review:** PASS (iteration 1) - All 6 workers passed, no blocking issues

**QA Verification:** PASS - All 13 acceptance criteria verified

---

### KNOW-018: Audit Logging

**Status:** uat
**Depends On:** KNOW-003
**Feature:** Comprehensive audit logging for kb_add, kb_update, kb_delete operations with retention policy

**Why it matters:** Compliance, debugging, and operational transparency require audit trails. Tracks who changed what and when.

**Story Document:** plans/future/knowledgebase-mcp/UAT/KNOW-018/KNOW-018.md

**Verification Result:** PASS - All 15 ACs verified, 30/30 tests pass with 96.37% coverage

---

### KNOW-009: MCP Tool Authorization

**Status:** uat
**Depends On:** KNOW-005
**Priority:** P0
**Feature:** Role-based access control for MCP tools (pm/dev/qa agents with tool-level authorization)

**Why it matters:** Security-critical before production deployment. Prevents unauthorized agents from accessing destructive operations like kb_delete and kb_rebuild_embeddings. Implements SEC-001 finding from epic elaboration.

**Implementation Summary:**
- Replaced `checkAccess()` stub with matrix-based authorization in `access-control.ts`
- Added authorization enforcement to all 11 tool handlers (first operation)
- Added `AGENT_ROLE` environment variable support (defaults to 'all' fail-safe)
- Implemented `AuthorizationError` class with sanitized error responses
- 124 unit tests for access control (44 matrix combinations + edge cases)
- 8 integration tests for authorization enforcement
- Performance: p95 < 0.01ms (target was <1ms)

**Access Control Matrix:**
- PM role: Full access to all 11 tools
- Dev/QA roles: Access to 8 tools (denied: kb_delete, kb_bulk_import, kb_rebuild_embeddings)
- 'all' role: Access to 8 tools (fail-safe default)

**Code Review:** PASS (iteration 1) - All 6 workers passed, 307 tests passing

**Story Document:** plans/future/knowledgebase-mcp/UAT/KNOW-009/KNOW-009.md

---

### KNOW-040: Agent Instruction Integration

**Status:** uat
**Feature:** Add KB search instructions to 5 agent files + create integration guide

**Why it matters:** Makes agents automatically query the KB before tasks, establishing KB-first workflow pattern.

**Story Document:** plans/future/knowledgebase-mcp/UAT/KNOW-040/KNOW-040.md

**Implementation Summary:**
- 5 agent files modified with "Knowledge Base Integration" sections
- Integration guide created at `.claude/KB-AGENT-INTEGRATION.md`
- Consistent trigger patterns, examples, and fallback behavior across all agents
- Character limits enforced (max 1109 chars per section, under 1500 limit)

**Code Review:** PASS (iteration 1) - All 6 workers passed, documentation-only changes

**QA Verification:** PASS - All 10 ACs verified (9 PASS, 1 N/A for runtime testing)

---

## Ready for QA

### KNOW-006: Parsers and Seeding

**Status:** ready-for-qa
**Feature:** Parsers for YAML/markdown, seed script, kb_bulk_import tool

**Why it matters:** Without this, you can't import your existing knowledge.

**Story Document:** plans/future/knowledgebase-mcp/ready-for-qa/KNOW-006/KNOW-006.md

---

### KNOW-007: Admin Tools and Polish

**Status:** ready-for-qa
**Depends On:** KNOW-006
**Feature:** kb_rebuild_embeddings, comprehensive logging, performance testing

**Why it matters:** Lets you rebuild embeddings when models change, plus production polish.

---

### KNOW-043: Lessons Learned Migration

**Status:** uat
**Depends On:** KNOW-006
**Feature:** Migrate LESSONS-LEARNED.md to KB, transition agents to write to KB

**Why it matters:** Makes the KB the canonical source of institutional knowledge, replacing fragmented markdown files with structured, searchable entries.

**Implementation Summary:**
- Migration script (`apps/api/knowledge-base/src/scripts/migrate-lessons.ts`) with auto-discovery, format variation handling, content hash deduplication
- Parser module (`apps/api/knowledge-base/src/migration/lessons-parser.ts`) with smart format detection
- Updated agent instructions for KB-first workflow (dev-implement-learnings.agent.md, dev-implement-planning-leader.agent.md)
- Deprecation notices added to existing LESSONS-LEARNED.md files
- Comprehensive documentation at `docs/knowledge-base/lessons-learned-migration.md`
- 23 unit tests covering all parsing scenarios

**Code Review:** PASS (iteration 2) - crypto import fixed, all 6 workers passed

**QA Verification:** FAIL (Missing npm dependencies: glob, uuid)

**Fix Cycle:** PASS - Added glob and uuid dependencies to apps/api/knowledge-base/package.json. All fixes verified: dependencies installed, migration script builds successfully, all 23 tests passing.

**Story Document:** plans/future/knowledgebase-mcp/UAT/KNOW-043/KNOW-043.md

---

### KNOW-048: Document Chunking (Learning Story)

**Status:** uat
**Priority:** P2 (learning opportunity)
**Depends On:** KNOW-006
**Feature:** Split long documents into chunks before importing to KB

**Implementation Summary:**
- Core chunking module (`apps/api/knowledge-base/src/chunking/`)
- Token counting with tiktoken (500 token default)
- CLI tool (`pnpm kb:chunk`) for processing markdown files
- Splits on `##` headers, falls back to paragraph boundaries
- Preserves code blocks, extracts YAML front matter as metadata
- 36 tests (28 unit + 8 integration) passing

**Story Document:** plans/future/knowledgebase-mcp/UAT/KNOW-048/KNOW-048.md

**Code Review:** PASS (iteration 1) - All 6 workers passed, no blocking issues

---

---

## Deferred Stories

These stories depend on AWS RDS infrastructure that is not currently in use (project uses local Docker PostgreSQL). Revisit if AWS RDS deployment is planned.

### KNOW-058: Connection Pool Metrics Monitoring (DEFERRED)

**Status:** deferred
**Depends On:** KNOW-016
**Story Points:** 2
**Feature:** Add connection pool metrics to PostgreSQL monitoring via RDS Enhanced Monitoring
**Deferral Reason:** Requires AWS RDS; project uses local Docker PostgreSQL

---

### KNOW-068: CloudWatch Anomaly Detection (DEFERRED)

**Status:** deferred
**Depends On:** KNOW-016
**Story Points:** 3
**Feature:** CloudWatch anomaly detection for PostgreSQL metrics with ML-based adaptive alerting
**Deferral Reason:** Requires AWS RDS and CloudWatch; project uses local Docker PostgreSQL

---

### KNOW-078: Composite Alarms for Database Health (DEFERRED)

**Status:** deferred
**Depends On:** KNOW-016
**Story Points:** 2
**Feature:** CloudWatch composite alarms to reduce alert noise and provide clearer database health states
**Deferral Reason:** Requires AWS CloudWatch alarms; project uses local Docker PostgreSQL

---

### KNOW-088: Dashboard Templates for Reusability (DEFERRED)

**Status:** deferred
**Depends On:** KNOW-016
**Story Points:** 2
**Feature:** Extract CloudWatch dashboard JSON into reusable parameterized templates
**Deferral Reason:** Requires AWS CloudWatch dashboards; project uses local Docker PostgreSQL

---

### KNOW-098: CloudWatch Logs Integration (DEFERRED)

**Status:** deferred
**Depends On:** KNOW-016
**Story Points:** 3
**Feature:** CloudWatch Logs for PostgreSQL log aggregation with CloudWatch Insights
**Deferral Reason:** Requires AWS RDS log export; project uses local Docker PostgreSQL

---

### KNOW-108: Cost Attribution Tags (DEFERRED)

**Status:** deferred
**Depends On:** KNOW-016
**Story Points:** 1
**Feature:** AWS resource tags for cost tracking and attribution in Cost Explorer
**Deferral Reason:** Requires AWS resources; project uses local Docker PostgreSQL

---

## Cancelled Stories

### KNOW-017: Data Encryption (CANCELLED)

**Status:** cancelled
**Depends On:** KNOW-001
**Feature:** RDS encryption at rest with AWS KMS key management, operational procedures, and verification
**Cancelled Date:** 2026-01-31
**Cancellation Reason:** Infrastructure change - project uses local Docker PostgreSQL, not AWS RDS. Aligns with cancellation rationale of KNOW-016 (PostgreSQL Monitoring).

**Why it was planned:** Protects sensitive institutional knowledge stored in Knowledge Base PostgreSQL from unauthorized access in case of physical media compromise. Required for security and compliance in AWS RDS deployment scenario.

**Story Document:** plans/future/knowledgebase-mcp/elaboration/KNOW-017/KNOW-017.md

**Future Consideration:** If AWS RDS deployment is planned in future, revisit after creating prerequisite infrastructure stories for AWS migration and RDS provisioning.

---

## Backlog (Do After Using the KB)

### KNOW-118: Worker Agent KB Integration Pattern

**Status:** backlog
**Depends On:** KNOW-040
**Follow-up From:** KNOW-040 (QA Gap #6)
**Priority:** P2 (pattern definition)
**Story Points:** 2
**Feature:** Define and document KB integration pattern for worker agents (backend-coder, frontend-coder, playwright-engineer). Establish whether workers query KB independently or rely on leader-provided context.

**Why it matters:** KNOW-040 establishes KB integration for leader agents but doesn't cover worker agents spawned by leaders. Unclear whether workers should query KB independently, creating inconsistent knowledge access patterns and potential duplicate queries.

**Scope:**
- Evaluate 3 pattern options: Leader-Only, Worker-Independent, Hybrid
- Document chosen pattern with decision rationale
- Define context passing mechanism (if leader provides context to workers)
- Document worker query triggers (if workers query independently)
- Add anti-patterns and examples to integration guide
- Update `.claude/KB-AGENT-INTEGRATION.md` with worker pattern section

**Non-Goals:**
- No implementation of worker KB integration (documentation only)
- No bulk update of existing worker agents
- No automated context passing mechanism
- No worker-specific query templates

**Story Document:** plans/future/knowledgebase-mcp/backlog/KNOW-118/KNOW-118.md

**When to do:** After KNOW-040 is implemented and leader agent KB integration is validated. Completes KB-first workflow pattern for leader-worker agent hierarchies.

**Source:** QA Discovery Notes from KNOW-040 (Gap #6 from FUTURE-OPPORTUNITIES.md)

---

### KNOW-128: Migration Rollback Capability

**Status:** backlog
**Depends On:** KNOW-043
**Follow-up From:** KNOW-043 (QA Follow-up Story #1)
**Priority:** P3 (operational safety)
**Story Points:** 2
**Feature:** Implement checkpoint/resume and rollback for failed migrations. If migration fails midway, provide ability to undo partial imports and resume from last checkpoint.

**Why it matters:** Improves operational safety and resilience during migrations. Enables operators to recover from partial failures gracefully without manual KB inspection or accepting inconsistent migration states.

**Scope:**
- Checkpoint mechanism tracks migration progress with resume capability
- Rollback command undoes all imports from a failed migration run
- Batch transaction support with per-batch rollback on failure
- Detailed failure reporting with per-file counts and error logging
- Migration run metadata stored in KB for traceability

**Non-Goals:**
- No general-purpose rollback system (migration-specific only)
- No automated retry logic (operator-triggered only)
- No cross-migration rollback (current run only)
- No point-in-time recovery (use KNOW-015 for comprehensive PITR)

**Story Document:** plans/future/knowledgebase-mcp/backlog/KNOW-128/KNOW-128.md

**When to do:** Optional enhancement to KNOW-043. Prioritize if migrations become frequent or large-scale (e.g., migrating other markdown sources beyond lessons learned).

**Source:** QA Discovery Notes from KNOW-043 (Follow-up Story #1)

---

### KNOW-138: Agent KB Integration Testing

**Status:** backlog
**Depends On:** KNOW-043
**Follow-up From:** KNOW-043 (QA Discovery Notes - Follow-up Story #2)
**Priority:** P2
**Story Points:** 2
**Feature:** Create test scenarios for agents querying and writing to the Knowledge Base. Verify that agents correctly use kb_search before tasks and kb_add to capture lessons.

**Why it matters:** KNOW-043 updates agent instructions to use KB tools, but without integration testing we have no confidence that agents actually follow the new workflow correctly. This story validates that agents query KB for lessons before tasks, write new lessons to KB (not markdown files), and use appropriate metadata.

**Scope:**
- Agent read test scenarios (PM/Dev/QA agents query KB before tasks)
- Agent write test scenarios (agents write lessons to KB with proper tags/categories)
- Workflow integration tests (end-to-end agent workflows use KB)
- Tag and category validation (verify metadata on KB writes)
- Negative test cases (empty results, KB unavailable)
- Test documentation with setup, action, expected results, validation criteria

**Non-Goals:**
- No testing of KB MCP server functionality (already covered in KNOW-003, KNOW-004)
- No testing of agent architecture changes (only behavior from instruction updates)
- No automated test harness (manual scenarios sufficient for MVP)
- No testing all agent types (focus on PM/Dev/QA leader agents)

**Acceptance Criteria:**
1. Test scenarios for agent reads (PM/Dev/QA query KB before tasks)
2. Test scenarios for agent writes (lessons written to KB with required fields)
3. Tag/category validation (lessons include `lesson-learned`, agent tag, category)
4. Workflow integration tests (query → task → write new lesson)
5. Test documentation with pass/fail criteria
6. Negative test cases (empty results, KB unavailable)

**Story Document:** plans/future/knowledgebase-mcp/backlog/KNOW-138/KNOW-138.md

**When to do:** After KNOW-043 completes and agent instruction updates are deployed. Validates that the KB-first workflow pattern is actually adopted by agents.

**Source:** QA Discovery Notes from KNOW-043 (Follow-up Story Suggestion #2)

---

### KNOW-148: Post-Migration Quality Review

**Status:** backlog
**Depends On:** KNOW-043
**Follow-up From:** KNOW-043 (QA Discovery Notes - Follow-up Story #3)
**Priority:** P3
**Story Points:** 2
**Feature:** Add quality review process after LESSONS-LEARNED.md migration. Identify low-value entries (short content, duplicated information), outdated lessons, and consolidation opportunities.

**Why it matters:** Ensures migrated KB content is high-quality, relevant, and searchable. Removes noise and improves search effectiveness by identifying low-value entries, duplicates, and outdated lessons.

**Scope:**
- Script to identify low-value entries (< 100 characters, generic content)
- Duplicate detection via semantic similarity or text comparison (> 80% overlap)
- Outdated lesson identification (> 1 year old) for manual review
- Consolidation opportunities clustering (group related lessons by topic)
- Search effectiveness validation (test common queries, measure hit rate)
- Quality report with actionable recommendations (remove, enhance, consolidate)
- Cleanup actions with `--apply` flag and dry-run preview

**Non-Goals:**
- No automated quality scoring
- No continuous monitoring (one-time review)
- No lesson versioning
- No AI-based auto-tagging

**Story Document:** plans/future/knowledgebase-mcp/backlog/KNOW-148/KNOW-148.md

**When to do:** After KNOW-043 completes and migration has been validated. Post-migration cleanup to ensure KB content quality.

**Source:** QA Discovery Notes from KNOW-043 (Enhancement Opportunity - Follow-up Story #3)

---

### KNOW-158: Lesson Lifecycle Management

**Status:** backlog
**Depends On:** KNOW-043
**Follow-up From:** KNOW-043 (QA Open Question #3 deferred)
**Priority:** P3
**Story Points:** 2
**Feature:** Define and implement lesson expiration/review strategy with review date metadata and cleanup process

**Why it matters:** Prevents knowledge decay and ensures lessons remain relevant. Without lifecycle management, the KB could accumulate outdated or irrelevant lessons that mislead agents or clutter search results.

**Scope:**
- Add review metadata to KB schema (review_date, last_reviewed, is_stale)
- Define review interval policy (6-12 months depending on lesson type)
- Implement stale lesson identification script with reporting
- Create review workflow tools (kb_mark_for_review, archival process)
- Update kb_search to exclude stale lessons by default
- Document lifecycle policy and review procedures

**Non-Goals:**
- No automatic content updates (manual review only)
- No version control for lessons (KB timestamps sufficient)
- No lesson approval workflows (post-hoc review)
- No hard deletion on expiration (tag-based archival)

**Story Document:** plans/future/knowledgebase-mcp/backlog/KNOW-158/KNOW-158.md

**When to do:** After KNOW-043 migrates lessons to KB. Establishes maintenance practices to prevent knowledge decay and ensure long-term KB quality.

**Source:** QA Discovery Notes from KNOW-043 (Open Question #3: "Should lessons have an expiration or review date?")

---


### KNOW-168: KB Usage Monitoring

**Status:** backlog
**Depends On:** KNOW-043
**Follow-up From:** KNOW-043 (QA Discovery Notes - Follow-up Story #5)
**Priority:** P3 (operational improvement)
**Story Points:** 2
**Feature:** Track which agents use KB tools via logging. Identify agents not querying KB as expected. Monitor adoption of KB-first workflow and popular search patterns.

**Why it matters:** Provides visibility into KB adoption and usage patterns after KNOW-043 migrates lessons learned to KB. Enables proactive agent instruction improvements by identifying which agents aren't following KB-first workflow and what knowledge gaps exist (queries returning no results).

**Scope:**
- Add usage logging to all 11 KB tool handlers (tool name, agent role, timestamp, success/failure)
- Log search queries with result counts and relevance scores
- Create `kb-usage-report.ts` script to generate usage reports
- Report shows: agent adoption by role, top queries, knowledge gaps (0 results), usage trends (7-day)
- Documentation for usage logging and report generation

**Non-Goals:**
- No real-time alerting on usage patterns
- No user-level tracking (agent roles only)
- No query performance profiling (KNOW-004 handles that)
- No custom analytics dashboard (simple logs + script sufficient)
- No retention beyond 30 days

**Story Document:** plans/future/knowledgebase-mcp/backlog/KNOW-168/KNOW-168.md

**When to do:** After KNOW-043 is implemented and agents are using KB for lessons learned. Measures adoption success and identifies knowledge gaps.

**Source:** QA Discovery Notes from KNOW-043 (Follow-up Story #5)

---

### KNOW-178: Lesson Quality Metrics

**Status:** backlog
**Depends On:** KNOW-043
**Follow-up From:** KNOW-043 (QA Discovery Notes - Follow-up Story #6)
**Priority:** P3
**Story Points:** 2
**Feature:** Capture metrics to measure lesson value: search hits per lesson, agent citations, last accessed date. Enable data-driven decisions about which lessons are valuable.

**Why it matters:** After migrating lessons learned to the Knowledge Base (KNOW-043), need visibility into which lessons are actually valuable to agents. Enables data-driven decisions about lesson quality, identifies stale/unused content, and measures ROI of the lessons learned migration.

**Scope:**
- Track lesson usage metrics in KB schema (search hit count, last accessed timestamp, first accessed timestamp)
- Capture search hit counts when lessons are retrieved via `kb_search`
- Record last accessed timestamps for each lesson
- Provide metrics query capability via new tool `kb_lesson_metrics`
- Enable filtering and ranking by usage to identify valuable vs. stale lessons

**Non-Goals:**
- No agent citation extraction (tracking which agent used which lesson requires deep integration; deferred)
- No lesson quality scoring (automated quality assessment combining multiple signals is future work)
- No real-time analytics dashboard (metrics stored in DB; visualization tools deferred)
- No user-facing analytics UI (KB is agent-facing only; no web UI needed)

**Acceptance Criteria:**
1. Schema migration adds search_hit_count, last_accessed_at, first_accessed_at to entries
2. `kb_search` increments search hit count asynchronously for returned lessons
3. `kb_get` updates last accessed timestamp
4. New tool `kb_lesson_metrics` returns usage statistics (top N, least accessed, stale)
5. Performance: Metrics updates add < 5ms latency (p95)
6. Test coverage > 80% for new code
7. Documentation for metrics tracking and usage

**Story Document:** plans/future/knowledgebase-mcp/backlog/KNOW-178/KNOW-178.md

**When to do:** After KNOW-043 is completed and lessons are migrated. Provides metrics to assess migration ROI and lesson quality.

**Source:** QA Discovery Notes from KNOW-043 (Follow-up Story #6)

---

---
## Completed

### KNOW-001: Package Infrastructure Setup ✓

Database schema, Docker setup, test configuration.

---

### KNOW-002: Embedding Client Implementation ✓

OpenAI embedding client with caching, retry logic, batch processing.

---

### KNOW-003: Core CRUD Operations ✓

kb_add, kb_get, kb_update, kb_delete, kb_list with deduplication.

---

### KNOW-004: Search Implementation ✓

Semantic search (pgvector), keyword search (FTS), hybrid search with RRF.

---

### KNOW-0051: MCP Server Foundation + CRUD Tools ✓

MCP server setup, 5 CRUD tools, error handling, logging.

---

### KNOW-0052: MCP Search Tools + Deployment Topology ✓

kb_search, kb_get_related tools, performance logging, deployment docs.

---

### KNOW-0053: MCP Admin Tool Stubs ✓

kb_stats, kb_health, stubs for bulk_import and rebuild_embeddings.

---

### KNOW-015: Disaster Recovery ✓

Backup/restore procedures, RTO/RPO targets, runbooks.

---

### KNOW-028: Environment Variable Documentation ✓

.env.example, Zod-based startup validation, git protection.

---

### KNOW-039: MCP Registration and Claude Integration ✓

Setup guide, config generator, connection validator.

---

## Archived Stories

35 stories have been moved to `stories-future.index.md`. These include:

- **Production hardening** (auth, rate limiting, encryption) - not needed for local dev
- **Performance optimization** (quantization, reranking) - premature for 50 entries
- **Analytics & dashboards** - no users to analyze yet
- **Advanced document processing** - your content is already simple
- **Scope creep** (story management database, user flows) - separate projects

Revisit after using the KB for 5-10 real stories.

---

## Quick Reference

```
# Start the KB
cd apps/api/knowledge-base
docker-compose up -d
pnpm dev

# Register with Claude
pnpm kb:generate-config
pnpm kb:validate-connection

# Import seed data (after KNOW-006)
pnpm kb:seed

# Use it
kb_search({ query: "drizzle migration patterns", limit: 5 })
kb_add({ content: "...", tags: ["pattern"], role: "dev" })
```
