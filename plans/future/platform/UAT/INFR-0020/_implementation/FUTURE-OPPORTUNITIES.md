# Future Opportunities - INFR-0020

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No caching strategy for artifact reads | Low | Medium | Story explicitly defers caching to follow-up. Consider adding read-through cache for frequently accessed artifacts (e.g., story.yaml during workflow execution). Could reduce disk I/O by 30-50%. |
| 2 | Stage auto-detection may be slow for large feature directories | Low | Low | Current implementation searches sequentially through stages. If performance becomes issue, add filesystem watcher or maintain stage index. |
| 3 | No batch read/write operations | Low | Medium | Service provides individual artifact operations. For bulk operations (e.g., moving entire story between stages), batch APIs could reduce overhead. |
| 4 | No artifact validation caching | Low | Medium | Each read operation re-validates against Zod schema. For frequently accessed artifacts, cache validation results keyed by content hash. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Artifact versioning/history | Medium | High | Current service reads/writes current version only. Could extend to support artifact version history (e.g., track changes to CHECKPOINT.yaml over time). Useful for debugging workflow issues. |
| 2 | Read-only mode for safety | Medium | Low | Add read-only configuration flag to prevent accidental writes during analysis/debugging operations. |
| 3 | Artifact diffing capabilities | Medium | Medium | Service could provide diff operations between artifact versions (e.g., compare SCOPE.yaml before/after elaboration). Useful for change tracking and audit trails. |
| 4 | Streaming large artifacts | Low | High | Current implementation loads entire artifact into memory. For very large artifacts (e.g., multi-MB evidence files), streaming APIs could reduce memory pressure. |
| 5 | Artifact content preview | Low | Low | For large artifacts, provide preview/summary without loading full content. Similar to how PathResolver resolves paths without reading files. |
| 6 | Cross-artifact validation | Medium | Medium | Service could validate relationships between artifacts (e.g., verify all ACs in PLAN.yaml exist in story frontmatter). Currently each artifact validates independently. |
| 7 | Artifact search/query API | Low | High | Service could provide search capabilities across artifacts (e.g., "find all stories with checkpoint phase=planning"). Currently consumers must read all artifacts and filter manually. |
| 8 | Telemetry/metrics collection | Medium | Low | Track artifact read/write operations, validation failures, stage detection hits/misses. Useful for identifying performance bottlenecks and usage patterns. |
| 9 | Artifact locking/concurrency control | Medium | High | Current atomic writes prevent corruption but don't prevent race conditions if multiple processes write same artifact. Consider file-based locking for YAML-only mode. |
| 10 | Schema migration support | High | High | When artifact schemas change (e.g., new checkpoint phase added), service could automatically migrate old YAML files to new schema. Currently schema changes require manual migration. |

## Categories

- **Edge Cases**: Gaps #2, #3, #4 - Performance optimizations for high-volume scenarios
- **UX Polish**: Opportunities #2, #5, #7 - Developer experience improvements
- **Performance**: Gaps #1, #4; Opportunities #1, #4 - Caching, streaming, indexing
- **Observability**: Opportunity #8 - Telemetry and metrics
- **Integrations**: Opportunity #10 - Schema migration tooling

## Notes

**Caching Strategy (Gap #1, Gap #4):**
Deferred per story non-goals, but worth tracking. LangGraph workflows may read same artifact multiple times per execution. In-memory cache with TTL could significantly reduce I/O.

**Batch Operations (Gap #3):**
Not needed for MVP since current usage is single-artifact reads/writes in LangGraph nodes. Future MCP tools or CLI commands may benefit from bulk operations.

**Artifact Versioning (Opportunity #1):**
High value for debugging and audit trails. Could leverage existing YamlArtifactBridge version tracking. Consider for Phase 2.

**Cross-Artifact Validation (Opportunity #6):**
Medium value. Would catch inconsistencies like:
- ACs referenced in PLAN.yaml but missing from story frontmatter
- Checkpoint referencing non-existent phase
- SCOPE.yaml surfaces not matching story frontmatter surfaces

**Schema Migration (Opportunity #10):**
High value but high effort. As workflow evolves, artifact schemas will change. Automated migration would prevent manual YAML file updates. Consider migration framework similar to database migrations.
