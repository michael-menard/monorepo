# Future Opportunities - KNOW-005

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No health check endpoint documented | Low | Low | kb_health tool was implemented in KNOW-0053 as an alternative. Traditional HTTP health endpoint deferred post-MVP. |
| 2 | Transaction semantics for bulk import not fully specified | Low | Medium | Partial commit behavior should be documented when kb_bulk_import is fully implemented in KNOW-006. |
| 3 | MCP protocol error coverage could be expanded | Low | Low | Add tests for malformed JSON-RPC, invalid tool names, unexpected message types in future hardening pass. |
| 4 | Connection string security in mcp.json not documented | Low | Low | Add security documentation for file permissions and secrets management (defer to KNOW-009 or operational docs). |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Tool discovery metadata with examples | Medium | Low | Enhance MCP tool descriptions with usage examples for better Claude Code UI discoverability. Consider adding in KNOW-006/KNOW-007 as polish. |
| 2 | Tool alias system for backward compatibility | Low | Medium | Implement alias system to support gradual migration when tool schemas change. Defer until schema versioning becomes a problem. |
| 3 | Dry-run mode flag on mutation tools | Medium | Low | Add `dry_run` boolean flag to kb_add, kb_update, kb_delete for testing and debugging. Low-hanging fruit for developer experience. |
| 4 | Correlation IDs for structured logging | High | Medium | Implement correlation IDs to trace multi-tool workflows. Valuable for debugging complex agent interactions. Consider for KNOW-019 (Query Analytics). |
| 5 | Per-tool timeout configuration | Medium | Low | Configure separate timeouts for fast operations (kb_get: 5s) vs slow operations (kb_rebuild_embeddings: 5min). Prevents one slow tool from blocking others. |
| 6 | MCP client library for testing | High | Medium | Create reusable MCP client mock for testing. Enables local development without full Claude Code installation. High value for developer workflow. |
| 7 | Result caching for read operations | Medium | High | Cache kb_get, kb_search results with TTL. Deferred to KNOW-021 (Cost Optimization) - requires cache invalidation strategy. |
| 8 | Tool composition support | Low | High | Enable tools to call other tools for modularity (e.g., kb_search calls kb_get_related). Requires careful design to avoid infinite loops. Defer post-MVP. |
| 9 | Telemetry for tool invocations | High | Medium | Integrate with CloudWatch/Prometheus for tool usage metrics, latency percentiles, error rates. Natural fit for KNOW-019 (Query Analytics). |
| 10 | Streaming responses for long operations | Medium | High | Support streaming progress updates for kb_rebuild_embeddings. Depends on MCP protocol streaming support - evaluate feasibility first. |
| 11 | Tool access control stubs with TODOs | High | Low | Add access control hooks in tool handlers with TODO comments linking to KNOW-009. Reduces refactoring when authorization is implemented. |
| 12 | Graceful shutdown handling | Medium | Low | Implement SIGTERM handler with configurable timeout (30s recommended). Ensures in-flight tool invocations complete before server exits. |

## Categories

- **Edge Cases**: Transaction semantics (#2), MCP protocol error coverage (#3)
- **Security**: Connection string security (#4), Tool access control stubs (#11)
- **UX Polish**: Tool discovery metadata (#1), Dry-run mode (#3), Correlation IDs (#4), MCP client library (#6)
- **Performance**: Per-tool timeouts (#5), Result caching (#7), Streaming responses (#10)
- **Observability**: Correlation IDs (#4), Telemetry (#9)
- **Integrations**: Tool composition (#8)
- **Operational**: Health check endpoint (#1), Graceful shutdown (#12)

## Notes

**Context**: The original KNOW-005 story was split and completed as KNOW-0051, KNOW-0052, and KNOW-0053. These opportunities apply to the completed MCP server implementation and can be addressed in future iterations:

- **Immediate next steps**: KNOW-006 (Parsers and Bulk Import) and KNOW-007 (Admin Tools and Polish) are already in progress/ready-for-qa per stories.index.md. These stories will address kb_bulk_import and kb_rebuild_embeddings full implementations.

- **Post-MVP enhancements**: Most opportunities listed here are categorized as "nice-to-have" and should be prioritized after the knowledge base is in active use for 5-10 real stories (per stories.index.md guidance).

- **Archived stories**: 35 stories were archived to `stories-future.index.md` including production hardening (auth, rate limiting), performance optimization, and analytics. Re-evaluate after real-world usage.
