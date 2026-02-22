# Test Plan: AUDT-0020 — Polish and Complete Unit Test Coverage for All 9 Audit Lens Nodes

## Scope Summary

- **Endpoints touched**: None — entirely within `packages/backend/orchestrator`
- **UI touched**: No
- **Data/storage touched**: No — only filesystem (tmpdir) during testing
- **Files changed**: `packages/backend/orchestrator/src/nodes/audit/__tests__/lens-*.test.ts` (9 files)

---

## Per-Lens Checklist

| Lens | File | Positive Count | Negative Count | Edge Cases | Schema Compliance | by_severity | lens field |
|------|------|---------------|----------------|------------|-------------------|-------------|------------|
| security | lens-security.test.ts | 8 (apiKey, password, eval, child_process, dangerouslySetInnerHTML, CORS, SQL, sensitive console) | 3 (clean, empty, non-existent) | empty file, non-existent, empty array | YES — LensResultSchema.parse() | YES | YES (`'security'`) |
| duplication | lens-duplication.test.ts | 5 (cross-app same name, known hook useLocalStorage, useAnnouncer, useRovingTabIndex, cross-app dup) | 3 (same-app, packages/, test files) | empty file, non-existent | YES | NO — needs adding | NO — missing empty array test |
| react | lens-react.test.ts | 5 (addEventListener, dom getElementById, dom querySelector, createObjectURL, + one more) | 2 (.ts files, test files) | empty file, non-existent | YES | NO — needs adding | YES (`'react'`) |
| typescript | lens-typescript.test.ts | 8 (as any, interface, enum, any[], Record<string,any>, Promise<any>, @ts-ignore, severity downgrade prod) | 3 (.json, clean .ts, .d.ts) | empty file, non-existent, empty array | YES | NO — needs adding | YES (`'typescript'`) |
| a11y | lens-accessibility.test.ts | 4 (icon button, img missing alt, div onClick, multi-finding) | 3 (with aria-label, with onKeyDown, non-apps/web, .ts files) | empty file, non-existent | YES | NO — needs adding | YES (`'a11y'`) |
| code-quality | lens-code-quality.test.ts | 7 (empty catch, empty catch2, console.log, console.error, TODO, FIXME, HACK, file>300lines) | 3 (.test.ts, __tests__, .d.ts) | empty file, non-existent, clean file | YES | NO — needs adding | YES (`'code-quality'`) |
| performance | lens-performance.test.ts | 6 (readFileSync, lodash, moment, console.log web, + path-specific tests) | 3 (wrong path readFileSync, wrong path lodash, test files) | empty file, non-existent | YES | NO — needs adding | YES (conditional guard) |
| ui-ux | lens-ui-ux.test.ts | 5 (inline style, hex color, .css import, CSS-in-JS, + calc exempt) | 2 (non-apps/web api, packages/) | empty file, non-existent | YES | NO — needs adding | YES (conditional guard) |
| test-coverage | lens-test-coverage.test.ts | 6 (no test, handlers high, auth high, services high, handlers index.ts, + more) | 4 (with test file, index.ts, __types__/, .config., .d.ts, test files) | empty array (substituted), non-existent | YES | NO — needs adding | YES (`'test-coverage'`) |

**Summary of gaps**:
1. `by_severity` consistency check missing in: duplication, react, typescript, a11y, code-quality, performance, ui-ux, test-coverage
2. `empty targetFiles []` edge case missing in: duplication, react, a11y, ui-ux, performance
3. `lens` field consistency assertion (all findings use correct lens) missing in: duplication, a11y (partially present), code-quality, test-coverage
4. React has only 2 clean negative fixtures (needs 3 minimum) — the `.ts` and test file exclusion tests qualify but need a third explicit clean file test

---

## Happy Path Tests

### Test 1: Schema compliance — all 9 lenses produce valid LensResultSchema output
- **Setup**: Create temp file with clean content; call `run(makeState([filePath]))`
- **Action**: `LensResultSchema.parse(result)` — must not throw
- **Expected**: No throw; `result.lens` matches expected lens identifier
- **Evidence**: Test passes with no Zod validation error

### Test 2: Security — hardcoded secret detection
- **Setup**: Create file with `const apiKey = 'supersecretvalue123'`
- **Action**: `run(makeState([filePath]))`
- **Expected**: `total_findings > 0`, finding with `severity === 'critical'`, `lens === 'security'`
- **Evidence**: Test assertions pass

### Test 3: Security — eval detection
- **Setup**: Create file with `eval(userInput)`
- **Action**: `run(makeState([filePath]))`
- **Expected**: Finding title includes `eval`, `severity === 'critical'`
- **Evidence**: Test assertions pass

### Test 4: Security — child_process.exec detection
- **Setup**: File contains `child_process.exec('cmd')`
- **Action**: `run(makeState([filePath]))`
- **Expected**: Finding title includes `child_process`
- **Evidence**: Test assertions pass

### Test 5: Duplication — cross-app duplicate hook detection
- **Setup**: Create `useLocalStorage.ts` in both `apps/web/main-app/src/hooks/` and `apps/web/app-dashboard/src/hooks/`
- **Action**: `run(makeState([file1, file2]))`
- **Expected**: `total_findings > 0`, finding title includes `useLocalStorage`, `severity === 'high'`
- **Evidence**: Test assertions pass

### Test 6: Test-coverage — untested file produces finding
- **Setup**: Create `formatDate.ts` in `packages/backend/src/utils/` without a `__tests__/formatDate.test.ts`
- **Action**: `run(makeState([srcFile]))`
- **Expected**: `total_findings === 1`, `severity === 'medium'`, `lens === 'test-coverage'`
- **Evidence**: Test assertions pass

### Test 7: Accessibility — a11y lens field verification (AC-14)
- **Setup**: Create TSX file with `<img src="photo.jpg" />` in `apps/web/` path
- **Action**: `run(makeState([filePath]))`
- **Expected**: All findings have `lens === 'a11y'` (not `'accessibility'`)
- **Evidence**: `result.findings.every(f => f.lens === 'a11y')` passes

---

## Error Cases

### Error 1: Non-existent file path — no throw (all 9 lenses)
- **Setup**: Provide path that does not exist on filesystem
- **Action**: `run(makeState([nonExistentPath]))`
- **Expected**: `total_findings === 0`, no exception thrown, `LensResultSchema.parse()` valid
- **Evidence**: Tests pass for all 9 lenses

### Error 2: Binary file content — no throw (documented behavior)
- **Setup**: Write a buffer of null bytes and non-UTF8 bytes to a `.ts` file using `writeFile(path, Buffer.from([0x89, 0x50, 0x4e, 0x47]))`
- **Action**: `run(makeState([binaryFile]))`
- **Expected**: No throw; `readFile('utf-8')` on binary content returns garbled text but does not throw; regex patterns are unlikely to match binary noise; `total_findings` should be 0 or contain no meaningful findings; schema valid
- **Evidence**: Note in test as documented behavior: "Binary content read as garbled UTF-8; patterns do not match noise; no exception raised"

### Error 3: Empty `targetFiles` array (all 9 lenses)
- **Setup**: `makeState([])`
- **Action**: `run(makeState([]))`
- **Expected**: `total_findings === 0`, `result.lens` is the expected lens value, `LensResultSchema.parse()` valid
- **Evidence**: Test assertions pass for all 9 lenses

---

## Edge Cases

### Edge 1: Empty file (0 bytes) — all 9 lenses
- **Setup**: `createFile(dir, 'empty.ts', '')`
- **Action**: `run(makeState([filePath]))`
- **Expected**: `total_findings === 0`, `findings === []`, schema valid
- **Evidence**: All 9 lenses produce empty results on 0-byte files

### Edge 2: `by_severity` consistency — critical + high + medium + low === total_findings
- **Setup**: Create a file that triggers multiple findings (e.g., security with apiKey + eval)
- **Action**: `run(makeState([filePath]))`
- **Expected**: `by_severity.critical + by_severity.high + by_severity.medium + by_severity.low === total_findings`
- **Evidence**: Required for: security, typescript, code-quality (at minimum); should be added to all lenses that produce findings

### Edge 3: Severity calibration — production path vs test file path (lens-typescript)
- **Setup A (production)**: Create file at `src/utils/api.ts` with `const x = getData() as any`
- **Action A**: `run(makeState([prodFile]))` → expect `severity === 'high'`
- **Setup B (test path)**: Create file at `__tests__/util.test.ts` with same content
- **Action B**: `run(makeState([testFile]))` → expect `severity === 'medium'` (downgraded)
- **Evidence**: severity calibration is explicit per AC-6

### Edge 4: Huge file behavior (documented acceptance)
- **Note**: No lens implements file-size gating. Reading a 50MB file with `readFile('utf-8')` is synchronous and will block for the duration. For the current scope of the audit (monorepo files, typically <300KB), this is acceptable. A 500-line+ file test already exists in `lens-code-quality` for the `>300 lines` pattern. No dedicated "huge file" performance test will be added per non-goals — instead, document the known behavior: "Files >1MB are read fully into memory. No size gate is implemented. Acceptable for current codebase where largest files are <300KB."
- **Evidence**: Comment in implementation notes or in the test file via a `describe.skip` or test comment

### Edge 5: `lens` field consistency — all findings use correct lens identifier
- **Setup**: Create a file that triggers multiple findings for a given lens
- **Action**: `run(makeState([filePath]))`
- **Expected**: `result.findings.every(f => f.lens === expectedLens)` is true
- **Evidence**: Required for all 9 lenses — currently explicit in react, typescript, a11y; needs adding for duplication, code-quality, performance, ui-ux, security, test-coverage

### Edge 6: AuditFindingSchema field presence — required fields present
- **Setup**: Create file that triggers at least one finding
- **Action**: Inspect `findings[0]`
- **Expected**: `id`, `lens`, `severity`, `confidence`, `title`, `file`, `evidence`, `remediation`, `status` — all present and non-empty
- **Evidence**: Explicit field assertion in at least security and one other lens test

---

## Required Tooling Evidence

### Backend
- `pnpm test --filter orchestrator` — all 9 lens test suites must pass (green)
- `pnpm check-types --filter orchestrator` — zero new TypeScript errors
- `pnpm build --filter orchestrator` — build must remain green

### Frontend
- Not applicable — no UI components touched

---

## Risks to Call Out

1. **Binary file test**: The "binary file edge case" from the ACs is vague. The current behavior (readFile reads binary as garbled UTF-8, patterns don't match) is acceptable but should be explicitly documented in the test file, not just silently absent. Recommended approach: add a single test that writes a small Buffer to a .ts file and verifies `LensResultSchema.parse()` passes — this confirms the schema is valid even if content is garbage.

2. **lens-test-coverage non-existent path behavior is different**: For `lens-test-coverage`, a non-existent source file path still triggers a finding (because the lens checks test file existence, not source file existence — if source doesn't exist, neither does the test, so a finding is generated). The test file already documents this with a comment. The test plan notes: "non-existent path for test-coverage → schema valid but may have 0 or >0 findings depending on path pattern." The existing test correctly only asserts schema validity, not finding count. Do NOT change this.

3. **React lens needs a third explicit negative fixture**: The current test has `.ts` extension exclusion and test file exclusion. A third explicit clean fixture (clean `.tsx` with no problematic patterns) would make it clear to readers that the lens produces 0 findings on well-written React code. This is a low-risk addition.

4. **`by_severity` sum assertions missing for 6 lenses**: Missing from duplication, react, typescript, a11y, code-quality, performance, ui-ux, test-coverage. This is the most impactful gap to fill.
