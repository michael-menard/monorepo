# QA-VERIFY-STORY-XXX: [Story Title]

**Date:** YYYY-MM-DD
**Verifier:** qa-verify agent
**Story:** STORY-XXX - [Brief story description]

---

## Final Verdict: **[PASS/FAIL/CONDITIONAL PASS]**

STORY-XXX may be marked **[DONE/requires fixes]**.

[If CONDITIONAL PASS or FAIL, list blocking issues here]

---

## Acceptance Criteria Verification

### [Feature Group 1] (AC-1 through AC-N)

| AC | Criterion | Status | Evidence |
|----|-----------|--------|----------|
| AC-1 | [Criterion text] | **[PASS/FAIL]** | [Evidence from PROOF or direct verification] |
| AC-2 | [Criterion text] | **[PASS/FAIL]** | [Evidence from PROOF or direct verification] |
| ... | ... | ... | ... |

**Unit Tests:** `[test-file.test.ts]` - N tests [passing/failing]

### [Feature Group 2] (AC-M through AC-P)

| AC | Criterion | Status | Evidence |
|----|-----------|--------|----------|
| AC-M | [Criterion text] | **[PASS/FAIL]** | [Evidence from PROOF or direct verification] |
| ... | ... | ... | ... |

[Repeat for all feature groups]

---

## Test Execution Verification

### Unit Tests

**Command:** `pnpm test --filter @repo/[package-name]`

**Result:** **[PASS/FAIL]**

```
[Paste actual test output here]
```

**New Tests Added:**
- `[test-file-1.test.ts]` - N tests
- `[test-file-2.test.ts]` - N tests
- **Total new tests:** N

### Build & Lint

| Check | Status |
|-------|--------|
| Build (`pnpm build --filter @repo/[package]`) | **[PASS/FAIL]** |
| Type Check (`pnpm tsc --noEmit`) | **[PASS/FAIL]** |
| Lint (Core) | **[PASS/FAIL]** |
| Lint (Handlers) | **[PASS/FAIL]** |

### HTTP Tests

**File:** `__http__/[domain].http`

[Describe HTTP test coverage or note "NOT APPLICABLE" with reason]

### Playwright

**[PASS/NOT APPLICABLE]** - [Reason if not applicable]

---

## Architecture & Reuse Compliance

### Reuse-First Confirmation

| Package | Usage | Status |
|---------|-------|--------|
| `@repo/[package]` | [How it was used] | **[Reused/Extended/NOT USED]** |
| ... | ... | ... |

### Ports & Adapters Compliance

| Boundary | Status | Evidence |
|----------|--------|----------|
| Core has no infrastructure imports | **[PASS/FAIL]** | [Evidence] |
| Handlers wire dependencies | **[PASS/FAIL]** | [Evidence] |
| Business logic in core | **[PASS/FAIL]** | [Evidence] |
| HTTP mapping in handlers | **[PASS/FAIL]** | [Evidence] |

---

## Files Verification

### [Category] Files (New)

| File | Exists | Tests |
|------|--------|-------|
| `[filename.ts]` | **[YES/NO]** | N |
| ... | ... | ... |

### [Category] Files (Modified)

| File | Verified |
|------|----------|
| `[filename.ts]` | **[YES/NO]** |
| ... | ... |

---

## Deviations Accepted

### 1. [Deviation Title] (Documented)

[Explain why this deviation is acceptable per story scope or Non-Goals]

[Or write "None" if no deviations]

---

## Reality Checks

### Check 1: [Sanity check description]
**Result:** [PASS/FAIL with explanation]

### Check 2: [Another sanity check]
**Result:** [PASS/FAIL with explanation]

[Add reality checks that go beyond just AC verification - things like:
- Does the implementation actually work end-to-end?
- Are there any obvious issues the AC don't catch?
- Does the code look reasonable and maintainable?]

---

## Proof Quality Assessment

| Criterion | Status |
|-----------|--------|
| PROOF-STORY-XXX.md exists and is complete | **[PASS/FAIL]** |
| AC-to-evidence mapping provided | **[PASS/FAIL]** |
| Test output captured (build, lint, tests) | **[PASS/FAIL]** |
| Files changed documented | **[PASS/FAIL]** |
| Deviations explained and justified | **[PASS/FAIL]** |
| Token log included | **[PASS/FAIL]** |

---

## Summary

| Gate | Status |
|------|--------|
| All N Acceptance Criteria met | **[PASS/FAIL]** |
| Required tests executed and passing | **[PASS/FAIL]** |
| Proof complete and verifiable | **[PASS/FAIL]** |
| Architecture compliance | **[PASS/FAIL]** |
| Reuse-first compliance | **[PASS/FAIL]** |

---

## Verdict

**STORY-XXX [PASSES/FAILS] QA Verification.**

[If PASS:] The story may be marked **DONE**.

[If FAIL:] The following issues must be resolved:
1. [Issue 1]
2. [Issue 2]
...

---

## Token Log

| Operation | Type | Bytes | Tokens (est) |
|-----------|------|-------|--------------|
| Read: STORY-XXX.md | input | N | ~N |
| Read: PROOF-STORY-XXX.md | input | N | ~N |
| Read: [other files] | input | N | ~N |
| Write: QA-VERIFY-STORY-XXX.md | output | ~N | ~N |
| **Total Input** | - | ~N | **~N** |
| **Total Output** | - | ~N | **~N** |
