# Elaboration Report - KNOW-005

**Date**: 2026-01-25
**Verdict**: SPLIT REQUIRED

## Summary

KNOW-005 (MCP Server Setup) is well-architected but too large for a single story with 10 tools, 10 acceptance criteria, and multiple test dimensions. The story contains 2 critical scope contradictions (kb_bulk_import and kb_rebuild_embeddings) that must be resolved through split. Recommended split: KNOW-005-A (foundation + CRUD tools), KNOW-005-B (search tools), KNOW-005-C (admin tool stubs).

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches stories.index.md exactly. Implements MCP server with 10 tools. Correctly defers auth (KNOW-009), rate limiting (KNOW-010), alerting (KNOW-016), and agent templates (KNOW-008). |
| 2 | Internal Consistency | PASS | — | Goals align with Non-goals. All 10 ACs match scope. Test Plan covers all ACs. No contradictions in structure, but 2 critical contradictions in tool scope (see Issues #8 and #9). |
| 3 | Reuse-First | PASS | — | Excellent reuse plan. Leverages existing CRUD operations (KNOW-003), search functions (KNOW-004), EmbeddingClient (KNOW-002), @repo/logger, and Drizzle ORM. Only 2 new MCP-specific dependencies added. |
| 4 | Ports & Adapters | PASS | — | Excellent ports & adapters compliance. MCP server acts as thin adapter layer wrapping domain logic (CRUD/search). Clear separation of concerns. |
| 5 | Local Testability | PASS | — | Comprehensive test plan with Vitest unit and integration tests. 80% coverage target with 25+ test scenarios (10 happy paths, 6 error cases, 9 edge cases). |
| 6 | Decision Completeness | PASS | — | No blocking TBDs. All design decisions documented. MCP server lifecycle, deployment topology, and error handling strategy well-defined. |
| 7 | Risk Disclosure | PASS | — | Excellent risk disclosure covering 6 major risks with documented mitigations. |
| 8 | Story Sizing | FAIL | High | **TOO LARGE.** 10 Acceptance Criteria, 10 new MCP tools, significant backend work, 4+ distinct test dimensions. 8 story points confirms high complexity. Split required. |

## Issues & Required Fixes

| # | Issue | Severity | User Decision | Status |
|---|-------|----------|---------------|--------|
| 1 | zod-to-json-schema MCP compatibility verification | High | Add as AC - Tool schema validation against MCP SDK expectations | ACCEPTED |
| 2 | Tool handlers return JSON objects, not primitives | Medium | Add as AC - Clarify MCP return type conventions | ACCEPTED |
| 3 | OpenAI 429 rate limit handling not specified | Medium | Add as AC - Explicit handling for rate-limit responses with retry-after | ACCEPTED |
| 4 | Environment connectivity verification at startup | Medium | Add as AC - Startup health check for DB and OpenAI connectivity | ACCEPTED |
| 5 | Test strategy needs clarification | High | Add as AC - Smoke tests via MCP, unit tests via handlers | ACCEPTED |
| 6 | Instance-per-session vs shared instance deployment model | Medium | Add as AC - Deployment topology must clarify single instance per session | ACCEPTED |
| 7 | Performance targets don't account for MCP protocol overhead | Low | Add as AC - Include protocol overhead in performance targets | ACCEPTED |
| 8 | kb_bulk_import tool scope contradiction | Critical | Implement stub - kb_bulk_import returns not implemented, defers to KNOW-006 | ACCEPTED |
| 9 | kb_rebuild_embeddings tool scope contradiction | Critical | Defer to KNOW-007 - kb_rebuild_embeddings deferred with notes in KNOW-007 | ACCEPTED |
| 10 | kb_stats implementation location not documented | Medium | Add as AC - kb_stats implementation location documented in scope | ACCEPTED |
| 11 | No TypeScript build process documented | Medium | Add as AC - Build process with tsconfig documented | ACCEPTED |
| 12 | Connection pool sizing not validated | Low | Add as AC - Connection pool sizing rationale and validation | ACCEPTED |

## Gaps Identified (QA Discovery)

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | No graceful shutdown handling for MCP server | Add as AC - Graceful shutdown with configurable timeout | 30s timeout recommended |
| 2 | Tool handler logging doesn't sanitize sensitive data | Add as AC - Sensitive data sanitization rules for logging | Truncate content, redact patterns |
| 3 | No versioning strategy for MCP tool schemas | Add as AC - Tool schema versioning/breaking change policy | Important for future evolution |
| 4 | MCP server stdout/stderr separation not documented | Add as AC - Logger writes to stderr not stdout | Critical for protocol compliance |
| 5 | Transaction semantics for bulk import not specified | Add as AC - Transaction semantics for bulk import documented | Partial commit behavior |
| 6 | No crash detection mechanism documented | Add as AC - Crash detection mechanism documented | How Claude Code detects restart |
| 7 | kb_stats performance not benchmarked | Add as AC - kb_stats performance target | Set timeout for large datasets |
| 8 | Tool handler retry policy not documented | Add as AC - Retry policy documented | Distinguish transient vs permanent failures |
| 9 | Embedding regeneration transparency missing | Add as AC - Embedding regeneration transparency in response | Surface kb_update behavior to client |
| 10 | MCP protocol error test coverage incomplete | Add as AC - MCP protocol error test coverage | Malformed JSON, invalid tool names |
| 11 | Connection string security in mcp.json | Add as AC - mcp.json security documentation | File permissions, secrets management |
| 12 | No monitoring for tool invocation patterns | Add as AC - Usage pattern monitoring metrics | Deferred to KNOW-019 (Query Analytics) |

## Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Add MCP tool discovery metadata | Add as AC - Tool discovery metadata with descriptions and examples | Improves Claude Code UI discoverability |
| 2 | Implement tool alias system | Add as AC - Tool alias system for backward compatibility | Gradual migration strategy |
| 3 | Add dry-run mode flag to mutation tools | Add as AC - Dry-run mode flag on mutation tools | Testing and debugging support |
| 4 | Implement correlation IDs for structured logging | Add as AC - Correlation IDs for structured logging | Multi-tool workflow tracing |
| 5 | Add per-tool timeout configuration | Add as AC - Per-tool timeout configuration | Prevents blocking between tools |
| 6 | Create MCP client library for testing | Add as AC - MCP client library for testing | Enables local dev without full Claude Code |
| 7 | Add result caching for read operations | Add as AC - Result caching for read operations | Deferred to KNOW-021 (Cost Optimization) |
| 8 | Implement tool composition support | Add as AC - Tool composition support | Tools calling tools for modularity |
| 9 | Add telemetry for tool invocations | Add as AC - Telemetry metrics for tool invocations | CloudWatch/Prometheus integration |
| 10 | Support streaming responses for long operations | Add as AC - Streaming responses for long-running operations | kb_rebuild_embeddings progress updates |
| 11 | Implement tool access control stubs | Add as AC - Tool access control stubs with TODOs | Links to KNOW-009, reduces refactoring |
| 12 | Add kb_health tool for server status | Add as AC - kb_health tool for server status | Debugging and monitoring aid |

## Split Recommendation

**Original Verdict from Analysis**: FAIL (due to 2 critical issues + story sizing)

**Split Decision Accepted** into 3 stories:

### KNOW-005-A: MCP Server Foundation + CRUD Tools (5 SP)
**Scope**:
- MCP server setup with @modelcontextprotocol/sdk
- Tool schema generation from Zod via zod-to-json-schema
- 5 basic CRUD tools (kb_add, kb_get, kb_update, kb_delete, kb_list)
- Error sanitization and logging layer
- Environment variable validation and connectivity checks
- Integration test harness (MCP protocol simulation)
- Tool discovery metadata with descriptions
- Graceful shutdown handling
- Sensitive data sanitization rules
- Tool schema versioning policy
- Stdout/stderr separation for logger
- Retry policy documentation

**Blocking**: None (depends on KNOW-003 completed)
**Unblocks**: KNOW-005-B, KNOW-005-C, KNOW-006, KNOW-007, KNOW-008

### KNOW-005-B: MCP Search Tools + Deployment Topology (3 SP)
**Scope**:
- Add 2 search tools (kb_search, kb_get_related) as thin wrappers
- Performance logging and benchmarking
- Deployment topology documentation (instance-per-session clarification)
- Connection pooling strategy and validation
- Per-tool timeout configuration
- Correlation IDs for structured logging
- Performance targets accounting for MCP protocol overhead
- Tool composition support
- MCP protocol error test coverage

**Blocking**: KNOW-006, KNOW-007, KNOW-008
**Depends**: KNOW-005-A + KNOW-004 (search implementation)

### KNOW-005-C: MCP Admin Tool Stubs (2 SP)
**Scope**:
- 3 admin tools as stubs/wrappers (kb_bulk_import, kb_rebuild_embeddings, kb_stats)
- kb_bulk_import: Returns "not implemented, defer to KNOW-006"
- kb_rebuild_embeddings: Returns "not implemented, defer to KNOW-007"
- kb_stats: Basic implementation or returns "not implemented"
- Tool access control stubs with TODOs linking to KNOW-009
- kb_health tool for server status checking
- Result caching stubs for future KNOW-021

**Blocking**: KNOW-006, KNOW-007
**Depends**: KNOW-005-A

**Benefits of Split**:
- Reduces cognitive load per story (10 tools → 5+2+3)
- Enables parallel work after KNOW-005-A completes
- Clearer acceptance criteria per story
- Smaller test surface per story
- KNOW-005-A can be code-reviewed and deployed independently
- Admin tools can evolve independently of core MCP infrastructure

## Proceed to Implementation?

**BLOCKED: Requires Split**

Story must be split into KNOW-005-A, KNOW-005-B, KNOW-005-C before proceeding to implementation. Current story is too large and contains critical scope contradictions.

Once split is created, KNOW-005-A is ready to proceed immediately. KNOW-005-B and KNOW-005-C can begin after KNOW-005-A is code-reviewed.

---

## QA Validation Checklist

- [x] Audit checks completed (7 PASS, 1 FAIL)
- [x] Issues identified and resolved through user decisions
- [x] Gaps and enhancements catalogued for future stories
- [x] Split recommendation provided with story point re-estimate
- [x] Each split independently testable and deployable
- [x] Dependencies between splits documented
- [x] Critical scope contradictions resolved (kb_bulk_import and kb_rebuild_embeddings)
- [x] Architecture and ports & adapters pattern validated
- [x] Risk disclosure reviewed and accepted
- [x] Follow-up stories documented (KNOW-006, KNOW-007, KNOW-009, KNOW-010, etc.)

---

**Elaboration completed by**: elab-completion-leader
**Report generated**: 2026-01-25
**Next action**: Update story status to `needs-split`, create 3 new stories from split template
