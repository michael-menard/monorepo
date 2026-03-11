# Elaboration: STORY-XXX [Story Title]

**Date:** YYYY-MM-DD
**Auditor:** QA Agent
**Story:** STORY-XXX.md
**Re-Elaboration:** [Yes/No] ([Previous verdict if re-elab])

---

## Verdict: [PASS / CONDITIONAL PASS / FAIL]

**[STORY-XXX may/may not proceed to implementation.]**

[Brief explanation of verdict - 1-2 sentences]

---

## Audit Checklist Results

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 1 | Scope Alignment | [PASS/FAIL/N/A] | [Is story in migration index? Does it fit project scope?] |
| 2 | Internal Consistency | [PASS/FAIL] | [Are Goals, Non-goals, and ACs aligned?] |
| 3 | Reuse-First Enforcement | [PASS/FAIL] | [Does story prohibit new utilities? Is Reuse Plan present?] |
| 4 | Ports & Adapters Compliance | [PASS/FAIL/N/A] | [Does story respect architecture boundaries?] |
| 5 | Local Testability | [PASS/FAIL] | [Are pnpm commands documented with evidence formats?] |
| 6 | Decision Completeness | [PASS/FAIL] | [Are there unresolved TBDs?] |
| 7 | Risk Disclosure | [PASS/FAIL] | [Is risk documented in DEV-FEASIBILITY.md?] |
| 8 | Story Sizing | [PASS/FAIL] | [Is AC count appropriate? (<25 recommended)] |

---

## Issues Found

[List blocking issues that must be fixed before implementation]

### Issue 1: [Title]
- **Location:** [File or section where issue exists]
- **Problem:** [Description of the issue]
- **Recommendation:** [How to fix it]

### Issue 2: [Title]
...

[Or write "**None.** Story is ready for implementation." if no issues]

---

## Acceptable As-Is

[List items that were reviewed and found acceptable]

- [Item 1] ✓
- [Item 2] ✓
- ...

---

## Discovery Findings (Not Reviewed)

_[Note if user opted to skip interactive discussion]_

### Gaps & Blind Spots Identified

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | [Gap description] | [Low/Medium/High] | [Low/Medium/High] | [Suggestion] |
| ... | ... | ... | ... | ... |

### Enhancement Opportunities Identified

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | [Enhancement description] | [Low/Medium/High] | [Low/Medium/High] | [Suggestion] |
| ... | ... | ... | ... | ... |

### Follow-up Stories Suggested

- [ ] [STORY-XXX]: [Description of follow-up work]
- [ ] [STORY-YYY]: [Description of follow-up work]

### Items Marked Out-of-Scope

[List any items explicitly marked out of scope during review]

---

## Status Update

| Field | Previous | Current |
|-------|----------|---------|
| status | [previous status] | [new status] |

[Explain status change or note if unchanged]

---

## Token Log

| Operation | Type | Bytes | Tokens (est) |
|-----------|------|-------|--------------|
| Read: STORY-XXX.md | input | N | ~N |
| Read: stories.index.md | input | N | ~N |
| Read: [related files] | input | N | ~N |
| Write: ELAB-STORY-XXX.md | output | ~N | ~N |
| **Total Input** | - | ~N | **~N** |
| **Total Output** | - | ~N | **~N** |
