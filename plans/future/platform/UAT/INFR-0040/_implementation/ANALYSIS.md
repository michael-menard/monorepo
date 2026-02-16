# Elaboration Analysis - INFR-0040

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Scope matches index exactly - Wave 1 story creating workflow_events table and basic ingestion |
| 2 | Internal Consistency | FAIL | High | AC-12 references wrong location (INFR epic README instead of story doc), AC-10 has inconsistent behavior specs |
| 3 | Reuse-First | PASS | — | Correctly reuses Drizzle patterns, pgSchema namespace pattern from umami, no one-off utilities |
| 4 | Ports & Adapters | PASS | — | No API endpoints, pure database schema work with insertWorkflowEvent adapter function |
| 5 | Local Testability | CONDITIONAL | Medium | Tests specified but no concrete .http examples (N/A for DB schema), missing testcontainers setup details |
| 6 | Decision Completeness | FAIL | Medium | ULID library choice deferred to "Dev Feasibility" (blocking), migration rollback strategy incomplete |
| 7 | Risk Disclosure | CONDITIONAL | Low | Missing risk: no discussion of concurrent event ingestion from multiple orchestrator instances |
| 8 | Story Sizing | PASS | — | 12 ACs, backend-only schema work, well-scoped for Wave 1 foundation |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | AC-10: Inconsistent error handling spec | High | Clarify: should insertWorkflowEvent generate ULID if not provided, OR require caller to provide it? Current AC says "Generate ULID for event_id if not provided (optional enhancement)" which contradicts idempotency requirement |
| 2 | AC-12: Wrong documentation location | Medium | Change from "INFR epic README" to story-level documentation path (e.g., `_implementation/SCHEMA-REFERENCE.md`) - no INFR epic directory exists |
| 3 | ULID library choice unresolved | High | Story defers ULID library selection to "Dev Feasibility" but this is a prerequisite for AC-3, AC-10 implementation. Must decide: use `ulid` npm package or alternative |
| 4 | Missing testcontainers configuration | Medium | AC-11 mentions "testcontainers or in-memory Postgres" but provides no setup guidance. Need concrete test database strategy |
| 5 | Primary key type mismatch with existing patterns | Medium | Story uses `text` type for event_id (ULID), but all existing schemas use `uuid` type with defaultRandom(). This breaks pattern consistency - justify deviation or use UUID |
| 6 | No index on (run_id, event_type, ts) for common query | Low | Missing composite index for "show all step_completed events for run-123" - requires two indexes instead of one optimized composite |
| 7 | Migration rollback assumes Drizzle transactional behavior | Medium | Story says "Drizzle should handle transactional rollback automatically" but Drizzle Kit doesn't provide rollback command by default - needs manual rollback SQL |
| 8 | No discussion of concurrent event writes | Low | Multiple orchestrator nodes/runs may write events concurrently - no analysis of connection pooling, locking, or conflict handling |

## Preliminary Verdict

**Verdict**: CONDITIONAL PASS

Story is well-structured and correctly scoped for Wave 1 foundation work, but has 3 blocking issues that must be resolved before implementation:

1. **ULID vs UUID decision** (affects AC-3, AC-10, performance benchmarks)
2. **AC-10 behavior clarification** (idempotency design choice)
3. **Documentation location correction** (AC-12)

Once these are resolved, story can proceed with minor adjustments to test plan and index strategy.

---

## MVP-Critical Gaps

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | ULID library and type choice undecided | Core schema definition (AC-3, AC-10) | Decide now: use `ulid` npm package with `text` primary key OR switch to `uuid` type to match existing patterns. Recommend: **use UUID with defaultRandom()** to maintain consistency with all other tables, defer ULID to future story if lexicographic sorting becomes critical |
| 2 | AC-10: event_id generation responsibility unclear | Ingestion function contract (AC-10) | Clarify: **require caller to provide event_id** (orchestrator generates ULID), OR **allow null and generate UUID in insertWorkflowEvent**. Recommend: **require event_id from caller** for explicit idempotency control |
| 3 | AC-12: documentation path does not exist | Completion criteria (AC-12) | Change location to `plans/future/platform/elaboration/INFR-0040/_implementation/SCHEMA-REFERENCE.md` - no INFR epic directory structure exists in codebase |

---

## Worker Token Summary

- Input: ~47,000 tokens (story, seed, index, agent instructions, schema files, migration examples)
- Output: ~2,500 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
