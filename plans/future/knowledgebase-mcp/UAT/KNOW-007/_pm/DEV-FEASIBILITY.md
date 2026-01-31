# Dev Feasibility Review for KNOW-007: Admin Tools and Polish

## Feasibility Summary

**Feasible:** Yes

**Confidence:** High

**Why:**
- Builds directly on completed infrastructure (KNOW-001 through KNOW-006)
- kb_rebuild_embeddings is a straightforward iteration over existing kb_add logic
- Logging enhancements are additive (no breaking changes to existing tools)
- Performance testing uses standard Vitest patterns already established
- Documentation is final polish work with clear deliverables
- All dependencies (EmbeddingClient, database schema, MCP server) already proven

## Likely Change Surface

### Packages Impacted

**Primary implementation:**
- `apps/api/knowledge-base/src/mcp-server/`
  - `tool-schemas.ts` - Add kb_rebuild_embeddings schema
  - `tool-handlers.ts` - Implement rebuild handler
  - New file: `rebuild-embeddings.ts` (core logic)
  - New file: `__tests__/admin-tools.test.ts`
  - New file: `__tests__/performance.test.ts`

**Logging enhancements (all existing files):**
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` - Add structured logging
- `apps/api/knowledge-base/src/crud/` - Add timing logs to all operations
- Leverage `@repo/logger` (already in use)

**Documentation:**
- `apps/api/knowledge-base/README.md` - Comprehensive updates
- `apps/api/knowledge-base/docs/` - New documentation files
  - `PERFORMANCE.md` - Performance testing guide
  - `CACHE-INVALIDATION.md` - Cache rebuild procedures
  - `DEPLOYMENT.md` - Production deployment guide

### Endpoints Impacted

**New MCP tool:**
- `kb_rebuild_embeddings` (NEW)

**Modified MCP tools (logging only, no breaking changes):**
- `kb_add` - Add structured logging
- `kb_search` - Add timing and result count logs
- `kb_get` - Add structured logging
- `kb_update` - Add structured logging
- `kb_list` - Add pagination logging
- `kb_delete` - Add structured logging
- `kb_bulk_import` - Add progress logging enhancements
- `kb_stats` - Add structured logging

### Migration/Deploy Touchpoints

**No migrations required:**
- No schema changes
- No data transformations
- Additive changes only

**Deployment considerations:**
- Logging config may need tuning (log level, rotation)
- Performance test suite runs separately (not in CI by default)
- Documentation updates deployed with code

## Risk Register (Top 10)

### 1. Performance Test Environment Variability
**Risk:** Performance tests may pass locally but fail in CI or production due to different database configurations, network latency, or resource constraints.

**Why it's risky:** False positives/negatives could lead to performance regressions going undetected or blocking valid changes.

**Mitigation:**
- Use percentile-based assertions (p95, p99) instead of absolute thresholds
- Document required test environment (DB size, connection pool config, hardware)
- Include performance tests in AC but make them optional for CI (manual trigger)
- Add performance baseline documentation with expected ranges

---

### 2. kb_rebuild_embeddings - Long Running Operation
**Risk:** Rebuilding embeddings for 10k+ entries could take hours and tie up server resources.

**Why it's risky:** Could block other MCP operations, exhaust connection pool, or timeout.

**Mitigation:**
- Implement batch processing with configurable batch_size
- Add progress logging every N entries
- Document estimated time calculations (entries × 0.3s avg)
- Consider background job pattern for future (out of scope for KNOW-007)
- Add max concurrent rebuilds safeguard (e.g., singleton pattern)

---

### 3. OpenAI API Rate Limiting
**Risk:** Large rebuild operations might hit OpenAI API rate limits (3000 RPM for tier 1).

**Why it's risky:** Could fail mid-rebuild, waste API credits, or require manual intervention.

**Mitigation:**
- EmbeddingClient already has retry logic with exponential backoff
- Document rate limit implications in kb_rebuild_embeddings docs
- Add estimated API usage calculation before starting rebuild
- Batch processing inherently throttles requests
- Return partial success with clear error reporting

---

### 4. Cache Invalidation Strategy Ambiguity
**Risk:** Unclear when to use `force: true` vs `force: false` for kb_rebuild_embeddings.

**Why it's risky:** Could lead to stale embeddings persisting or unnecessary API costs.

**Mitigation:**
- Document specific scenarios in CACHE-INVALIDATION.md:
  - Model upgrade → force: true
  - Suspected cache corruption → force: true
  - Adding new entries → not needed (automatic)
  - Routine maintenance → force: false (incremental)
- Add cache versioning strategy to track model version
- Include invalidation procedures in deployment docs

---

### 5. Log Volume and Disk Space
**Risk:** Verbose logging (especially for bulk operations) could fill disk quickly.

**Why it's risky:** Could crash server or degrade performance.

**Mitigation:**
- Use structured logging with log levels (DEBUG, INFO, WARN, ERROR)
- Log summaries for large responses (count, not full data)
- Document log rotation configuration
- Make log level configurable via environment variable
- Exclude sensitive data (API keys, full embeddings) from logs

---

### 6. Database Connection Pool Exhaustion
**Risk:** Concurrent tool calls during performance testing could exhaust connection pool.

**Why it's risky:** Could cause cascading failures or timeouts.

**Mitigation:**
- Document connection pool configuration in DEPLOYMENT.md
- Performance tests should validate connection pool behavior
- Use realistic concurrent load (10-20 concurrent clients)
- Monitor connection pool usage in performance tests
- Set conservative pool size defaults (e.g., 20 connections)

---

### 7. Performance Regression Detection
**Risk:** Without baseline metrics, performance regressions might go unnoticed.

**Why it's risky:** Could degrade user experience over time.

**Mitigation:**
- Establish performance baselines in PERFORMANCE.md
- Document expected latencies for each tool
- Include performance test results in proof document
- Add performance monitoring recommendations for production
- Version performance benchmarks with code changes

---

### 8. Incomplete Error Handling in kb_rebuild_embeddings
**Risk:** Edge cases (database errors mid-rebuild, network failures) might not be handled gracefully.

**Why it's risky:** Could leave cache in inconsistent state or lose progress.

**Mitigation:**
- Test error scenarios explicitly:
  - OpenAI API timeout
  - Database connection loss
  - Out of memory
  - Process killed mid-rebuild
- Document rollback/recovery procedures
- Return detailed error information for debugging
- Log all failures at ERROR level with context

---

### 9. pgvector Index Tuning Complexity
**Risk:** Performance heavily depends on pgvector IVFFlat index configuration (lists parameter).

**Why it's risky:** Wrong configuration could cause 10x slowdowns or poor recall.

**Mitigation:**
- Include pgvector tuning section in PERFORMANCE.md
- Document tested lists parameter (e.g., lists=100 for 1k-10k entries)
- Provide formula for tuning: `lists ≈ sqrt(num_rows)`
- Include index rebuild procedures
- Test with realistic dataset sizes (1k, 10k entries)

---

### 10. Documentation Maintenance Burden
**Risk:** Documentation could become stale as code evolves.

**Why it's risky:** Outdated docs worse than no docs.

**Mitigation:**
- Link documentation to specific code versions/commits
- Include "last updated" timestamps
- Keep examples executable and testable
- Document breaking changes in changelog
- Use code examples that can be validated (e.g., TypeScript snippets)

---

## Scope Tightening Suggestions (Non-breaking)

### Add to Acceptance Criteria:

1. **kb_rebuild_embeddings - Max Batch Size**
   - Enforce max batch_size of 1000 to prevent resource exhaustion
   - Validate input parameters with Zod before processing

2. **Logging - Structured Format**
   - All logs must be valid JSON for parsing
   - Required fields: `{ timestamp, level, tool, duration_ms, summary }`
   - Exclude sensitive data (API keys, embeddings)

3. **Performance Tests - Optional in CI**
   - Performance tests pass locally
   - CI runs performance tests on manual trigger only (too environment-dependent)
   - Document expected performance ranges, not strict thresholds

4. **Documentation - Minimum Sections**
   - README.md must include: Getting Started, Configuration, MCP Tool Reference, Troubleshooting
   - PERFORMANCE.md must include: Benchmarks, Tuning Guide, Test Procedures
   - CACHE-INVALIDATION.md must include: Invalidation Scenarios, Procedures, Versioning

### Explicit OUT OF SCOPE (confirm with PM):

1. **Background Job Queue**
   - kb_rebuild_embeddings is synchronous (blocks until complete)
   - Async/queue-based rebuild deferred to future story

2. **Real-time Cost Tracking**
   - Only estimate cost before rebuild (chars × $0.00002/1k tokens)
   - Actual cost tracking requires OpenAI API usage endpoints (not in scope)

3. **Cache Versioning Schema**
   - Document versioning strategy (model name in cache key)
   - Automatic migration deferred to future story

4. **Admin UI Dashboard**
   - All admin tools are MCP CLI-based
   - Web UI deferred to KNOW-024

5. **Incremental Streaming Rebuild**
   - Rebuild processes all entries in memory
   - Streaming/chunked rebuild deferred to future if needed

---

## Missing Requirements / Ambiguities

### 1. kb_rebuild_embeddings - Force Flag Default
**Unclear:** Should `force` default to `true` or `false`?

**Recommendation:** Default to `false` (incremental rebuild). Safer default that doesn't waste API credits. Document that `force: true` should be used for model upgrades or corruption.

---

### 2. Logging - What to Log for kb_search Results
**Unclear:** Should search results be logged? If yes, how much (count vs full entries)?

**Recommendation:** Log result count and query only, not full entries (too verbose). Example: `{ tool: "kb_search", query: "...", result_count: 15, duration_ms: 120 }`

---

### 3. Performance Tests - Pass/Fail Criteria
**Unclear:** What latency targets are acceptable? Should tests fail if p95 exceeds threshold?

**Recommendation:** Use soft targets documented in PERFORMANCE.md. Tests should warn but not fail on minor regressions. Include baseline metrics in proof document for comparison.

---

### 4. Cache Invalidation - Model Version Tracking
**Unclear:** How to detect when OpenAI model changes (e.g., text-embedding-3-small updates)?

**Recommendation:** Include model name + version in cache key schema. Document manual rebuild procedure when model upgrades. Automatic detection deferred to future.

---

### 5. Documentation - Where to Document MCP Tool Schemas
**Unclear:** Should tool schemas be documented in README or separate TOOLS.md?

**Recommendation:** Include MCP tool reference section in README.md with schema examples. Link to MCP server docs for detailed protocol information.

---

### 6. Performance Testing - Dataset Size
**Unclear:** What dataset size should performance tests use?

**Recommendation:** Test with three sizes:
- Small: 100 entries (quick validation)
- Medium: 1000 entries (realistic load)
- Large: 10000 entries (stress test, optional)

Document hardware requirements for each tier.

---

### 7. Logging - Log Rotation Configuration
**Unclear:** Who configures log rotation (dev, ops, automatic)?

**Recommendation:** Document log rotation as deployment prerequisite in DEPLOYMENT.md. Provide example logrotate config. Not implemented in code (external concern).

---

## Evidence Expectations

### What Proof/Dev Should Capture:

1. **kb_rebuild_embeddings Functionality**
   - Terminal output showing successful rebuild of 50+ entries
   - Database query results showing new cache entries
   - Logs showing progress updates and completion summary
   - Screenshot of summary response JSON

2. **Logging Enhancements**
   - Log file snippet showing structured JSON logs for each tool
   - Example of INFO vs DEBUG vs ERROR level logs
   - Demonstration of large response truncation (kb_list with 1000 entries)

3. **Performance Test Results**
   - Vitest performance test suite passing
   - Benchmark results table (p50, p95, p99 for each tool)
   - Resource usage graphs (optional, nice to have)
   - Database query EXPLAIN ANALYZE for key operations

4. **Documentation Completeness**
   - README.md with all required sections
   - PERFORMANCE.md with tuning guide
   - CACHE-INVALIDATION.md with procedures
   - Code examples that execute successfully

5. **Error Handling Validation**
   - Test output showing graceful handling of OpenAI API failure
   - Test output showing validation errors for invalid input
   - Logs showing retry logic in action

### What Might Fail in CI/Deploy:

1. **Performance Tests**
   - CI environment may have different DB configuration or resources
   - **Mitigation:** Make performance tests optional in CI, document environment requirements

2. **Connection Pool Limits**
   - Default pool size might be too small for concurrent tests
   - **Mitigation:** Document pool configuration in DEPLOYMENT.md, test locally first

3. **Log File Permissions**
   - Log directory might not be writable in production
   - **Mitigation:** Document log directory configuration, use stdout as fallback

4. **OpenAI API Key Configuration**
   - Missing or invalid API key would break embedding tests
   - **Mitigation:** Use mocks in unit tests, real API only for integration tests

5. **Database Index Missing**
   - pgvector index might not exist in test DB
   - **Mitigation:** Document index creation in setup scripts, validate in tests

---

## Summary

KNOW-007 is **highly feasible** with **low implementation risk**. The story is well-scoped, builds on proven infrastructure, and focuses on polish/completeness rather than new capabilities. Main risks are around performance testing environment setup and long-running rebuild operations, both mitigated through documentation and conservative defaults.

**Recommended for approval with clarifications on:**
- Performance test pass/fail criteria (soft vs hard targets)
- Cache invalidation strategy and model versioning
- Log level configuration and rotation procedures
