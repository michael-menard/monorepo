# Future Risks: KBAR-0020 Schema Tests & Validation

## Non-MVP Risks

### Risk 1: Test Data Factory Maintenance Burden
**Impact (if not addressed post-MVP):**
- As KBAR schema evolves, inline test data objects become repetitive and error-prone
- Integration tests in KBAR-0030+ will need consistent test data across files
- Schema changes require updating test data in multiple locations

**Recommended timeline:**
- **KBAR-0030 (Story Sync Functions):** Extract common test data into factory functions
- Create `packages/backend/database-schema/src/schema/__tests__/factories/kbar-factories.ts`
- Benefits both unit tests (KBAR-0020) and integration tests (KBAR-0030+)

---

### Risk 2: JSONB Metadata Schema Drift
**Impact (if not addressed post-MVP):**
- JSONB schemas defined inline in tests are not reusable for API validation
- Frontend/backend contract violations possible if metadata structure changes
- No single source of truth for metadata structure

**Recommended timeline:**
- **KBAR-0040 (Artifact Sync Functions) or KBAR-0080 (MCP Tools):** Extract JSONB schemas to shared package
- Create `packages/backend/db/src/schemas/kbar-metadata-schemas.ts` with Zod schemas
- Use in both unit tests AND API validation
- Consider adding to API contract documentation

---

### Risk 3: Limited Cascade Delete Testing
**Impact (if not addressed post-MVP):**
- Cascade delete behavior verified only in schema definition, not runtime behavior
- Risk of orphaned records if cascade constraints misconfigured
- Risk of unintended data loss if cascade is too aggressive

**Recommended timeline:**
- **KBAR-0030 (Story Sync Functions):** Integration tests with live database
- Test scenarios:
  - Delete story → verify artifacts cascade deleted
  - Delete artifact → verify content cache cascade deleted
  - Delete story with dependencies → verify join table entries cascade deleted
- Verify ON DELETE constraints match intended behavior

---

### Risk 4: No Performance Testing for Large Metadata
**Impact (if not addressed post-MVP):**
- JSONB metadata size limits not validated (AC-7 tests "large metadata" but doesn't define threshold)
- Risk of slow queries or storage bloat with large metadata objects
- No guidance for developers on metadata size best practices

**Recommended timeline:**
- **KBAR-0050 (Performance Testing) or KBAR-0060 (Query Optimization):** Define and test thresholds
- Establish metadata size limits (e.g., 10KB soft limit, 50KB hard limit)
- Add Zod schema validation for metadata size
- Performance test queries with large metadata (index efficiency)

---

### Risk 5: Schema Versioning and Migration Testing
**Impact (if not addressed post-MVP):**
- Schema tests validate current structure but don't test migration paths
- Risk of breaking changes when schema evolves (e.g., adding required fields)
- No rollback testing for migrations

**Recommended timeline:**
- **Post-KBAR MVP (Operations/Migration story):** Migration testing framework
- Test forward migrations (apply migration, verify schema)
- Test backward migrations/rollbacks (if supported)
- Test data preservation across migrations
- Document breaking change policy

---

### Risk 6: Enum Extensibility
**Impact (if not addressed post-MVP):**
- Current tests validate existing enum values but don't consider future additions
- Adding new enum values may break existing code if not handled gracefully
- No default/fallback handling for unknown enum values

**Recommended timeline:**
- **KBAR-0040+ (when enum values change):** Review enum handling strategy
- Consider using discriminated unions instead of fixed enums for extensible types
- Add unknown/other enum value for graceful degradation
- Document enum versioning policy

---

### Risk 7: No Cross-Schema Relationship Testing
**Impact (if not addressed post-MVP):**
- KBAR schema tests are isolated from WINT/INFR schema tests
- Risk of foreign key violations if KBAR references WINT tables (e.g., workflow state)
- No integration testing of cross-schema queries

**Recommended timeline:**
- **KBAR-0080+ (MCP Tools) or integration testing phase:** Cross-schema validation
- Test joins between KBAR and WINT tables
- Verify foreign key constraints across schemas
- Document cross-schema dependencies

---

### Risk 8: Timestamp Timezone Handling
**Impact (if not addressed post-MVP):**
- Edge case AC-7 mentions "timestamp timezone handling" but doesn't specify requirements
- Risk of timezone bugs in distributed systems (server vs client vs database timezone)
- No standardization on UTC vs local time

**Recommended timeline:**
- **KBAR-0030 (Story Sync Functions):** Standardize timezone handling
- Enforce UTC timestamps in database (Drizzle default)
- Document timezone conversion rules for frontend
- Test timezone edge cases (DST, cross-timezone sync)

---

## Scope Tightening Suggestions

### Clarification: "Edge Case Validation" (AC-7)
**Current state:** AC-7 lists many edge cases but doesn't define thresholds
**Suggestion:** For KBAR-0020, focus on qualitative validation (tests don't crash with large data)
**Future:** Define quantitative thresholds in performance testing story (KBAR-0050+)

### OUT OF SCOPE for KBAR-0020
These items are explicitly deferred to future stories:

1. **Integration tests with live database** → KBAR-0030
2. **Performance benchmarking** → KBAR-0050+
3. **Migration rollback testing** → Operations/Migration story
4. **Query optimization testing** → KBAR-0080+ (MCP tool implementation)
5. **Actual data migration/seeding** → KBAR-0030 or data seeding story
6. **API contract validation** → KBAR-0080+ (MCP tools)
7. **Cross-schema integration** → KBAR-0080+ or integration testing phase

---

## Future Requirements

### Nice-to-Have Requirements

1. **Test data builders with fluent API:**
   ```typescript
   const story = StoryBuilder()
     .withStoryId('WISH-2068')
     .withEpic('wishlist')
     .withPhase('backlog')
     .build()
   ```
   - Improves test readability
   - Reduces boilerplate
   - Defer to KBAR-0030+

2. **Property-based testing for JSONB metadata:**
   - Use libraries like `fast-check` to generate random valid/invalid metadata
   - Increase confidence in edge case handling
   - Defer to quality/testing improvement initiative

3. **Schema documentation generation:**
   - Auto-generate markdown docs from Drizzle schema + Zod schemas
   - Include in API documentation
   - Defer to documentation story

4. **Visual schema diagrams:**
   - Generate ERD (Entity Relationship Diagram) from schema
   - Include foreign keys, indexes, cascade rules
   - Defer to documentation story

---

## Polish and Edge Case Handling

### Post-MVP Polish Opportunities

1. **Improved error messages:**
   - Add custom Zod error messages for common validation failures
   - Example: "storyId must match pattern EPIC-NNNN" instead of generic "invalid format"
   - Defer to developer experience improvement initiative

2. **Test organization:**
   - Split large test file into multiple files per functional group:
     - `kbar-schema-stories.test.ts`
     - `kbar-schema-artifacts.test.ts`
     - `kbar-schema-sync.test.ts`
     - `kbar-schema-indexes.test.ts`
   - Defer to test suite refactoring (if file grows >1000 lines)

3. **Coverage for generated code:**
   - Current tests cover schema definitions, not generated Zod schemas
   - Consider adding contract tests for drizzle-zod output stability
   - Defer to tooling/dependency validation story

4. **Mutation testing:**
   - Use mutation testing tools to verify test quality (not just coverage)
   - Ensure tests fail when schema changes (not just when code changes)
   - Defer to advanced testing techniques initiative

---

## Monitoring and Maintenance

### Post-Deployment Monitoring Needs
N/A — Schema tests do not affect runtime, no monitoring needed

### Maintenance Tasks for Future Stories

1. **Keep test patterns in sync across KBAR/WINT/INFR schemas**
   - Review new test patterns in WINT/INFR and apply to KBAR if beneficial
   - Timeline: Ongoing during schema evolution

2. **Update tests when schema changes**
   - Add tests for new tables/columns/enums
   - Timeline: Immediate (part of any schema change PR)

3. **Regenerate Zod schemas when Drizzle config changes**
   - Run `pnpm db:generate` to regenerate schemas
   - Update snapshots if schema structure changes
   - Timeline: Part of migration workflow

---

## Summary

**KBAR-0020 is MVP-ready with high confidence.**

All identified risks are:
- **Non-blocking** for core schema validation functionality
- **Well-understood** with clear mitigation paths
- **Deferred** to appropriate future stories (KBAR-0030+, operations stories, quality initiatives)

The story's tight scope (unit tests only, no integrations) minimizes risk and maximizes delivery confidence.
