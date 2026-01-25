# PROOF-STORY-XXX: [Story Title]

## Story
- **STORY-XXX** - [Brief story description]

---

## Summary

[2-4 sentence summary of what was implemented. Include:]
- [Main feature/endpoint/component implemented]
- [Key technical approach used]
- [Test coverage added]

---

## Acceptance Criteria Evidence

### [Feature Group 1] (AC-1 through AC-N)

| AC | Criterion | Evidence |
|----|-----------|----------|
| **AC-1** | [Acceptance criterion text] | [Specific file, line, or behavior that proves this is met] |
| **AC-2** | [Acceptance criterion text] | [Specific file, line, or behavior that proves this is met] |
| ... | ... | ... |

**Test File:** `[path/to/test-file.test.ts]` (N tests)

### [Feature Group 2] (AC-M through AC-P)

| AC | Criterion | Evidence |
|----|-----------|----------|
| **AC-M** | [Acceptance criterion text] | [Specific file, line, or behavior that proves this is met] |
| ... | ... | ... |

**Test File:** `[path/to/test-file.test.ts]` (N tests)

---

## Reuse & Architecture Compliance

### Reuse-First Summary

**Packages Reused:**
| Package | Usage |
|---------|-------|
| `@repo/[package-name]` | [How it was used] |
| ... | ... |

**Code Patterns Reused:**
| Source | Usage |
|--------|-------|
| [Existing file/pattern] | [How it was adapted/reused] |
| ... | ... |

**What Was Created (and Why):**
| Created | Reason |
|---------|--------|
| [New file/component] | [Why it couldn't be reused from existing code] |
| ... | ... |

### Ports & Adapters Compliance

**What Stayed in Core:**
- [Business logic that is platform-agnostic]
- [Validation rules]
- [No infrastructure imports]

**What Stayed in Adapters (Handlers):**
- [HTTP request/response handling]
- [Authentication]
- [Dependency injection wiring]
- [Infrastructure client operations]

---

## Verification

### Build Verification
```bash
pnpm build --filter @repo/[package-name]
```
**Result:** PASS/FAIL

### Type Check
```bash
pnpm tsc --noEmit -p [path/to/tsconfig.json]
```
**Result:** PASS/FAIL

### Lint Verification
```bash
pnpm eslint [path/to/files]
```
**Result:** PASS/FAIL

### Unit Tests
```bash
pnpm test --filter @repo/[package-name]
```
**Result:** PASS/FAIL
- Test Files: N passed
- Tests: N passed
- Duration: Nms

### HTTP Contracts
- HTTP test file: `__http__/[domain].http`
- [N] endpoint contracts documented

### Playwright
**[PASS/NOT APPLICABLE]** - [Reason if not applicable, e.g., "Backend-only story, no UI changes"]

---

## Files Changed

### [Category 1] (New Files)
| Path | Description |
|------|-------------|
| `[full/path/to/file.ts]` | [What this file does] |
| ... | ... |

### [Category 2] (Modified Files)
| Path | Description |
|------|-------------|
| `[full/path/to/file.ts]` | [What was changed] |
| ... | ... |

---

## Deviations / Notes

### Deviation 1: [Title]
- **Story Spec:** [What the story specified]
- **Implementation:** [What was actually done]
- **Justification:** [Why this deviation was acceptable]

[Repeat for each deviation, or write "None" if no deviations]

---

## Blockers

**[None / List any blockers encountered]**

---

## Token Log

### Input Tokens (Reads)
| Operation | Bytes | Tokens (est) |
|-----------|-------|--------------|
| [File read] | N | ~N |
| ... | ... | ... |
| **Total Input** | ~N | **~N** |

### Output Tokens (Writes)
| Operation | Bytes | Tokens (est) |
|-----------|-------|--------------|
| [File written] | ~N | ~N |
| ... | ... | ... |
| **Total Output** | ~N | **~N** |

---

## Agent Log

| Timestamp | Agent | Action |
|-----------|-------|--------|
| YYYY-MM-DD | [agent-name] | [Action taken] |
| ... | ... | ... |
