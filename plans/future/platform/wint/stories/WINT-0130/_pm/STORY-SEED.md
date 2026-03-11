---
generated: "2026-02-16"
baseline_used: "/Users/michaelmenard/Development/monorepo/plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 1
---

# Story Seed: WINT-0130

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Knowledge base lessons not yet populated (WINT telemetry system not yet operational)

### Relevant Existing Features
| Feature | Location | Status | Relevance |
|---------|----------|--------|-----------|
| WINT Graph Schema | `packages/backend/database-schema/src/schema/wint.ts` | UAT (needs-work) | Foundation tables for graph queries |
| Session Management MCP Tools | `packages/backend/mcp-tools/src/session-management/` | Completed | Pattern for MCP tool structure |
| Story Management MCP Tools | `packages/backend/mcp-tools/src/story-management/` | Ready-to-work | Pattern for MCP tool structure with validation |
| Drizzle ORM + Zod | `packages/backend/database-schema/` | Deployed | ORM and validation framework |

### Active In-Progress Work
| Story | Status | Overlap Risk |
|-------|--------|--------------|
| None | — | No active work in graph or MCP tools area |

### Constraints to Respect
- WINT-0060 dependency is in UAT status (needs-work) - graph tables exist but may need refinement
- All MCP tools must use Zod-first validation (CLAUDE.md requirement)
- Database access must use Drizzle ORM with parameterized queries
- Phase 0 security acceptance criteria explicitly require input validation and SQL injection prevention

---

## Retrieved Context

### Related Endpoints
**MCP Tools Structure:**
- `packages/backend/mcp-tools/src/index.ts` - Main export file
- `packages/backend/mcp-tools/src/session-management/` - Complete MCP tool implementation pattern
- `packages/backend/mcp-tools/src/story-management/` - Complete MCP tool implementation pattern

**Database Schema:**
- `packages/backend/database-schema/src/schema/wint.ts` - Graph tables (features, capabilities, featureRelationships, cohesionRules)
- `packages/backend/database-schema/src/schema/__tests__/wint-graph-schema.test.ts` - Existing graph schema tests

### Related Components
**Existing MCP Tools:**
- `storyGetStatus()` - Pattern for query tool with Zod validation
- `storyUpdateStatus()` - Pattern for mutation tool with state transitions
- `sessionQuery()` - Pattern for complex query with filtering
- `sessionComplete()` - Pattern for state completion operations

**Database Tables (WINT-0060):**
- `features` - Tracks features with featureName, featureType, packageName, isActive
- `capabilities` - Tracks high-level capabilities with capabilityName, capabilityType, maturityLevel
- `featureRelationships` - Self-referencing relationships with relationshipType enum, strength (0-100)
- `cohesionRules` - Rules with ruleName, ruleType, conditions (JSONB), severity, isActive

### Reuse Candidates
**Packages:**
- `@repo/db` - Database client with connection pooling
- `@repo/logger` - Logging utility
- `@repo/database-schema` - Drizzle schema definitions and Zod schemas

**Patterns:**
- Zod validation at entry (fail fast) - used in all story-management tools
- Resilient error handling (log warnings, never throw DB errors) - from `storyGetStatus()`
- Dual ID support (UUID or human-readable) - from `StoryIdSchema`
- JSONB type safety - validated in graph schema tests

---

## Knowledge Context

### Lessons Learned
No lessons loaded - WINT telemetry system (WINT-0120) not yet implemented. Knowledge base is operational but does not yet contain workflow lessons.

### Blockers to Avoid (from past stories)
- None available - first graph query MCP tools story

### Architecture Decisions (ADRs)
| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT must use real services, not mocks |

**Note:** No ADRs directly applicable to MCP tools or database security patterns found in ADR-LOG.md. However, Phase 0 acceptance criteria explicitly mandate security requirements.

### Patterns to Follow
**From CLAUDE.md:**
- Zod-first types - ALWAYS use Zod schemas for types, never TypeScript interfaces
- Functional components only (N/A for backend)
- Named exports preferred
- NO BARREL FILES - import directly from source files
- `@repo/logger` for logging, never console.log

**From Existing MCP Tools:**
- Zod validation at function entry (fail fast)
- Resilient error handling with null returns
- Comprehensive JSDoc comments
- Type inference from Zod schemas
- Test coverage ≥ 80% (target 100%)

### Patterns to Avoid
- TypeScript interfaces without Zod schemas
- Throwing database errors to callers
- Console.log usage
- Barrel file exports

---

## Conflict Analysis

### Conflict: Blocking Dependency - WINT-0060 Status
- **Severity**: blocking
- **Description**: WINT-0060 (Create Graph Relational Tables) is marked as "needs-work" in UAT. The graph tables (features, capabilities, featureRelationships, cohesionRules) exist in the schema but may undergo changes during UAT resolution. Implementing MCP tools against an unstable schema risks rework.
- **Resolution Hint**:
  1. Verify WINT-0060 UAT issues do not affect table structure or query patterns needed by MCP tools
  2. Consult `/Users/michaelmenard/Development/monorepo/plans/future/platform/UAT/WINT-0060/WINT-0060.md` for current status
  3. If schema changes are expected, defer WINT-0130 until WINT-0060 reaches stable UAT status
  4. If schema is stable but UAT issues are unrelated (e.g., documentation, migration), proceed with MCP tool implementation using current schema
- **Source**: stories.index.md dependency analysis

---

## Story Seed

### Title
Create Graph Query MCP Tools

### Description
**Context:**
WINT-0060 established the graph relational tables (`features`, `capabilities`, `featureRelationships`, `cohesionRules`) in the WINT database schema. These tables enable the workflow intelligence system to reason about codebase structure, feature relationships, and cohesion rules.

To make this graph data accessible to agents, we need MCP tools that query the graph tables and provide cohesion analysis. These tools will enable Product Owner agents (Phase 4) to detect incomplete features ("Franken-features"), validate capability coverage, and enforce cohesion rules.

**Problem:**
Agents currently have no programmatic way to:
- Check if a feature has complete lifecycle coverage (create, view, edit, delete)
- Identify "Franken-features" (features with partial capability implementation)
- Query capability coverage across the codebase
- Apply cohesion rules to detect architectural violations

**Solution:**
Implement 4 MCP tools in `packages/backend/mcp-tools/src/graph-query/`:
1. `graph_check_cohesion` - Validate feature cohesion against rules
2. `graph_get_franken_features` - Identify features with incomplete capabilities
3. `graph_get_capability_coverage` - Query capability coverage per feature
4. `graph_apply_rules` - Apply active cohesion rules and return violations

These tools will use Drizzle ORM for type-safe queries, Zod for input validation, and follow the established pattern from session-management and story-management tools.

### Initial Acceptance Criteria
**Phase 0 Security Requirements (from stories.index.md):**
- [ ] AC-1: Explicit input validation requirements documented for all 4 MCP tool parameters
- [ ] AC-2: Parameterized queries (prepared statements) mandatory for all database access - no string concatenation
- [ ] AC-3: SQL injection risk mitigation testing completed with malicious input test cases
- [ ] AC-4: Input sanitization and validation library usage documented (Zod schemas)
- [ ] AC-5: Security review checklist for Phase 0 completion (validation, query safety, error handling)

**Functional Requirements:**
- [ ] AC-6: `graph_check_cohesion` tool accepts featureId, returns cohesion status (complete/incomplete/unknown)
- [ ] AC-7: `graph_get_franken_features` tool returns list of features with incomplete capability coverage
- [ ] AC-8: `graph_get_capability_coverage` tool accepts featureId, returns capability breakdown
- [ ] AC-9: `graph_apply_rules` tool accepts optional ruleType filter, returns violations with severity
- [ ] AC-10: All tools use Zod validation at entry (fail fast on invalid input)
- [ ] AC-11: All tools use Drizzle ORM with prepared statements (no raw SQL concatenation)
- [ ] AC-12: Resilient error handling - log warnings, return null/empty on errors (never throw DB errors)
- [ ] AC-13: Comprehensive JSDoc comments with examples for each tool
- [ ] AC-14: Unit tests with 80%+ coverage, including malicious input test cases
- [ ] AC-15: Tools exported from `packages/backend/mcp-tools/src/index.ts` (NO barrel files in subdirectories)

### Non-Goals
- Graph data population or seeding (separate story: WINT-4030)
- Feature extraction from codebase (static analysis - separate story)
- Graph visualization UI (out of scope)
- Materialized views for query optimization (deferred - may be needed based on performance)
- Integration with LangGraph nodes (separate story: WINT-9030 onwards)
- Agent implementation that uses these tools (Phase 4 stories: WINT-4060, WINT-4070)

### Reuse Plan
**Components:**
- Existing MCP tool structure from `session-management/` and `story-management/`
- Zod validation patterns from `StoryIdSchema`, `SessionQueryInputSchema`
- Error handling pattern from `storyGetStatus()` (resilient, returns null)
- Test structure from `wint-graph-schema.test.ts` and `story-get-status.test.ts`

**Patterns:**
- Drizzle ORM query patterns with `.select()`, `.where()`, `.eq()`, `.and()`
- JSONB type safety for `conditions` field in `cohesionRules`
- Enum validation for `relationshipType` in `featureRelationships`
- Self-referencing relationship queries (sourceFeatureId, targetFeatureId)

**Packages:**
- `@repo/db` for database client
- `@repo/logger` for logging
- `@repo/database-schema` for table definitions and Zod schemas
- `zod` for input validation
- `drizzle-orm` for query building

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
**Critical Test Coverage:**
1. **Input Validation Security Tests:**
   - SQL injection attempts via featureId: `'; DROP TABLE features; --`, `1' OR '1'='1`
   - Invalid UUID formats, empty strings, null values
   - XSS attempts in filter parameters
   - Extremely long input strings (DoS prevention)

2. **Query Safety Tests:**
   - Verify all queries use Drizzle ORM (no raw SQL)
   - Confirm prepared statements in generated SQL
   - Test with malformed filter conditions

3. **Functional Tests:**
   - Empty database scenarios (no features/capabilities)
   - Features with zero capabilities (franken-features)
   - Features with all capabilities (complete)
   - Multiple cohesion rule violations
   - Inactive rules should not be applied

4. **Edge Cases:**
   - Circular feature relationships
   - Self-referencing features
   - JSONB conditions parsing errors
   - Database connection failures (resilient error handling)

**Test Environment:**
- Real database (WINT schema) per ADR-005
- Seeded test data for graph tables (separate setup)
- Isolation between test runs (transaction rollback)

### For UI/UX Advisor
Not applicable - backend MCP tools only, no UI component.

### For Dev Feasibility
**Implementation Complexity: LOW-MEDIUM**

**Rationale:**
- Graph tables already exist (WINT-0060 in UAT)
- Clear pattern established by existing MCP tools
- Drizzle ORM provides type-safe query building
- Main complexity: understanding cohesion rule logic and graph traversal queries

**Potential Challenges:**
1. **WINT-0060 Dependency:** Schema may change if UAT issues affect table structure
   - **Mitigation:** Verify UAT status before starting, use current schema as baseline

2. **Graph Query Performance:** Complex relationship traversal may be slow
   - **Mitigation:** Start with simple queries, optimize if needed (materialized views deferred)

3. **Cohesion Rule Interpretation:** JSONB conditions field is flexible but requires interpretation logic
   - **Mitigation:** Start with basic rule types (package_cohesion), document condition schema

4. **Security Testing:** Comprehensive SQL injection testing required
   - **Mitigation:** Leverage Drizzle ORM's prepared statements, add extensive test cases

**Estimated Complexity:**
- Graph query logic: 3-5 hours
- Zod schemas and validation: 1-2 hours
- Security testing: 2-3 hours
- Unit tests (80%+ coverage): 3-4 hours
- Documentation: 1 hour
- **Total: 10-15 hours** (1.5-2 days)

**Dependencies:**
- WINT-0060 UAT resolution (blocking if schema changes expected)
- Database seeding for testing (can use manual INSERT for minimal test data)

**Risk Assessment:**
- **Schema stability:** HIGH - If WINT-0060 schema changes, rework required
- **Performance:** MEDIUM - Graph queries may need optimization later
- **Security:** LOW - Drizzle ORM + Zod validation mitigates SQL injection risks
- **Testing:** MEDIUM - Comprehensive security tests required for Phase 0 acceptance
