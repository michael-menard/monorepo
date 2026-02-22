# Future Opportunities - AUDT-0020

Non-MVP gaps and enhancements tracked for future iterations.

---

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | `lens-typescript` has no all-findings `lens === 'typescript'` assertion — it verifies individual findings via title/severity checks but never asserts `result.findings.every(f => f.lens === 'typescript')` | Low | Low | Add a single `findings.every(f => f.lens === 'typescript')` assertion in the existing `detects "as any"` test or as a standalone test. Currently covered transitively by schema compliance (schema enforces AuditLensSchema enum), so not a correctness gap. |
| 2 | `lens-duplication` positive fixture count: the cross-app duplicate test (test 2) and the same-filename-same-app negative test (test 3) are structurally similar — a dedicated test for 3 distinct cross-app pairs would increase fixture diversity | Low | Low | Add one more cross-app positive: `useRovingTabIndex` appearing in both `main-app` and `app-dashboard`. Solidifies AC-3 with a third unique positive pattern. |
| 3 | `lens-test-coverage` "empty file → 0 findings" test uses `makeState([])` instead of a genuine 0-byte file. The comment explains why, but a follow-up could add a test using `__types__/` or `.config.` path to demonstrate a 0-byte file that is genuinely skipped | Low | Low | After story completion, add test: create a 0-byte file at `__types__/empty.ts` and verify `total_findings === 0`. This gives a more honest "empty file" demonstration. |
| 4 | `lens-ui-ux` has only 2 explicit clean negative fixtures (non-apps/web api path, packages/ path). The AC requires a minimum of 3. A third clean negative (e.g., a `.tsx` in `apps/web/` with only Tailwind classes and no style/CSS/hex patterns) would close this | Low | Low | Add third clean negative in ST-1. Treat as part of current scope, not deferred. (Already identified as Issue #3 in ANALYSIS.md — listed here for visibility as a cross-reference.) |

---

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | File-size gating: no lens currently limits file read size. For the current monorepo (files <300KB), this is fine. As the codebase grows or external repos are audited, a 1MB+ file could slow down a full scan | Medium | Medium | Defer to AUDT-0030 or a dedicated tech-debt story. Add a shared `guardFileSizeKB(content, limitKB)` utility in a new `nodes/audit/utils.ts` and test it independently. |
| 2 | Binary file guard: `readFile('utf-8')` on binary content silently returns garbled text. The security lens is the highest-risk for false positives (keyword patterns could match binary noise). Current test plan accepts this behavior, but a null-byte check (`content.includes('\x00')`) would prevent false positives on binary files (e.g., accidentally included `.wasm` or compiled artifacts) | Medium | Low | Add to lens-security.ts implementation (2-line guard) in a future tech-debt story. Test is being added in ST-3 of current story. If test reveals real false positives, promote to current scope. |
| 3 | Test isolation: all 9 lens tests use `Date.now()` for unique temp dir names. Under fast parallel test execution, two tests starting within the same millisecond could theoretically collide. Use `crypto.randomUUID()` or `process.hrtime.bigint()` for stronger uniqueness | Low | Low | Low-risk in practice. Replace `Date.now()` with `Math.random().toString(36).slice(2)` in all 9 `beforeEach` blocks for robustness. Defer — not blocking. |
| 4 | `lens-duplication` known-hook list is hardcoded in the lens implementation. Adding a new cross-app hook to the codebase would require a manual update to the known-hook list. A future improvement could dynamically build the known-hook list from `packages/` at scan time | Medium | High | Defer to a dedicated lens accuracy story (post-AUDT-0030). Document the known limitation in a code comment in `lens-duplication.ts`. |
| 5 | `lens-react` N+1 detection: the current positive patterns focus on event listeners and DOM queries. A common React anti-pattern not yet covered is inline function creation in JSX props (e.g., `onClick={() => handler(id)}` inside a list render) — this causes unnecessary re-renders in large lists | Medium | Medium | Defer to a lens enhancement story. Would require a new pattern and corresponding positive/negative fixtures. Ensure AC-5 (3+ positive fixtures) is met in current story first. |
| 6 | Performance benchmark tests: AUDT-0010 deferred timing threshold tests. No lens currently asserts that it completes within a time bound. For a full-repo audit (1000+ files), lens execution time matters | Medium | High | Defer to AUDT-0030 or a dedicated performance story. Add `const start = Date.now(); await run(...); expect(Date.now() - start).toBeLessThan(5000)` for a 100-file fixture. |
| 7 | Snapshot tests for `LensResult` shape: schema compliance via `LensResultSchema.parse()` is the current approach. Snapshot tests on the exact output structure could catch subtle field additions or renames | Low | Low | Deferred per story Non-goals. Consider enabling after AUDT-0030 stabilizes the full graph output. |
| 8 | Delta scope test coverage: current tests only use `scope: 'full'`. Delta/domain/story scope variants are explicitly deferred per Non-goals. Future scope: add `makeState([], 'delta')` tests to verify lens behavior when scope is narrowed | Low | Medium | Defer to a dedicated scope-variants story (post-AUDT-0030). No implementation changes needed — just additional test cases. |

---

## Categories

- **Edge Cases**: File-size gating (item 1), binary file guard (item 2), test isolation improvement (item 3)
- **UX Polish**: N/A — no UI surface
- **Performance**: Timing benchmark tests (item 6), file-size gating (item 1)
- **Observability**: N/A — audit output is the observability artifact
- **Integrations**: Dynamic known-hook list from `packages/` at scan time (item 4)
- **Lens Accuracy**: N+1 detection in lens-react (item 5)
- **Test Infrastructure**: Snapshot tests (item 7), delta scope coverage (item 8)
