# Test Plan: WINT-0180 — Define Examples + Negative Examples Framework

## Scope Summary

- **Endpoints touched**: None — documentation-only story
- **UI touched**: No
- **Data/storage touched**: No
- **Primary deliverable**: `.claude/prompts/role-packs/FRAMEWORK.md`
- **Secondary deliverable**: Validation that existing `_specs/` patterns conform to the framework

---

## Happy Path Tests

### Test 1: FRAMEWORK.md exists at correct path

- **Setup**: Story implementation complete
- **Action**: Check filesystem for `.claude/prompts/role-packs/FRAMEWORK.md`
- **Expected outcome**: File exists and is not empty
- **Evidence**: `ls -la .claude/prompts/role-packs/FRAMEWORK.md`

### Test 2: FRAMEWORK.md contains all required sections

- **Setup**: FRAMEWORK.md written
- **Action**: Read FRAMEWORK.md and verify presence of each required section
- **Expected outcome**: All 7 required sections present:
  1. Pattern Skeleton Template (10-25 lines)
  2. Decision Rule Format
  3. Positive Example section (max 2 per role)
  4. Negative Example section (max 1 per role)
  5. Proof Requirements
  6. Token Budget Constraints (150-300 tokens per role)
  7. Delivery Mechanisms
- **Evidence**: Each section heading present and non-empty in FRAMEWORK.md

### Test 3: Directory structure documented

- **Setup**: FRAMEWORK.md written
- **Action**: Verify FRAMEWORK.md documents `prompts/role-packs/{role}.md` and `prompts/role-packs/_specs/{pattern}.md` paths
- **Expected outcome**: Both path conventions explicitly documented with purpose descriptions
- **Evidence**: GREP for `role-packs/` path patterns in FRAMEWORK.md

### Test 4: Token budget constraints are explicit

- **Setup**: FRAMEWORK.md written
- **Action**: Read Token Budget section of FRAMEWORK.md
- **Expected outcome**: Explicit numeric constraints present — 150 token minimum, 300 token maximum for role instructions; 10-25 line constraint for pattern skeletons
- **Evidence**: Numbers 150, 300, 10, 25 appear in FRAMEWORK.md

### Test 5: Decision rule format is defined with boolean/threshold criteria

- **Setup**: FRAMEWORK.md written
- **Action**: Read Decision Rule section; verify at least one concrete decision rule template is given
- **Expected outcome**: Template shows `when:` field with boolean or threshold condition (not prose description)
- **Evidence**: Example decision rule template with structured criteria visible in FRAMEWORK.md

### Test 6: Proof requirements section is actionable

- **Setup**: FRAMEWORK.md written
- **Action**: Read Proof Requirements section
- **Expected outcome**: Proof format specifies what artifact (file, JSON, output) must exist after applying the pattern, with a verification command template
- **Evidence**: Proof template with `verification_command` field visible

### Test 7: Delivery mechanisms documented

- **Setup**: FRAMEWORK.md written
- **Action**: Read Delivery Mechanisms section
- **Expected outcome**: Three mechanisms documented: (1) file-based `prompts/role-packs/*`, (2) KB MCP via `kb_search` by tags, (3) context-pack sidecar injection point
- **Evidence**: Three delivery mechanisms present with usage guidance

### Test 8: Existing `_specs/` patterns conform to framework (non-breaking)

- **Setup**: FRAMEWORK.md written and existing spec files unchanged
- **Action**: Read `patch-queue-pattern.md` and `repair-loop-pattern.md`; compare each section against FRAMEWORK.md structure
- **Expected outcome**: Both existing specs conform to the framework without requiring modification. If they diverge, FRAMEWORK.md must document the divergence as "legacy pre-standard" rather than requiring changes
- **Evidence**: Checklist mapping each spec section to FRAMEWORK.md requirements — all map without modification needed

---

## Error Cases

### Error Case 1: Pattern skeleton exceeds 25 lines

- **Setup**: Dev writes a pattern skeleton with 30 lines
- **Action**: Apply framework decision rule for skeleton length
- **Expected outcome**: FRAMEWORK.md explicitly states 25-line maximum and what to do if exceeded (split into two patterns)
- **Evidence**: Constraint rule + remediation guidance present in FRAMEWORK.md

### Error Case 2: More than 2 positive examples for a role

- **Setup**: Dev writes 3 positive examples for Dev role pack
- **Action**: Apply framework example count rule
- **Expected outcome**: FRAMEWORK.md explicitly states maximum 2 positive examples and rationale (token budget)
- **Evidence**: Hard cap documented with rationale in FRAMEWORK.md

### Error Case 3: Negative example count exceeds 1

- **Setup**: Dev writes 2 negative examples for a role
- **Action**: Apply framework negative example rule
- **Expected outcome**: FRAMEWORK.md states maximum 1 negative example; recommends focusing on most common failure mode
- **Evidence**: Hard cap documented for negative examples

### Error Case 4: Decision rule uses prose instead of boolean/threshold

- **Setup**: Dev writes a prose decision rule ("Use when the code is complex")
- **Action**: Apply framework decision rule format requirements
- **Expected outcome**: FRAMEWORK.md provides counter-example showing why prose is unacceptable and shows required structured format
- **Evidence**: Negative example or "DON'T" pattern in Decision Rule section

---

## Edge Cases

### Edge Case 1: Role pack that only needs 1 positive example

- **Setup**: A role has only one clear use case
- **Action**: Apply framework to a 1-positive-example role pack
- **Expected outcome**: FRAMEWORK.md allows fewer than max (max 2, not exactly 2); minimum is 1 positive example
- **Evidence**: Language in FRAMEWORK.md says "up to 2" or "max 2" not "exactly 2"

### Edge Case 2: Pattern skeleton at boundary (exactly 10 or exactly 25 lines)

- **Setup**: Pattern skeleton with exactly 10 or exactly 25 lines
- **Action**: Apply framework constraint check
- **Expected outcome**: Both boundary values (10 and 25) are inclusive per framework
- **Evidence**: FRAMEWORK.md states "10-25 lines inclusive" or equivalent

### Edge Case 3: Delivery mechanism ordering

- **Setup**: Agent needs to load role pack examples
- **Action**: Determine which delivery mechanism takes precedence
- **Expected outcome**: FRAMEWORK.md documents precedence order (file-based → KB MCP → sidecar injection)
- **Evidence**: Precedence or usage guidance visible in Delivery Mechanisms section

### Edge Case 4: `_specs/` directory path vs `role-packs/` path conflict

- **Setup**: Dev sees `_specs/` directory (created by WINT-0190) alongside future `{role}.md` files
- **Action**: Check FRAMEWORK.md for directory structure guidance
- **Expected outcome**: FRAMEWORK.md clearly distinguishes `_specs/` (pattern spec files) from root-level `{role}.md` (role instruction files)
- **Evidence**: Both paths documented with purpose separation

---

## Required Tooling Evidence

### For documentation verification (no runtime tests):

All tests are file-structure and content checks. Run these as acceptance verification:

```bash
# AC-1: FRAMEWORK.md exists
test -f .claude/prompts/role-packs/FRAMEWORK.md && echo "PASS: FRAMEWORK.md exists"

# AC-8: Existing specs unchanged
git diff HEAD -- .claude/prompts/role-packs/_specs/ | wc -l
# Expected: 0 (no modifications)

# AC-2: Pattern skeleton section present
grep -i "pattern skeleton" .claude/prompts/role-packs/FRAMEWORK.md && echo "PASS: skeleton section found"

# AC-4: Token budget numbers present
grep -E "150|300" .claude/prompts/role-packs/FRAMEWORK.md && echo "PASS: token budget numbers found"

# AC-7: Three delivery mechanisms documented
grep -i "kb_search\|sidecar\|prompts/role-packs" .claude/prompts/role-packs/FRAMEWORK.md | wc -l
# Expected: >= 3 matches
```

---

## Risks to Call Out

1. **Framework too abstract**: If FRAMEWORK.md describes rules in prose without concrete templates, developers will interpret them differently. The framework MUST include at least one complete worked example (role instruction example + pattern skeleton example).

2. **Conformance verification is manual**: There is no automated validation that a pattern spec conforms to FRAMEWORK.md. AC-8 is a one-time check at story completion. Consider a future story for a linting/validation script.

3. **Token counting ambiguity**: "150-300 tokens" requires a tool to count tokens. FRAMEWORK.md should specify the tokenizer (e.g., cl100k_base for Claude) or use a line-count proxy that approximates token counts.
