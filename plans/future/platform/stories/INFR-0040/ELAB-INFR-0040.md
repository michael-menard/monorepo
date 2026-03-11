# Elaboration Report - INFR-0040

**Date**: 2026-02-13
**Verdict**: CONDITIONAL PASS

## Summary

INFR-0040 (Workflow Events Table + Ingestion) is well-structured backend infrastructure work with 14 acceptance criteria establishing the foundation for telemetry. The autonomous elaboration process resolved all 3 MVP-critical gaps by auto-deciding ULID vs UUID, clarifying AC-10 event_id responsibility, and correcting documentation paths. Story may proceed to implementation with 22 non-blocking enhancements deferred to knowledge base.

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Scope matches index exactly - Wave 1 story creating workflow_events table and basic ingestion |
| 2 | Internal Consistency | FAIL → RESOLVED | High | AC-12 documentation path corrected (local path), AC-10 behavior clarified (require event_id from caller) |
| 3 | Reuse-First | PASS | — | Correctly reuses Drizzle patterns, pgSchema namespace pattern from umami, no one-off utilities |
| 4 | Ports & Adapters | PASS | — | No API endpoints, pure database schema work with insertWorkflowEvent adapter function |
| 5 | Local Testability | CONDITIONAL | Medium | Tests specified with Vitest framework; testcontainers configuration deferred to KB (non-blocking) |
| 6 | Decision Completeness | FAIL → RESOLVED | Medium | ULID vs UUID resolved (use UUID for consistency), migration rollback strategy documented |
| 7 | Risk Disclosure | CONDITIONAL | Low | Concurrent event ingestion risk logged to KB; mitigated by @repo/db connection pooling |
| 8 | Story Sizing | PASS | — | 14 ACs (3 new from elaboration), backend-only schema work, well-scoped for Wave 1 foundation |

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status |
|---|-------|----------|--------------|--------|
| 1 | AC-10: Inconsistent error handling spec | High | Clarify event_id responsibility: require from caller OR generate in function | RESOLVED: Added AC-13 to require caller-provided event_id |
| 2 | AC-12: Wrong documentation location | Medium | Change from INFR epic README to story-level path | RESOLVED: Corrected path to `_implementation/SCHEMA-REFERENCE.md` |
| 3 | ULID library choice unresolved | High | Decide: use `ulid` npm package OR switch to UUID for consistency | RESOLVED: Added AC-14 to use UUID, defer ULID to future story |
| 4 | Missing testcontainers configuration | Medium | Test database strategy needs concrete setup guidance | DEFERRED: Logged to KB (non-blocking, developer discretion) |
| 5 | Migration rollback strategy incomplete | Medium | Drizzle Kit lacks auto-rollback; needs manual SQL generation | DEFERRED: Logged to KB (acceptable for Wave 1) |
| 6 | Concurrent event write analysis missing | Low | Multiple orchestrator instances may write events simultaneously | DEFERRED: Logged to KB (mitigated by connection pooling) |

## Discovery Findings

### MVP Gaps Resolved (3)

| # | Finding | Resolution | AC Added |
|---|---------|------------|----------|
| 1 | ULID vs UUID decision blocks schema definition | Use UUID with `defaultRandom()` to match existing patterns (kb.*, work.*, ai.*) | AC-14 |
| 2 | AC-10 event_id responsibility unclear | Require event_id from caller (orchestrator generates UUID); function validates presence | AC-13 |
| 3 | AC-12 references wrong path (INFR epic README does not exist) | Correct to story-level path: `plans/future/platform/elaboration/INFR-0040/_implementation/SCHEMA-REFERENCE.md` | Modified AC-12 |

### Non-Blocking Items (Logged to KB)

| # | Finding | Category | Status |
|---|---------|----------|--------|
| 1 | Missing testcontainers configuration details | testing | KB-logged |
| 2 | No composite index on (run_id, event_type, ts) | performance | KB-logged |
| 3 | Migration rollback automation missing | tooling | KB-logged |
| 4 | No formal concurrent write analysis | observability | KB-logged |
| 5 | No GIN index on JSONB payload | optimization | KB-logged |
| 6 | Event schema versioning beyond version field missing | future-work | KB-logged |
| 7 | No table partitioning strategy | scalability | KB-logged |
| 8 | Missing (item_id, event_type, ts) index | analytics | KB-logged |
| 9 | Missing (workflow_name, agent_role, ts) index | analytics | KB-logged |
| 10 | Automated rollback SQL generation missing | tooling | KB-logged |
| 11 | insertWorkflowEvent doesn't return event | api-design | KB-logged |
| 12 | No batch insert function | performance | KB-logged |
| 13 | No event_id prefix for visibility | ux-polish | KB-logged |
| 14 | Missing correlation_id for distributed tracing | integration | KB-logged |
| 15 | No source/emitter metadata | observability | KB-logged |
| 16 | No event deduplication cache (Redis) | performance | KB-logged |
| 17 | No payload schema validation per event_type | validation | KB-logged |
| 18 | No materialized views for common queries | performance | KB-logged |
| 19 | No event sampling/throttling | performance | KB-logged |
| 20 | Event metrics export (Prometheus) | integration | Covered by TELE-0020 |
| 21 | Event archival to S3 | storage | Covered by INFR-0060 |
| 22 | Event replay capability | debugging | Not MVP-critical |

## Acceptance Criteria Status

All 14 ACs now have complete specifications:

- AC-1 to AC-12: Original scope (telemetry schema, enum, table, indexes, migration, Zod schemas, insertWorkflowEvent function, unit tests, documentation)
- **AC-13**: NEW - Clarify event_id generation responsibility (require from caller)
- **AC-14**: NEW - Use UUID type for event_id (not ULID text) for consistency

## Architecture Decisions Confirmed

| Decision | Choice | Rationale |
|----------|--------|-----------|
| event_id type | UUID (not ULID text) | Consistency with all existing patterns (kb.*, work.*, ai.*). Defer lexicographic sorting to future story if needed. |
| event_id generation | Caller responsibility | Explicit idempotency control - orchestrator owns event identity. Function validates presence and fails fast. |
| error handling | Catch & log, no crash | Event logging must not crash orchestrator. Accept occasional event loss over workflow failure (INFR-0050 adds async queue for reliability). |
| documentation location | Story implementation path | No INFR epic directory structure; docs live under story elaboration folder |
| index strategy | 9 indexes (1 unique + 8 query) | Support telemetry dashboard, run timelines, story audit, workflow analysis, agent performance. GIN on payload deferred. |

## Proceed to Implementation?

**YES** - Story is ready for implementation in ready-to-work state.

The autonomous elaboration resolved all blocking issues. The 22 non-blocking items are properly documented in KB for future enhancement stories (TELE-0010, TELE-0020, TELE-0030, INFR-0050, INFR-0060).

**Implementation Path:**
1. Create `packages/backend/database-schema/src/schema/telemetry.ts` with pgSchema, enum, and table definitions
2. Generate migration file via Drizzle (AC-8)
3. Auto-generate Zod schemas (AC-9)
4. Implement `insertWorkflowEvent()` function with error handling (AC-10, AC-13)
5. Write unit tests for insertion, idempotency, NULL handling, error cases (AC-11)
6. Write schema reference documentation (AC-12 with corrected path)
7. Run migration and verify indexes exist

**Blocked By:** None (Wave 1 story, no dependencies)

**Blocks:** INFR-0050 (Event SDK), TELE-0010 (Docker Telemetry Stack)

---

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-13_

### MVP Gaps Resolved
| # | Finding | Resolution | AC Added |
|---|---------|------------|----------|
| 1 | ULID vs UUID decision | Use UUID with defaultRandom() to match existing patterns | AC-14 |
| 2 | AC-10 event_id ambiguity | Require event_id from caller (orchestrator provides UUID) | AC-13 |
| 3 | AC-12 wrong documentation location | Correct to story-level path _implementation/SCHEMA-REFERENCE.md | Modified AC-12 |

### Non-Blocking Items (Logged to KB)
- 19 enhancement/gap findings deferred to knowledge base
- Impact: Zero - all non-critical refinements documented for future stories
- Test strategy, concurrent write analysis, rollback automation, schema versioning, partitioning, composite indexes, and UX polish all logged

### Summary
- MVP gaps: 3 (all resolved)
- ACs added: 3 (AC-13, AC-14, plus AC-12 modification)
- KB entries: 22 deferred (non-blocking)
- Mode: Autonomous elaboration with auto-decisions
- Verdict: **CONDITIONAL PASS** → ready-to-work
