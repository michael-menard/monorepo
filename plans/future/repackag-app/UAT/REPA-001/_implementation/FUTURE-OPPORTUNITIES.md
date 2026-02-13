# Future Opportunities - REPA-001

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Zod version mismatch: Story specifies ^3.24.2, but @repo/app-component-library uses 4.1.13 | Low - Both versions are compatible, but consistency is preferred | Low - Update one line in dependency specification | Use zod ^4.1.13 to match monorepo standard (likely safer to align with newer version) |
| 2 | No explicit validation that package.json exports field sub-paths work | Low - Covered by manual testing recommendation (R4) but not in AC | Low - Add test import from sub-path in AC-16 | Consider adding explicit test: `import {} from '@repo/upload/hooks'` to verify sub-path exports |
| 3 | Token logging metadata in story file | Low - Informational only, doesn't affect implementation | Low - Archive to separate metadata file | Consider moving token log to separate `.meta.md` file to keep story focused |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Storybook configuration not included | Low - Not needed until components are migrated (REPA-005) | Medium - Requires Storybook setup + config | Add Storybook after REPA-005 completes for component documentation |
| 2 | Bundle size analysis tooling | Low - Useful for performance monitoring post-consolidation | Medium - Requires bundlesize or similar tool setup | Add bundle analyzer after REPA-005 to track package size impact |
| 3 | Changeset integration for version tracking | Low - Only needed if publishing package externally | Low - Add changesets config if needed | Defer until package stability and potential external publishing |
| 4 | Package-level pre-commit hooks | Low - Monorepo already has global hooks | Low - Add if package-specific validation needed | Not recommended - monorepo hooks are sufficient |
| 5 | Additional TypeScript strict flags (noUncheckedIndexedAccess, exactOptionalPropertyTypes) | Medium - Improves type safety but may increase migration complexity | Medium - May require refactoring migrated code | Consider after initial migrations (REPA-002-006) complete to avoid migration friction |
| 6 | ESLint custom rules (e.g., no-restricted-imports to prevent circular deps) | Medium - Prevents common issues in shared packages | Low - Add rules to package-level ESLint config | Consider after REPA-006 when all modules are migrated and dependency graph is clear |
| 7 | Dual ESM/CJS exports | Low - Monorepo is ESM-only, only needed for external publishing | Medium - Requires dual build pipeline | Defer unless package is published to npm |
| 8 | GitHub Actions package-specific CI workflow | Low - Monorepo CI already covers this package via Turborepo | Medium - Requires dedicated workflow file | Not recommended unless package is published externally |
| 9 | More granular AC for directory structure (one AC per directory vs. combined AC-10) | Low - Current AC-10 is clear but could be more granular | Low - Split AC-10 into AC-10a through AC-10e | Consider for future stories to make verification more explicit |
| 10 | README enhancement with contribution guidelines | Medium - Helps future contributors understand package structure and migration plan | Low - Expand README with detailed sections | Enhance README incrementally as migration stories (REPA-002-006) complete, documenting learnings |

## Categories

### Edge Cases
- **Dependency version alignment**: Zod version mismatch (minor, non-blocking)
- **Sub-path export verification**: Export field testing could be more explicit
- **Concurrent build safety**: Already covered in test plan (EC3)

### UX Polish
- **README documentation**: Could expand with contribution guidelines and migration status
- **Storybook integration**: For component documentation (REPA-005+)
- **Token metadata location**: Move to separate file for cleaner story structure

### Performance
- **Bundle size tracking**: Add analyzer for size monitoring post-consolidation
- **Build performance**: Monitor impact on CI times (likely negligible with Turborepo caching)

### Observability
- **Package usage tracking**: Could add metrics for how apps consume the package (post-migration)
- **Migration progress dashboard**: Track which components/hooks have been migrated (REPA-002-006)

### Integrations
- **Changesets for versioning**: Only if package is published externally
- **External publishing**: npm publish capability (low priority, monorepo-internal only currently)

---

## Recommendations for Future Stories

### For REPA-002 (Migrate Upload Client Functions)
- Ensure zod version is consistent before migrating types
- Test that migrated client functions work with placeholder structure created in REPA-001
- Document any discovered limitations in the directory structure

### For REPA-003 (Migrate Upload Hooks)
- Verify hooks can import cleanly from client/ subdirectory
- Consider adding ESLint rule to prevent hooks from importing components (enforce unidirectional dependency)

### For REPA-005 (Migrate Upload Components)
- **This is when Storybook should be added** (see Enhancement #1)
- Verify components can import from hooks/ and client/ without circular dependencies
- Document component composition patterns for future reuse

### For REPA-006 (Migrate Upload Types)
- **Critical**: Resolve zod version mismatch at this point if not already done
- Ensure types/ directory exports don't create circular dependencies with client/ or hooks/
- Consider adding TypeScript strict flags after types are stable (see Enhancement #5)

### Post-REPA-006 (After All Migrations Complete)
- Conduct bundle size analysis (Enhancement #2)
- Add custom ESLint rules to prevent future circular dependencies (Enhancement #6)
- Enhance README with complete migration learnings (Enhancement #10)
- Consider adding migration retrospective to KB for future consolidation epics

---

## Out of Scope Validation

The following items are correctly documented as out-of-scope for REPA-001:

✅ **Code Migration**: Reserved for REPA-002, REPA-004, REPA-006 (correctly scoped)
✅ **Hook Migration**: Reserved for REPA-003 (correctly scoped)
✅ **Component Migration**: Reserved for REPA-005 (correctly scoped)
✅ **Storybook Setup**: Deferred to post-REPA-005 (correctly scoped)
✅ **Package Deprecation**: Reserved for post-migration stories (correctly scoped)
✅ **App Refactoring**: Reserved for post-migration stories (correctly scoped)

All out-of-scope items are appropriate for a foundational package structure story.
