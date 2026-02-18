# Future Opportunities - WINT-9010

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | `DEBT-RU-002` and `DEBT-RU-003` in mcp-tools document that the state enum is repeated 4× across files. WINT-9010 creates the shared package, but updating all 4 occurrences is out of scope. | Medium | Low | Create a follow-on story after WINT-9010 to deduplicate the DB state enum across mcp-tools. |
| 2 | `detectMonorepoRoot()` and `resolveStoriesRoot()` in story-compatibility use `fs.existsSync` — pure path logic but with Node.js dependency. Could be extracted into a `@repo/workspace-utils` package (not `workflow-logic`). | Low | Medium | Deferred. Create `@repo/workspace-utils` in a future Phase 9 story if needed by LangGraph nodes. |
| 3 | Three state models (`story-state-machine.ts` 17-state, `story-state.ts` 8-state, DB model 8-state snake_case) will remain divergent after WINT-9010 even with the adapter from the resolved MVP gap. Full canonicalization is a larger architectural decision. | High | High | Deferred to a dedicated Phase 9 architectural story. WINT-9010 bridges but does not unify. |
| 4 | `STATUS_DIRECTORY_MAP` in `story-state-machine.ts` performs the reverse of `getStatusFromDirectory` — mapping status → directory name. Both directions would be useful in LangGraph nodes but reverse mapping is excluded from current scope. | Medium | Low | Add `getDirectoryFromStatus(status: WorkflowStoryStatus): string \| null` to `@repo/workflow-logic` in a follow-on story or during WINT-9020 if needed. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | `STORY_ID_REGEX = /^[A-Z]{2,10}-\d{3,4}$/` allows 3-4 digit suffixes. Phase 9 IDs (e.g., `WINT-9010`) work, but 5-digit IDs (`WINT-90100`) would fail. Low probability today but worth extending regex to `\d{3,5}`. | Low | Very Low | Extend regex to `\d{3,5}` during WINT-9010 implementation — trivial change, zero risk. |
| 2 | Property-based testing (fast-check) for transition invariants: no self-transitions, terminal states have empty arrays, all states reachable. More efficient than manual case-by-case testing. | Low | Low | Consider for WINT-9010 test suite if coverage target is met with fewer cases. |
| 3 | Export raw `validTransitions` record alongside the `getValidTransitions(status)` function to give consumers flexibility to build custom lookup functions. | Low | Very Low | Consider including in initial export surface. Adds API surface area — only add if a WINT-9020+ story explicitly requests it. |
| 4 | `@repo/workflow-logic` could export a `StoryLifecycle` namespace grouping all transition, directory, and ID utilities under a single import. This is a DX improvement for consumers. | Low | Low | Deferred. Start with flat exports per project conventions. Refactor if import ergonomics become a pain point. |

## Categories

- **Tech Debt**: DEBT-RU-002/003 deduplication (item 1)
- **Architecture**: State model consolidation (item 3), reverse directory mapping (item 4)
- **UX/DX**: Namespace grouping (enhancement item 4)
- **Edge Cases**: Regex extension for 5-digit IDs (enhancement item 1)
- **Testing**: Property-based tests (enhancement item 2)
