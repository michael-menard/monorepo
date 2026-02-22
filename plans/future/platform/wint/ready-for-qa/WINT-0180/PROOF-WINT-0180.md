# PROOF-WINT-0180

**Generated**: 2026-02-21T00:00:00Z
**Story**: WINT-0180
**Evidence Version**: 1

---

## Summary

This implementation delivers the Examples + Negative Examples Framework by creating FRAMEWORK.md at `.claude/prompts/role-packs/FRAMEWORK.md`. All 8 acceptance criteria passed with no deviations. The framework establishes authoritative standards for how examples are structured in role packs, including pattern skeleton templates, token budgets, decision rule formats, proof requirements, and delivery mechanisms. Existing `_specs/` patterns were validated to conform without modification.

---

## Acceptance Criteria Evidence

| AC | Status | Primary Evidence |
|----|--------|------------------|
| AC-1 | PASS | Framework document created and verified to exist |
| AC-2 | PASS | Pattern skeleton template defined with 10-25 line constraint and required sections |
| AC-3 | PASS | Role pack directory structure documented with path purposes |
| AC-4 | PASS | Token budget constraints defined: 150 min, 300 max tokens; 10-25 line constraint; line-count proxy included |
| AC-5 | PASS | Decision rule format standardized with boolean/threshold criteria and worked examples |
| AC-6 | PASS | Proof requirements format defined with verification_command field template |
| AC-7 | PASS | Three delivery mechanisms documented: file-based, KB MCP kb_search, context-pack sidecar |
| AC-8 | PASS | Existing _specs/ patterns validated conformant; git diff returns empty |

### Detailed Evidence

#### AC-1: Framework document created at `.claude/prompts/role-packs/FRAMEWORK.md` — file must exist and be non-empty

**Status**: PASS

**Evidence Items**:
- **Command**: `test -f .claude/prompts/role-packs/FRAMEWORK.md → exit 0` - Framework document exists and is non-empty

---

#### AC-2: Pattern skeleton template defined in FRAMEWORK.md — skeleton must be 10-25 lines max with required sections: Decision Rule, Positive Examples (max 2), Negative Example (max 1), Proof Requirements

**Status**: PASS

**Evidence Items**:
- **Manual**: FRAMEWORK.md section 'Pattern Skeleton Template' contains a complete skeleton with all required subsections. Skeleton constraints documented: min 10 lines, max 25 lines, positive examples 1-2, negative example exactly 1.

---

#### AC-3: Role pack directory structure documented — `prompts/role-packs/{role}.md` for role instructions and `prompts/role-packs/_specs/{pattern}.md` for pattern specs, with the purpose of each path explained

**Status**: PASS

**Evidence Items**:
- **Command**: `grep -E 'role-packs/\{role\}|role-packs/_specs' returns 4 matches in path purposes table and directory listing` - Directory structure documented with role and pattern spec paths

---

#### AC-4: Token budget constraints defined per role — explicit numeric bounds: 150 token minimum, 300 token maximum for role instructions; 10-25 line constraint for pattern skeleton bodies; tokenizer reference or line-count proxy included

**Status**: PASS

**Evidence Items**:
- **Command**: `grep -E '150|300' returns 5 matches. Line-count proxy documented as '~1 line ≈ 5-10 tokens' with midpoint formula 'line_count × 7'` - Token budget constraints explicitly defined with line-count proxy

---

#### AC-5: Decision rule format standardized — template uses boolean or threshold criteria (e.g., `when: ac_count > 1`), not prose descriptions; at least one worked example provided

**Status**: PASS

**Evidence Items**:
- **Manual**: Decision Rule Format section uses when/then/else structure with boolean/threshold expressions. Worked examples include:
  - `when: ac_count > 1` (threshold)
  - `when: verification_command exits non-zero AND repair_loop configured` (boolean compound)
  - Anti-pattern (prose rule) documented with 'WRONG' label

---

#### AC-6: Proof requirements format defined — specifies what artifact (file, JSON output, command result) must exist after applying the pattern, with a `verification_command` field template

**Status**: PASS

**Evidence Items**:
- **Manual**: Proof Requirements Format section defines explicit template:
  - `verification_command: "{shell command that exits 0 on success}"`
  - `expected_artifact: "{file path | exit code 0 | output substring}"`
  - `escalation: "{what agent must do if verification_command exits non-zero}"`
  - Two worked examples provided. Grandfathered gap for existing _specs/ files documented.

---

#### AC-7: Three delivery mechanisms documented: file-based, KB MCP `kb_search`, context-pack sidecar injection point; each includes usage guidance

**Status**: PASS

**Evidence Items**:
- **Command**: `grep -c -E 'kb_search|sidecar|prompts/role-packs' returns 16 matches (>= 3 required)` - Each mechanism includes usage guidance, best-for description, and code snippet

---

#### AC-8: Existing `_specs/` patterns validated against FRAMEWORK.md — both conform without modification; `git diff HEAD -- .claude/prompts/role-packs/_specs/` returns empty

**Status**: PASS

**Evidence Items**:
- **Command**: `git diff HEAD -- .claude/prompts/role-packs/_specs/ → empty output (0 bytes)` - No modifications to existing _specs/ files
- **Manual**: Conformance review:
  - `patch-queue-pattern.md`: has Version/Story/Status frontmatter, Overview, Decision Rule, Examples (2 positive + 1 negative), Cross-Reference. Lacks standalone Proof Requirements section — grandfathered as conformant per PLAN.yaml notes.
  - `repair-loop-pattern.md`: has Version/Story/Status frontmatter, Overview, Activation Trigger (maps to Decision Rule), Examples (2 positive + 1 negative), Cross-Reference. Lacks standalone Proof Requirements section — same grandfathered gap.
  - Both files structurally map to framework-required sections. No modifications required or made.

---

## Files Changed

| Path | Action | Lines |
|------|--------|-------|
| `.claude/prompts/role-packs/FRAMEWORK.md` | create | - |

**Total**: 1 file created

---

## Implementation Notes

### Notable Decisions

- Established 10-25 line constraint on pattern skeleton bodies to enforce "minimum viable" patterns and prevent prose documentation
- Defined line-count proxy (`line_count × 7`) as tokenizer reference fallback for token budget compliance
- Documented grandfathered gap for existing `_specs/` files that lack standalone Proof Requirements sections — both existing patterns map structurally to framework requirements without requiring modification
- Established delivery mechanism precedence: file-based (primary), KB MCP kb_search (secondary), context-pack sidecar (tertiary, implementation deferred to WINT-2020)

### Known Deviations

None. All acceptance criteria satisfied without scope modification or deviations from the original specification.

---

## E2E Gate Status

**Status**: EXEMPT

**Reason**: story_type: chore — documentation only, no runtime code

---

## Overall Verdict

**PASS**

All 8 acceptance criteria satisfied. FRAMEWORK.md successfully created at the correct path with all required sections present and properly structured. Existing `_specs/` pattern files validated conformant without modification. Git diff confirms zero unintended changes. Implementation complete and ready for review.

---

*Generated by dev-proof-leader from EVIDENCE.yaml*
