# Future Opportunities - WISH-20210

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No support for GraphQL schema analysis | Low | High | Tool currently only analyzes Drizzle/TypeScript. Future: extend to GraphQL schema changes (type additions, field modifications). Not MVP-critical as we don't use GraphQL yet. |
| 2 | No detection of string-based queries | Medium | High | Tool uses AST parsing for type references but misses dynamic queries like `db.query(\`SELECT ${columnName} FROM table\`)`. Future: add static analysis warnings for dynamic query patterns. |
| 3 | No analysis of migration file impacts | Low | Medium | Tool analyzes application code but not existing migration files. Future: check if proposed change conflicts with pending migrations. |
| 4 | No cross-package dependency graph | Medium | High | Tool reports affected files but doesn't show dependency chains (e.g., "Service A uses Repository B which uses Schema C"). Future: generate visual dependency graph. |
| 5 | Limited enum rename detection | Medium | Medium | Tool can detect hardcoded enum strings (`store === 'LEGO'`) but may miss complex pattern matching or switch statements with fallthrough. Future: enhance AST traversal for comprehensive enum usage. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Interactive CLI mode | High | Medium | Instead of one-shot `--table --change` flags, add interactive prompts: "What table?", "What change?", "Generate report?". Improves developer UX. |
| 2 | Diff-based analysis | High | High | Instead of manual `--change` specification, tool could analyze `git diff` of schema files and auto-detect changes. Reduces manual input errors. |
| 3 | AI-powered migration suggestions | High | High | After generating impact report, use AI (GPT-4) to suggest specific code changes for each affected file. Output actionable diffs, not just file lists. |
| 4 | Watch mode for schema files | Medium | Low | Add `pnpm db:impact-analysis --watch` to automatically re-run analysis when schema files change during development. |
| 5 | Integration with VS Code extension | High | High | Build VS Code extension that shows inline warnings when editing schema files: "This change affects 12 files - run impact analysis?". |
| 6 | Historical impact tracking | Medium | Medium | Store past impact reports in database/JSON and track: "Last 3 schema changes affected avg 8 files". Helps estimate future change effort. |
| 7 | Automated test generation | High | High | After identifying affected test files, auto-generate skeleton test cases for new columns/enums. Output `.test.ts` files with TODOs. |
| 8 | Rollback simulation | High | High | Tool currently shows "rollback safety" but doesn't simulate actual rollback. Future: generate rollback SQL and test against old code. |
| 9 | Multi-repository support | Low | High | Current tool scans single monorepo. Future: support analyzing impact across multiple linked repositories (e.g., separate frontend/backend repos). |
| 10 | Performance optimization with caching | Medium | Medium | Tool re-parses entire codebase on each run. Future: cache AST trees and only re-parse changed files. Critical for large codebases (>1000 files). |

## Categories

### Edge Cases
- **Gap #2**: String-based queries not detected (requires runtime analysis or advanced static analysis)
- **Gap #5**: Complex enum pattern matching missed (nested switch statements, regex patterns)
- **Enhancement #8**: Rollback simulation (requires executing migrations in reverse + code compatibility testing)

### UX Polish
- **Enhancement #1**: Interactive CLI mode (prompts instead of flags)
- **Enhancement #4**: Watch mode for continuous analysis
- **Enhancement #5**: VS Code extension integration

### Performance
- **Enhancement #10**: AST caching for large codebases (30+ second analysis time is too slow for frequent use)
- **Gap #4**: Dependency graph generation is O(n²) for n files - needs optimization

### Observability
- **Enhancement #6**: Historical impact tracking (builds institutional knowledge about schema change patterns)
- Store reports in database with tags for future querying: "Show all breaking changes in last 6 months"

### Integrations
- **Enhancement #2**: Git diff integration (auto-detect schema changes from working tree)
- **Enhancement #3**: AI-powered migration suggestions (GPT-4 integration for code generation)
- **Enhancement #7**: Automated test generation (skeleton test files for new columns/enums)
- **Enhancement #9**: Multi-repository analysis (microservices architecture support)

### Future-Proofing
- **Gap #1**: GraphQL schema analysis (not needed now, but will be critical if we adopt GraphQL)
- **Gap #3**: Migration file conflict detection (prevents migration number collisions)

---

## Implementation Notes

### High-Priority Enhancements (Post-MVP)

Once MVP is stable, prioritize:

1. **Enhancement #2 (Diff-based analysis)** - Eliminates manual `--change` input, reduces errors
2. **Enhancement #10 (Performance caching)** - Critical for developer adoption, must be <5 seconds
3. **Enhancement #1 (Interactive mode)** - Improves discoverability, better UX than flag-based CLI

### Low-Priority / Nice-to-Have

Defer until tool has proven adoption:

- Enhancement #5 (VS Code extension) - High effort, niche audience
- Gap #1 (GraphQL support) - No GraphQL usage currently
- Enhancement #9 (Multi-repo) - Single monorepo is sufficient for now

### Dependencies on Other Stories

- **Enhancement #3 (AI suggestions)** requires API key management and cost tracking (separate infrastructure story)
- **Enhancement #6 (Historical tracking)** requires database schema extension (new `schema_impact_reports` table)
- **Enhancement #7 (Test generation)** depends on test template standardization (separate testing story)

---

## Risk Mitigation Enhancements

Story identifies Risk 1 (False Negatives) and Risk 2 (AST Parsing Performance). Future enhancements address these:

- **Gap #2** (String-based query detection) mitigates false negatives for dynamic queries
- **Enhancement #10** (Performance caching) mitigates slow analysis times (Risk 2)
- **Enhancement #8** (Rollback simulation) provides additional safety net beyond static analysis

---

## User Feedback Integration Points

After MVP launch, gather feedback on:

1. **Report verbosity**: Are developers overwhelmed by 50+ affected files? (Add filtering: `--only-services`, `--exclude-tests`)
2. **False positive rate**: How often does tool report files that don't actually need changes? (Improve AST traversal accuracy)
3. **Missing detections**: What impacts did tool miss? (Build known limitations knowledge base - Gap #2)
4. **Integration preferences**: Do developers want CLI, VS Code extension, or CI bot? (Prioritize Enhancement #5 or CI integration)
