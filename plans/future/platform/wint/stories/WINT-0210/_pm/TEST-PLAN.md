---
generated: "2026-02-16"
story_id: WINT-0210
phase: pm-generate
agent: pm-draft-test-plan
---

# Test Plan: WINT-0210 - Populate Role Pack Templates

## Test Strategy

This story creates documentation artifacts (Markdown files with YAML frontmatter). The primary validation focus is on:
1. **Token count measurement** (not estimation) using tiktoken library
2. **Example clarity** - examples must be actionable and demonstrate patterns
3. **Hard cap enforcement** - explicit and measurable limits documented
4. **Pattern skeleton size** - 10-25 lines per role pack

**No unit tests required** - This is documentation work, not executable code.

## Validation Tests (Manual)

### Token Count Validation (AC-1 through AC-4, AC-6)

**Test ID:** TC-001
**Objective:** Verify all role packs are within 150-300 token budget
**Method:**
```python
import tiktoken

encoder = tiktoken.get_encoding("cl100k_base")
role_packs = ['dev.md', 'po.md', 'da.md', 'qa.md']

for pack in role_packs:
    with open(f'.claude/prompts/role-packs/{pack}') as f:
        content = f.read()
        tokens = encoder.encode(content)
        count = len(tokens)
        print(f"{pack}: {count} tokens")
        assert 150 <= count <= 300, f"{pack} out of range: {count} tokens"

# Verify combined token count
total = sum([len(encoder.encode(open(f'.claude/prompts/role-packs/{p}').read()))
             for p in role_packs])
print(f"Total: {total} tokens")
assert total <= 1200, f"Combined token count exceeds 1200: {total} tokens"
```

**Expected Results:**
- Dev role pack: 150-300 tokens
- PO role pack: 150-300 tokens
- DA role pack: 150-300 tokens
- QA role pack: 150-300 tokens
- Combined: ≤ 1200 tokens

**Pass Criteria:**
- All individual role packs within range
- Combined count within budget
- Token count matches frontmatter `token_count` field

---

### Example Clarity Validation (AC-1 through AC-4)

**Test ID:** TC-002
**Objective:** Verify examples are actionable and patterns are clear
**Method:** Manual review by PM/Dev
**Checklist per role pack:**
- [ ] Pattern skeleton is 10-25 lines (count lines manually)
- [ ] Positive Example 1 demonstrates a good pattern clearly
- [ ] Positive Example 2 demonstrates a different good pattern or variation
- [ ] Negative Example shows an anti-pattern to avoid
- [ ] Decision rules are unambiguous (no "maybe" or "sometimes")
- [ ] Examples use actual codebase patterns (not generic placeholders)

**Expected Results:**
- All examples are concrete (not abstract)
- Patterns reference WINT-0190 (Dev), WINT-0200 (PO), or actual workflow constraints
- Negative examples clearly show what NOT to do

**Pass Criteria:**
- All checklist items pass for all 4 role packs

---

### Hard Cap Documentation (AC-2, AC-3)

**Test ID:** TC-003
**Objective:** Verify hard caps are explicit and measurable
**Method:** Manual review of role pack content
**Expected Results:**
- **Dev role pack:** No hard cap on number of patches (pattern-based approach)
- **PO role pack:** "Max 5 findings total, max 2 blocking" (explicit numbers)
- **DA role pack:** "Max 5 challenges, cannot challenge blocking items" (explicit numbers + rule)
- **QA role pack:** No hard cap on evidence count (all ACs must have evidence)

**Pass Criteria:**
- PO and DA hard caps are stated as explicit numbers
- Rules are measurable (can count findings/challenges programmatically)
- No ambiguous phrasing like "around 5" or "typically 2"

---

### Pattern Skeleton Size (AC-1 through AC-4)

**Test ID:** TC-004
**Objective:** Verify pattern skeletons are 10-25 lines
**Method:** Count lines in each pattern skeleton section
**Expected Results:**
- Dev role pack pattern skeleton: 10-25 lines (patch-plan.json structure)
- PO role pack pattern skeleton: 10-25 lines (cohesion-findings.json structure)
- DA role pack pattern skeleton: 10-25 lines (scope-challenges.json structure)
- QA role pack pattern skeleton: 10-25 lines (ac-trace.json structure)

**Pass Criteria:**
- All pattern skeletons are between 10-25 lines
- Pattern skeletons are code/structure examples (not prose)

---

### Integration Documentation (AC-5)

**Test ID:** TC-005
**Objective:** Verify README.md documents integration patterns
**Method:** Manual review of README.md
**Checklist:**
- [ ] Links to WINT-0180 (storage strategy)
- [ ] Links to WINT-0190 (Dev patterns)
- [ ] Links to WINT-0200 (PO constraints)
- [ ] Consumption patterns documented:
  - [ ] Role Pack Sidecar (WINT-2010) retrieval
  - [ ] Direct file injection (read from filesystem)
  - [ ] Context-pack sidecar integration
- [ ] Versioning strategy documented (how to update role packs)
- [ ] Directory structure explained

**Pass Criteria:**
- All checklist items present
- Links are correct (stories exist in index)
- Examples of consumption patterns provided

---

### Example Output Validation (AC-7)

**Test ID:** TC-006
**Objective:** Validate example outputs against schemas (if available)
**Method:**
1. Check if WINT-0190 complete → validate patch-plan.json against schema
2. Check if WINT-0200 complete → validate cohesion-findings.json constraints (max 5 findings, max 2 blocking)
3. If schemas unavailable → manual review for structural correctness

**Expected Results:**
- Example patch-plan.json demonstrates ordering: types→API→UI→tests→cleanup
- Example cohesion-findings.json has ≤ 5 findings, ≤ 2 blocking
- Example scope-challenges.json has ≤ 5 challenges
- Example ac-trace.json maps AC IDs to evidence paths (screenshot, test output, code snippet)

**Pass Criteria:**
- All example outputs are valid JSON
- Examples demonstrate the hard caps where applicable
- If schemas exist, examples validate against them
- If schemas don't exist, examples are structurally sound

---

## YAML Frontmatter Validation

**Test ID:** TC-007
**Objective:** Verify YAML frontmatter is complete and accurate
**Method:** Parse YAML frontmatter from each role pack
**Expected Fields:**
```yaml
---
role: dev|po|da|qa
version: "1.0.0"
created: "2026-02-16"
token_count: <measured-value>
---
```

**Pass Criteria:**
- All 4 fields present
- `role` matches filename (dev.md → role: dev)
- `token_count` matches measured count from TC-001
- `version` is "1.0.0" (initial version)
- `created` is story completion date

---

## Regression Tests

### No Existing Tests to Verify
This story creates new files in a new directory. No existing tests are affected.

---

## QA Gate Checklist

Before marking story as ready-for-qa:
- [ ] All 7 test cases pass (TC-001 through TC-007)
- [ ] Token counts measured (not estimated)
- [ ] Examples are clear and actionable
- [ ] Patterns are 10-25 lines
- [ ] Hard caps are explicit and measurable
- [ ] YAML frontmatter is complete
- [ ] README documents integration patterns
- [ ] No role pack exceeds 300 tokens
- [ ] Combined token count ≤ 1200 tokens

---

## Known Limitations

1. **WINT-0190 Dependency:** If WINT-0190 (Patch Queue schema) is incomplete, Dev role pack will use inline example. Must update when schema available.

2. **Schema Validation:** If schemas for cohesion-findings.json, scope-challenges.json, ac-trace.json don't exist, validation in TC-006 is manual (structural review only).

3. **Codebase Specificity:** Examples should use actual codebase patterns. Generic examples will fail clarity validation (TC-002).

---

## Success Criteria Summary

- ✅ All role packs: 150-300 tokens (measured)
- ✅ All examples: Clear, actionable, codebase-specific
- ✅ All pattern skeletons: 10-25 lines
- ✅ Hard caps: Explicit numbers (PO, DA)
- ✅ Integration documented in README
- ✅ Example outputs demonstrate constraints
