# Test Plan: WINT-0210 — Populate Role Pack Templates

## Scope Summary

- Endpoints touched: None
- UI touched: No
- Data/storage touched: No (markdown files in .claude/prompts/role-packs/)
- Files created: 4 markdown role pack files

---

## Happy Path Tests

### Test 1: Directory and File Existence (AC-1)

- **Setup**: WINT-0180, WINT-0190, WINT-0200 are complete and their outputs exist
- **Action**: Verify `.claude/prompts/role-packs/` directory exists and contains exactly 4 files
- **Expected outcome**: Directory exists; files `dev.md`, `po.md`, `da.md`, `qa.md` present
- **Evidence**: `ls .claude/prompts/role-packs/` output showing all 4 files

---

### Test 2: dev.md Content Verification (AC-2, AC-3)

- **Setup**: `dev.md` file present in `.claude/prompts/role-packs/`
- **Action**:
  1. Grep for reference to `schemas/patch-plan.schema.json`
  2. Grep for "Reuse Shared Packages" or "reuse" keyword
  3. Grep for "Repair Loop" or equivalent language
  4. Check for one positive example block and one negative example block
- **Expected outcome**:
  - `schemas/patch-plan.schema.json` referenced by path
  - Reuse Shared Packages pattern present
  - Repair Loop (fix only referenced errors, minimal changes, rerun until green) present
  - One positive example (correct patch ordering: types→API→UI→tests→cleanup)
  - One negative example (anti-pattern: mega-patch touching multiple layers)
- **Evidence**: Grep output for each pattern; cat of file showing structural sections

---

### Test 3: po.md Hard Caps Verification (AC-4, AC-5)

- **Setup**: `po.md` file present in `.claude/prompts/role-packs/`
- **Action**:
  1. Grep for "MUST NOT exceed 5" or equivalent hard cap language for findings
  2. Grep for "MUST NOT" and "2" for blocking cap language
  3. Grep for reference to `user-flows.schema.json`
  4. Verify one positive example and one negative example present
- **Expected outcome**:
  - Hard cap: MUST NOT exceed 5 findings per session
  - Hard cap: MUST NOT mark more than 2 findings as blocking
  - Reference to `schemas/user-flows.schema.json` (WINT-0200 output)
  - Positive example: focused 3-finding report with clear blocking/non-blocking split
  - Negative example: bloated finding list with everything marked blocking
- **Evidence**: Grep output; cat showing MUST NOT language in context

---

### Test 4: da.md Hard Caps Verification (AC-6, AC-7)

- **Setup**: `da.md` file present in `.claude/prompts/role-packs/`
- **Action**:
  1. Grep for "MUST NOT exceed 5" for challenges cap
  2. Grep for "MUST NOT challenge" blocking items language
  3. Verify one positive and one negative example present
- **Expected outcome**:
  - Hard cap: MUST NOT exceed 5 challenges
  - Hard cap: MUST NOT challenge any item already marked blocking by PO
  - Positive example: targeted 2-challenge scope reduction
  - Negative example: challenging a blocking item or raising trivial concerns
- **Evidence**: Grep output; cat showing MUST NOT language in context

---

### Test 5: qa.md Evidence Trace Verification (AC-8, AC-9, AC-10)

- **Setup**: `qa.md` file present in `.claude/prompts/role-packs/`
- **Action**:
  1. Grep for AC→Evidence trace language
  2. Check for `ac-trace.json` reference or specification
  3. Check for required fields: `ac_id`, `evidence_type`, `evidence_ref`, `verdict`
  4. Check for evidence_type values: test, log, screenshot
  5. Check for verdict values: pass, fail, blocked
  6. Verify one positive example (ac-trace.json with 3 ACs) and one negative example
- **Expected outcome**:
  - AC→Evidence trace requirement stated
  - ac-trace.json output format defined with all required fields
  - Positive example shows complete trace
  - Negative example shows verdict without evidence reference
- **Evidence**: Grep for each field name; cat showing ac-trace.json structure

---

### Test 6: Token Budget Verification (AC-11)

- **Setup**: All 4 role pack files present
- **Action**: Run word count on each file; apply conversion (words ÷ 0.75 ≈ tokens)
  - `wc -w .claude/prompts/role-packs/dev.md`
  - `wc -w .claude/prompts/role-packs/po.md`
  - `wc -w .claude/prompts/role-packs/da.md`
  - `wc -w .claude/prompts/role-packs/qa.md`
- **Expected outcome**: Each file word count between 110 and 225 words (≈ 150-300 tokens)
- **Evidence**: wc -w output for each file; calculation showing token estimate within bounds

---

### Test 7: Skeleton Format Verification (AC-12)

- **Setup**: All 4 role pack files present
- **Action**: For each file, check structural presence of:
  1. Decision rule section
  2. Proof requirement section
  3. Positive example section (marked as positive/correct/good)
  4. Negative example section (marked as negative/wrong/anti-pattern)
- **Expected outcome**: All 4 files contain all 4 structural sections within 10-25 lines
- **Evidence**: Line count per file (`wc -l`); grep for section markers; structural review

---

## Error Cases

### Error Case 1: Schema Path Reference Accuracy

- **Setup**: WINT-0190 and WINT-0200 are complete with final schema filenames
- **Action**: Verify schema path references in dev.md and po.md exactly match actual file locations
- **Expected**: `schemas/patch-plan.schema.json` and `schemas/user-flows.schema.json` exist at referenced paths
- **Evidence**: `ls schemas/` output confirming file existence; grep of role packs showing exact paths used

---

### Error Case 2: Over-Budget File Detection

- **Setup**: Any role pack file word count exceeds 225 words
- **Action**: Identify the violating file; flag for revision
- **Expected**: No file exceeds 225 words (≈ 300 tokens)
- **Evidence**: wc -w output; token estimate calculation

---

### Error Case 3: Missing MUST NOT Hard Cap Language

- **Setup**: po.md or da.md uses soft guidance instead of hard caps
- **Action**: Grep for "MUST NOT" in both files; flag if absent
- **Expected**: Both files contain explicit MUST NOT constraints for their caps
- **Evidence**: Grep output for "MUST NOT" per file

---

### Error Case 4: Missing Negative Example

- **Setup**: Any role pack file lacks a negative example
- **Action**: Check each file for anti-pattern/negative example section
- **Expected**: Each of the 4 files has at least one negative example
- **Evidence**: Grep for "negative", "wrong", "anti-pattern", "do not", "avoid" per file

---

## Edge Cases

### Edge Case 1: File Encoding and Line Endings

- **Setup**: Role pack files created on macOS
- **Action**: Verify files use UTF-8 encoding and LF line endings
- **Expected**: No CRLF line endings that would inflate token counts or break injection
- **Evidence**: `file` command output; `cat -A` showing no `^M` characters

---

### Edge Case 2: Under-Budget File Detection

- **Setup**: Any role pack file is shorter than 110 words (< 150 tokens)
- **Action**: Identify file too brief to be actionable
- **Expected**: No file is fewer than 110 words
- **Evidence**: wc -w output per file

---

### Edge Case 3: Line Count Boundary

- **Setup**: Any role pack exceeds 25 lines
- **Action**: Count lines per file; flag files outside 10-25 range
- **Expected**: All files are 10-25 lines (WINT-0180 skeleton format)
- **Evidence**: `wc -l` per file

---

### Edge Case 4: ac-trace.json Fields Completeness

- **Setup**: qa.md specifies ac-trace.json format
- **Action**: Verify all 4 required fields present: `ac_id`, `evidence_type`, `evidence_ref`, `verdict`
- **Expected**: All 4 fields defined with their allowed values
- **Evidence**: Grep for each field name in qa.md

---

## Required Tooling Evidence

### Backend

No endpoints involved. No `.http` requests required.

### File System Verification Commands

```bash
# AC-1: Directory and file existence
ls -la .claude/prompts/role-packs/

# AC-11: Token count estimation (word count × 1.33 ≈ tokens)
wc -w .claude/prompts/role-packs/dev.md
wc -w .claude/prompts/role-packs/po.md
wc -w .claude/prompts/role-packs/da.md
wc -w .claude/prompts/role-packs/qa.md

# AC-12: Line count verification (10-25 lines each)
wc -l .claude/prompts/role-packs/dev.md
wc -l .claude/prompts/role-packs/po.md
wc -l .claude/prompts/role-packs/da.md
wc -l .claude/prompts/role-packs/qa.md

# AC-4, AC-6: Hard cap language check
grep -i "MUST NOT" .claude/prompts/role-packs/po.md
grep -i "MUST NOT" .claude/prompts/role-packs/da.md

# AC-9: ac-trace.json fields check
grep -E "ac_id|evidence_type|evidence_ref|verdict" .claude/prompts/role-packs/qa.md

# AC-2: Schema path references
grep "patch-plan.schema.json" .claude/prompts/role-packs/dev.md
grep "user-flows.schema.json" .claude/prompts/role-packs/po.md
```

### Frontend

Not applicable — no UI surface.

---

## Risks to Call Out

1. **Schema filename uncertainty**: dev.md and po.md must reference actual schema paths from WINT-0190 and WINT-0200. If those stories use placeholder filenames during implementation, the references will need a single-pass update when schemas are finalized. Mitigation: verify schema files exist at referenced paths as part of AC-1 verification.

2. **Token counting approximation**: Word count is an approximation (1 token ≈ 0.75 words). Files near the boundary (100-120 words or 210-225 words) may need precise tokenizer verification. Claude's own tokenizer or tiktoken can provide exact counts if estimation is borderline.

3. **Structural section markers**: AC-12 verification requires consistent section markers in all 4 files (e.g., "Decision Rule:", "Proof:", "Positive:", "Negative:"). If WINT-0180 does not mandate specific header text, verification must adapt to whatever format the framework establishes.
