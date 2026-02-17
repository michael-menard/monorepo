# Future Opportunities - KBAR-0020

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Integration tests with live database | Medium | Medium | Defer to KBAR-0030 (Story Sync Functions) - integration tests should validate actual database operations |
| 2 | Performance benchmarking for JSONB queries | Low | Medium | Defer to KBAR-0080+ (MCP tool implementation) - benchmark when real query patterns emerge |
| 3 | Migration rollback testing | Low | Low | Defer to operations/migration story - not schema validation concern |
| 4 | Actual data migration from existing sources | Medium | High | Defer to KBAR-0030+ - schema validation only, no data population in this story |
| 5 | Concurrency/race condition testing | Low | Medium | Defer to KBAR-0030+ integration tests - unit tests cannot validate database-level concurrency |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Test data factories for reusability | Medium | Low | Create in KBAR-0030 when integration tests need database fixtures |
| 2 | Property-based testing with fast-check | Medium | Medium | Consider for KBAR-0030+ to generate random valid/invalid data for fuzzing |
| 3 | Zod schema refinements with custom error messages | Low | Low | Add custom error messages if developers report poor DX during KBAR-0030+ implementation |
| 4 | Snapshot tests for migration SQL output | Low | Medium | Consider in future migration workflow story - validates migration file stability |
| 5 | Performance regression tests | Low | High | Defer to KBAR-0080+ - establish baseline metrics when MCP tools are implemented |
| 6 | Schema documentation generation | Medium | Medium | Auto-generate schema docs from Zod schemas in future docs tooling story |
| 7 | Visual ER diagram generation | Low | Low | Generate from Drizzle schema in future documentation enhancement |
| 8 | JSONB schema extraction to shared package | Medium | Low | Extract if KBAR-0030+ requires API-level validation of metadata structures |
| 9 | Enum value documentation/descriptions | Low | Low | Add enum descriptions if needed for API documentation in KBAR-0080+ |
| 10 | Cross-table constraint validation | Low | Medium | Validate business rules (e.g., story in 'done' must have all artifacts synced) in KBAR-0030+ |

## Categories

### Edge Cases
- **G1**: Integration tests with live database - validates actual Postgres behavior (transactions, constraints)
- **G2**: Performance benchmarking - measures query performance under load
- **G5**: Concurrency testing - validates database-level locking and race conditions

### UX Polish
- **E3**: Custom Zod error messages - improves developer experience when validation fails
- **E6**: Schema documentation generation - auto-generated docs from types
- **E7**: Visual ER diagrams - helps new developers understand relationships

### Performance
- **G2**: JSONB query performance benchmarking
- **E5**: Performance regression tests - prevent schema changes from degrading query speed

### Observability
- **E10**: Cross-table constraint validation - business rule enforcement monitoring

### Integrations
- **E8**: JSONB schema extraction to shared package - enables API-level validation
- **G4**: Actual data migration - import existing workflow data from filesystem

### Future-Proofing
- **E1**: Test data factories - reusable test fixtures for integration tests
- **E2**: Property-based testing - automatic edge case discovery through randomization
- **E4**: Snapshot tests for migrations - prevent accidental breaking changes to SQL
- **E9**: Enum documentation - machine-readable enum descriptions for tooling

---

## Notes

**Integration vs Unit Testing Boundary**:
This story correctly focuses on unit-level schema validation. Integration testing with live database connections, actual sync operations, and performance benchmarking are appropriately deferred to KBAR-0030+ where they provide more value in context.

**Pattern Reuse**:
The story leverages existing WINT/Artifacts test patterns effectively. Test data factories and property-based testing are valuable but not critical for initial validation - they should be introduced when patterns emerge from repeated integration test writing in KBAR-0030+.

**JSONB Schema Strategy**:
The decision to define JSONB metadata schemas inline in test file is pragmatic. Extracting to shared package (E8) should only happen if API validation requires it in KBAR-0080+ (MCP tools). Avoid premature abstraction.

**Documentation Opportunities**:
Schema documentation (E6, E7, E9) would be valuable but are not critical for MVP. These should be addressed in a dedicated documentation tooling story after the KBAR platform is functional and patterns stabilize.
