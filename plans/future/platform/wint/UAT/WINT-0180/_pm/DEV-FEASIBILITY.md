# Dev Feasibility: WINT-0180 — Define Examples + Negative Examples Framework

## Feasibility Summary

- **Feasible for MVP**: Yes
- **Confidence**: High
- **Why**: This is a documentation-only story. The primary deliverable is a single Markdown file (`FRAMEWORK.md`). No code changes, no schema migrations, no API work. The reference exemplars (`patch-queue-pattern.md`, `repair-loop-pattern.md`) already exist and implicitly follow the pattern this story formalizes. The main risk is writing a framework document that is too abstract to be actionable, which is a quality concern rather than a feasibility concern.

---

## Likely Change Surface (Core Only)

- **Files to create**:
  - `.claude/prompts/role-packs/FRAMEWORK.md` (new file — primary deliverable)
- **Files to read (reference only, do not modify)**:
  - `.claude/prompts/role-packs/_specs/patch-queue-pattern.md`
  - `.claude/prompts/role-packs/_specs/repair-loop-pattern.md`
  - `.claude/agents/*.agent.md` (for YAML frontmatter versioning pattern reference)
- **Files to NOT touch**: Any existing `_specs/` files (owned by WINT-0190)
- **No runtime code, no database, no API, no UI**

---

## MVP-Critical Risks (Max 5)

### Risk 1: FRAMEWORK.md is too abstract to be actionable

- **Why it blocks MVP**: If developers can't derive a concrete pattern spec from the framework document alone, WINT-0210 (Populate Role Pack Templates) will fail its ACs because the framework isn't clear enough to build on.
- **Required mitigation**: FRAMEWORK.md must include at least one complete worked example showing: a decision rule with boolean/threshold criteria, a pattern skeleton at 10-25 lines, one positive example (JSON/code), one negative example (JSON/code), and a proof requirement with verification command. The existing `_specs/` files serve as the exemplars to validate against — if FRAMEWORK.md cannot explain why those files are correct, it is not actionable.

### Risk 2: Existing `_specs/` patterns require modification to conform

- **Why it blocks MVP**: AC-8 requires validation without breaking changes. If `patch-queue-pattern.md` or `repair-loop-pattern.md` do not conform to the framework as written, the story either must modify the `_specs/` files (violating the non-goal) or the framework must be written retroactively to match what exists.
- **Required mitigation**: Write FRAMEWORK.md by reverse-engineering the structure already in the existing `_specs/` files, then document it as the standard. The standard must be compatible with what already exists, not an idealized version that conflicts.

---

## Missing Requirements for MVP

None identified. All 8 ACs are clearly specified and the scope is bounded to a single new file. No ambiguous requirements that block implementation.

---

## MVP Evidence Expectations

- `FRAMEWORK.md` exists at `.claude/prompts/role-packs/FRAMEWORK.md`
- All 7 required sections present (pattern skeleton, decision rule, positive examples, negative example, proof requirements, token budget, delivery mechanisms)
- `git diff HEAD -- .claude/prompts/role-packs/_specs/` returns no changes (existing files untouched)
- Both `patch-queue-pattern.md` and `repair-loop-pattern.md` structures map to FRAMEWORK.md sections without requiring changes to either file

---

## Proposed Subtask Breakdown

### ST-1: Read reference specs and extract implicit structure

- **Goal**: Analyze both existing `_specs/` pattern files to derive the implicit structure the framework must formalize
- **Files to read**:
  - `.claude/prompts/role-packs/_specs/patch-queue-pattern.md` (canonical reference)
  - `.claude/prompts/role-packs/_specs/repair-loop-pattern.md` (canonical reference)
- **Files to create/modify**: None (read-only analysis step — output feeds into ST-2)
- **ACs covered**: AC-8 (conformance validation basis)
- **Depends on**: none
- **Verification**: Mental/documented structure map: "patch-queue has [Version, Story, Status, Overview, Decision Rule, Examples, Cross-Reference]" — same for repair-loop

---

### ST-2: Write FRAMEWORK.md with pattern skeleton template and decision rule format

- **Goal**: Create `.claude/prompts/role-packs/FRAMEWORK.md` with the core structure sections: overview, directory structure, pattern skeleton template (10-25 lines), and decision rule format
- **Files to read**:
  - `.claude/prompts/role-packs/_specs/patch-queue-pattern.md` (canonical — shows decision rule format)
  - `.claude/agents/doc-sync.agent.md` (YAML frontmatter versioning pattern)
- **Files to create/modify**:
  - `.claude/prompts/role-packs/FRAMEWORK.md` (new)
- **ACs covered**: AC-1, AC-2, AC-3, AC-5
- **Depends on**: ST-1
- **Verification**: `test -f .claude/prompts/role-packs/FRAMEWORK.md && grep -i "pattern skeleton" .claude/prompts/role-packs/FRAMEWORK.md`

---

### ST-3: Add examples standard, token budget, proof requirements, and delivery mechanisms

- **Goal**: Complete FRAMEWORK.md by adding the examples standard (max 2 positive + 1 negative), token budget section (150-300 tokens), proof requirements format, and delivery mechanisms documentation
- **Files to read**:
  - `.claude/prompts/role-packs/FRAMEWORK.md` (from ST-2, to extend)
  - `.claude/prompts/role-packs/_specs/repair-loop-pattern.md` (canonical — shows proof/escalation structure)
- **Files to create/modify**:
  - `.claude/prompts/role-packs/FRAMEWORK.md` (extend)
- **ACs covered**: AC-4, AC-6, AC-7
- **Depends on**: ST-2
- **Verification**: `grep -E "150|300|kb_search|sidecar" .claude/prompts/role-packs/FRAMEWORK.md | wc -l` — expect >= 4 matches

---

### ST-4: Validate existing `_specs/` patterns against completed FRAMEWORK.md

- **Goal**: Perform conformance check — verify `patch-queue-pattern.md` and `repair-loop-pattern.md` conform to FRAMEWORK.md without requiring changes to either file
- **Files to read**:
  - `.claude/prompts/role-packs/FRAMEWORK.md` (complete, from ST-3)
  - `.claude/prompts/role-packs/_specs/patch-queue-pattern.md`
  - `.claude/prompts/role-packs/_specs/repair-loop-pattern.md`
- **Files to create/modify**: None (read-only validation; optionally append a `## Conformance Validation` section to FRAMEWORK.md)
- **ACs covered**: AC-8
- **Depends on**: ST-3
- **Verification**: `git diff HEAD -- .claude/prompts/role-packs/_specs/` returns empty (no modifications to existing files)
