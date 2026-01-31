# Elaboration Report - KNOW-006

**Date**: 2026-01-25
**Verdict**: CONDITIONAL PASS

## Summary

KNOW-006 (Parsers and Seeding) is well-scoped and internally consistent with comprehensive acceptance criteria covering YAML parsing, markdown parsing, bulk import, and statistics querying. The story demonstrates excellent reuse of existing infrastructure (kb_add, EmbeddingClient, MCP patterns) and includes sufficient test coverage planning (60-80 tests). User decisions to incorporate all identified gaps and selected enhancements make the story ready for implementation.

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Scope matches index entry exactly: parsers (YAML + markdown), bulk import, kb_stats tool. No extra endpoints or infrastructure. |
| 2 | Internal Consistency | PASS | — | Goals, Non-goals, Decisions, ACs, and Test Plan are all aligned. AC8 (duplicate ID detection) matches goal of "handle malformed input gracefully". |
| 3 | Reuse-First | PASS | — | Excellent reuse: kb_add (CRUD), EmbeddingClient (batch processing), @repo/logger, Drizzle ORM, MCP server patterns. Only new dependency is js-yaml (industry standard). |
| 4 | Ports & Adapters | PASS | — | Clear domain/application separation: parsers (domain logic) are transport-agnostic, bulk import wraps kb_add, MCP tools are thin adapters. Architecture diagram shows clean layering. |
| 5 | Local Testability | PASS | — | No HTTP endpoints (MCP tools). Test plan includes 60-80 Vitest tests with fixtures, integration tests with DB + EmbeddingClient, security tests. Performance targets specified. |
| 6 | Decision Completeness | CONDITIONAL | Medium | 5 PM clarification questions remain (AC section). Most are mapping details, not blockers. Field mapping for YAML is documented but should be confirmed. |
| 7 | Risk Disclosure | PASS | — | Comprehensive: 8 risks documented with mitigations (YAML security, performance, cost, format assumptions, test cleanup, transaction boundaries, deduplication, field mapping). |
| 8 | Story Sizing | PASS | — | 10 ACs, 60-80 tests, 8 story points. Indicators: 4 operations (parsers + bulk import + stats), backend-only, touches 2 directories (parsers/ + seed/), 3 test scenarios. Within bounds. |

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status |
|---|-------|----------|--------------|--------|
| 1 | PM clarification questions unanswered | Medium | Story includes "Questions for PM Review" section with 6 items. Most are mapping details (YAML field handling), not blockers, but should be resolved before implementation. | **RESOLVED** - User decisions provided confirm field mapping and duplicate behavior |
| 2 | kb_stats output schema mentions cache_hit_rate | Low | AC5 shows cache_hit_rate is NOT in output schema, but test plan Risk 2 mentions logging cost estimation which references hit rate. Clarify this is for logging only, not API response. | **RESOLVED** - Confirmed in AC5 that cache_hit_rate is not in MVP output schema |
| 3 | CLI script requirement ambiguity | Low | AC9 is marked "Optional" but DoD doesn't specify. PM should confirm if CLI scripts are required for DoD or truly optional. | **RESOLVED** - AC9 correctly marked optional; DoD should reflect this (no change required to AC) |

## Split Recommendation

Not applicable - Story passes sizing check.

## Discovery Findings

### Gaps Identified

User decisions applied to identified gaps:

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | File size validation (max 1MB) | **ADD AS AC** | Prevents Node.js OOM on large YAML/Markdown files. Will add file size validation to AC1, AC2. Reject files >1MB with clear error message. |
| 2 | Tag format validation (alphanumeric + hyphen/underscore, max 50 chars) | **ADD AS AC** | Prevents SQL injection, XSS vectors in tags. Zod schema to validate tag format and per-tag character limit. |
| 3 | Rollback mechanism (bulk_import_session_id for group deletion) | **ADD AS AC** | Enables users to undo partial imports. Add bulk_import_session_id tracking and kb_rollback_bulk_import tool for future use. |
| 4 | Concurrent import test (2 concurrent imports without deadlock) | **ADD AS AC** | Ensures safety when multiple users/processes import simultaneously. Add AC11 with specific test requirement. |
| 5 | Content sanitization (strip control characters) | **ADD AS AC** | Prevents control character (0x00-0x1F) issues in database and display. Sanitize content in parsers before Zod validation. |
| 6 | Format version detection (version marker + graceful failure) | **ADD AS AC** | Handles future LESSONS-LEARNED.md format changes. Add version marker check (e.g., `<!-- format: v1.0 -->`) and fail gracefully on mismatch. |
| 7 | Structured logging for import completion | **ADD AS AC** | Enables monitoring and debugging in production. Log structured event (json) with metrics: total, succeeded, failed, duration. |
| 8 | Max tag count constraint (50 tags per entry) | **ADD AS AC** | Prevents performance degradation from excessive tags. Zod schema constraint: `z.array().max(50)` on tags field. |

### Enhancement Opportunities

User decisions applied to enhancement opportunities:

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Parser plugin architecture | **OUT OF SCOPE** | Future sources (Google Docs, Confluence) can be added later. Not required for MVP. |
| 2 | Dry-run mode for bulk import | **ADD AS AC** | Valuable for validation before commit. Add `dry_run: boolean` flag to kb_bulk_import schema. Returns same summary without database writes. |
| 3 | Similarity-based deduplication (warn on 95%+ similar) | **ADD AS AC** | Helps identify near-duplicates leveraging existing embeddings. Add deduplication check using existing kb_get_related from KNOW-004. Log warnings in import summary. |
| 4 | Incremental import with delta detection (import_manifest table) | **ADD AS AC** | Supports safe re-imports of updated YAML with minimal redundant work. Track source_file + source_id mapping, compare content hash, skip unchanged. Requires new import_manifest table. |
| 5 | YAML pre-flight validation | **ADD AS AC** | Validates structure + required fields + duplicate IDs before generating embeddings. Saves cost on malformed data. Add optional `validate_only` mode or separate tool. |
| 6 | Tier-aware cost estimation | **OUT OF SCOPE** | OpenAI tier pricing changes frequently and is opaque. Simple fixed-rate estimate sufficient for MVP. |
| 7 | Auto-tagging from content analysis | **OUT OF SCOPE** | Requires NLP/LLM capabilities beyond scope. Can be added in future story if needed. |
| 8 | Resume capability for interrupted imports | **ADD AS AC** | Enables recovery from failures. Track bulk_import_session_id + last_completed_index. Use idempotent upsert strategy. Requires checkpoint table. |

### Follow-up Stories Suggested

Based on user decisions to add enhancements as ACs, these may become separate stories:

- [ ] KNOW-006a: Query deduplication strategy (if similarity-based dedup becomes expensive)
- [ ] KNOW-006b: Import manifest and incremental sync (if delta detection is needed frequently)
- [ ] KNOW-006c: Enhanced cost estimation with volume tiers (if pricing tiers become relevant)
- [ ] KNOW-0073: Auto-tagging with LLM analysis (future enhancement)

### Items Marked Out-of-Scope

- **Parser plugin architecture**: Future extensibility (Google Docs, Confluence, Notion) deferred to separate stories
- **Tier-aware cost estimation**: OpenAI pricing tiers too volatile; fixed-rate estimate sufficient
- **Auto-tagging from content analysis**: Requires NLP/LLM capabilities beyond MVP scope

## Proceed to Implementation?

**YES** - Story may proceed to implementation.

**Rationale**:
- All critical issues resolved through user decisions
- Gap findings incorporated as acceptance criteria
- Enhancements validated and approved for inclusion or out-of-scope marking
- Test coverage plan comprehensive (60-80 tests planned)
- Reuse-first architecture confirmed
- Field mapping for YAML confirmed via user decisions
- Risk mitigations documented

**Recommended Implementation Order:**

1. **Phase 1 - Core Parsers** (40% effort)
   - parseSeedYaml() with Zod validation, file size limits, tag format validation
   - parseLessonsLearned() with markdown parsing, format version detection
   - Security tests and edge cases

2. **Phase 2 - Bulk Import** (40% effort)
   - kb_bulk_import() with batch processing, error collection, structured logging
   - Concurrent import test and deadlock prevention
   - Rollback mechanism (session tracking for future deletion)
   - Deduplication checks (similarity warning in summary)

3. **Phase 3 - Stats & Polish** (20% effort)
   - kb_stats() with aggregation queries
   - MCP tool registration and integration tests
   - Optional: CLI seeding scripts
   - Optional: Import manifest table for incremental sync

---

## Implementation Considerations

### Story-Level Acceptance Criteria Changes

Based on user decisions, the following should be added/clarified in story ACs:

**New AC11: Concurrent Import Safety**
- Given: 2 concurrent kb_bulk_import() calls
- When: Both import same or different entries
- Then: No deadlock, no corrupted data, both return accurate summaries

**New AC12: File Size Validation**
- Given: YAML or Markdown file >1MB
- When: parseSeedYaml() or parseLessonsLearned() called
- Then: Throw error "File exceeds 1MB limit" before parsing

**New AC13: Tag Format & Count Constraints**
- Given: Entries with tags outside alphanumeric+hyphen+underscore or >50 chars
- When: Zod validation executed
- Then: Throw ValidationError with field details

**New AC14: Content Sanitization**
- Given: YAML entry with control characters (0x00-0x1F)
- When: Content sanitized
- Then: Control characters stripped or escaped, content remains readable

**New AC15: Format Version Detection**
- Given: LESSONS-LEARNED.md with version marker
- When: parseLessonsLearned() executes
- Then: Detect marker, fail gracefully if mismatch, log warning

**New AC16: Dry-Run Mode**
- Given: kb_bulk_import() called with `dry_run: true`
- When: Execution proceeds
- Then: Same validation and preview, no database writes, summary returned

**New AC17: Deduplication & Similarity Warning**
- Given: bulk import with entries similar (95%+) to existing
- When: EmbeddingClient used to detect similarity
- Then: Log warning in summary, include matched entry IDs

**New AC18: Incremental Import Support**
- Given: YAML with source_id metadata
- When: kb_bulk_import() with incremental mode
- Then: Compare content hash against import_manifest, skip unchanged entries

**New AC19: YAML Pre-Flight Validation**
- Given: kb_bulk_import() called with `validate_only: true`
- When: Execution proceeds
- Then: Full validation without embedding generation, cost estimate, error summary

**New AC20: Structured Import Logging**
- Given: kb_bulk_import() completion
- When: Logging executed
- Then: JSON structured log with metrics: total, succeeded, failed, duration, cost_estimate

### Test Strategy Adjustments

New tests to implement:

1. **Concurrent imports** (deadlock prevention)
2. **File size limits** (>1MB rejection)
3. **Tag format constraints** (invalid chars, length)
4. **Content sanitization** (control character stripping)
5. **Format version detection** (LESSONS-LEARNED format check)
6. **Dry-run mode** (no database writes, preview accuracy)
7. **Similarity deduplication** (95%+ match detection, warning logs)
8. **Incremental import** (delta detection, skip logic)
9. **Pre-flight validation** (cost-free validation preview)
10. **Structured logging** (JSON format, metric accuracy)

---

## Elaboration Sign-Off

| Role | Status | Notes |
|------|--------|-------|
| QA Discovery | ✅ COMPLETE | 8 gaps and 8 enhancements analyzed; user decisions applied to AC and out-of-scope decisions |
| PM Review | ✅ APPROVED | User confirmed all field mapping questions and duplicate handling via decision list |
| Implementation Ready | ✅ YES | Story can proceed; all critical ambiguities resolved; test coverage plan sufficient |

---

**Elaboration completed**: 2026-01-25
**Next step**: Move to ready-to-work queue for implementation sprint planning
