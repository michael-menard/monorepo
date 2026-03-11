# Test Plan: WINT-0150 - Create doc-sync Skill

**Story:** WINT-0150 - Create doc-sync Skill
**Epic:** WINT (Workflow Integration)
**Prepared:** 2026-02-14
**Test Strategy:** Documentation Validation

---

## Overview

This story creates a Skill documentation file (`.claude/skills/doc-sync/SKILL.md`) that wraps the existing doc-sync command and agent. Since Skills are documentation artifacts rather than executable code, the test plan focuses on **completeness validation** and **cross-reference verification** rather than traditional automated testing.

---

## Test Strategy

### Primary Approach: Manual Verification

**Rationale:**
- Skills are markdown documentation files, not code
- No runtime behavior to test (behavior is in agent/command, not Skill)
- Focus on ensuring documentation accurately reflects existing implementation
- Validate completeness against source materials

### Success Criteria

The Skill documentation is considered complete and correct when:
1. All flags, parameters, and options from the command spec are documented
2. All execution phases from the agent spec are documented
3. All examples from the command spec are included
4. Troubleshooting section covers error scenarios from agent
5. Integration patterns are clearly documented
6. Frontmatter follows established Skill pattern

---

## Test Cases

### TC-1: Completeness Check - Flags and Parameters

**Objective:** Verify all command flags are documented in the Skill

**Procedure:**
1. Open `.claude/commands/doc-sync.md`
2. Extract all flags: `--check-only`, `--force`
3. Open `.claude/skills/doc-sync/SKILL.md`
4. Verify each flag is documented with:
   - Flag name
   - Description of behavior
   - When to use it
   - Example showing its use

**Pass Criteria:**
- [ ] `--check-only` flag documented
- [ ] `--force` flag documented
- [ ] Each flag has description and example
- [ ] Flag behavior matches command spec

---

### TC-2: Completeness Check - Execution Phases

**Objective:** Verify all agent execution phases are documented in the Skill

**Procedure:**
1. Open `.claude/agents/doc-sync.agent.md`
2. Extract all phases from "Process" section (lines 40-307):
   - Phase 1: File Discovery
   - Phase 2: Frontmatter Parsing
   - Phase 3: Section Mapping
   - Phase 4: Documentation Updates
   - Phase 5: Mermaid Diagram Regeneration
   - Phase 6: Changelog Entry Drafting
   - Phase 7: SYNC-REPORT.md Generation
3. Open `.claude/skills/doc-sync/SKILL.md`
4. Verify each phase is documented with:
   - Phase number and name
   - Input requirements
   - Output artifacts
   - Key actions performed
   - Error handling approach

**Pass Criteria:**
- [ ] All 7 phases documented
- [ ] Each phase includes inputs, outputs, actions
- [ ] Phase descriptions match agent implementation
- [ ] Error handling for each phase documented

---

### TC-3: Completeness Check - Usage Examples

**Objective:** Verify all usage examples from command spec are included in Skill

**Procedure:**
1. Open `.claude/commands/doc-sync.md`
2. Extract all usage examples:
   - Full sync after creating new agent
   - Pre-commit hook workflow
   - Check-only mode for validation
   - Force mode for complete rebuild
3. Open `.claude/skills/doc-sync/SKILL.md`
4. Verify each example is documented with:
   - Realistic scenario description
   - Complete command invocation
   - Expected behavior
   - Example output (where applicable)

**Pass Criteria:**
- [ ] All examples from command spec included
- [ ] Examples are realistic and complete
- [ ] Examples show command syntax correctly
- [ ] Examples cover common use cases

---

### TC-4: Cross-Reference Validation - Section Mapping

**Objective:** Verify section mapping table matches agent implementation

**Procedure:**
1. Open `.claude/agents/doc-sync.agent.md`
2. Find "Section Mapping" table (lines 99-114)
3. Open `.claude/skills/doc-sync/SKILL.md`
4. Verify section mapping table is present and matches:
   - Agent pattern (pm-*, elab-*, dev-*, etc.)
   - Documentation file (phases.md, agent-system.md, etc.)
   - Section name

**Pass Criteria:**
- [ ] Section mapping table present in Skill
- [ ] Table matches agent implementation exactly
- [ ] All agent patterns covered
- [ ] Documentation file paths correct

---

### TC-5: Cross-Reference Validation - Output Artifacts

**Objective:** Verify SYNC-REPORT.md format documentation matches agent output

**Procedure:**
1. Open `.claude/agents/doc-sync.agent.md`
2. Find SYNC-REPORT.md template (lines 233-275)
3. Open `.claude/skills/doc-sync/SKILL.md`
4. Verify SYNC-REPORT documentation includes:
   - Report structure
   - All sections (Files Changed, Sections Updated, etc.)
   - Manual Review Needed section
   - Summary format

**Pass Criteria:**
- [ ] SYNC-REPORT.md structure documented
- [ ] All report sections listed
- [ ] Section descriptions match agent template
- [ ] Example report shown (optional but recommended)

---

### TC-6: Format Validation - YAML Frontmatter

**Objective:** Verify Skill frontmatter follows established pattern

**Procedure:**
1. Open `.claude/skills/review/SKILL.md` and `.claude/skills/qa-gate/SKILL.md`
2. Extract frontmatter format:
   ```yaml
   ---
   name: {skill-name}
   description: {1-2 sentence description}
   mcp_tools_available: []  # or list of tools
   ---
   ```
3. Open `.claude/skills/doc-sync/SKILL.md`
4. Verify frontmatter:
   - Has `name: doc-sync`
   - Has `description` field (1-2 sentences)
   - Has `mcp_tools_available` field
   - YAML is valid (proper indentation, syntax)

**Pass Criteria:**
- [ ] Frontmatter present
- [ ] Contains required fields (name, description, mcp_tools_available)
- [ ] YAML syntax valid
- [ ] Follows established pattern from other Skills

---

### TC-7: Format Validation - Section Structure

**Objective:** Verify Skill follows standard section organization

**Procedure:**
1. Open `.claude/skills/qa-gate/SKILL.md`
2. Extract section structure:
   - Description
   - Usage
   - Parameters
   - Execution Instructions
   - Examples
   - (Optional: Integration, Troubleshooting, etc.)
3. Open `.claude/skills/doc-sync/SKILL.md`
4. Verify sections are present and in logical order

**Pass Criteria:**
- [ ] Description section present
- [ ] Usage section with examples
- [ ] Parameters section (table or list)
- [ ] Execution Instructions section (phases)
- [ ] Examples section (multiple realistic scenarios)
- [ ] Sections in logical order

---

### TC-8: Integration Validation - Troubleshooting Coverage

**Objective:** Verify troubleshooting section covers agent error scenarios

**Procedure:**
1. Open `.claude/agents/doc-sync.agent.md`
2. Find "Error Handling" section (lines 340-349)
3. Extract error scenarios:
   - Invalid YAML frontmatter
   - Missing required field
   - Mermaid validation failure
   - File read failure
   - Git command failure
4. Open `.claude/skills/doc-sync/SKILL.md`
5. Verify troubleshooting section addresses each scenario with:
   - Symptom/error description
   - Root cause
   - Resolution steps

**Pass Criteria:**
- [ ] Troubleshooting section present
- [ ] Covers invalid YAML scenario
- [ ] Covers Mermaid validation failure
- [ ] Covers git unavailable scenario
- [ ] Each scenario has clear resolution steps

---

### TC-9: Integration Validation - Pre-Commit Hook Documentation

**Objective:** Verify pre-commit hook integration is clearly documented

**Procedure:**
1. Open `.claude/commands/doc-sync.md`
2. Find pre-commit hook section (lines 78-133)
3. Open `.claude/skills/doc-sync/SKILL.md`
4. Verify pre-commit hook integration includes:
   - Installation instructions
   - Hook script example
   - When hook triggers
   - How to bypass/disable

**Pass Criteria:**
- [ ] Pre-commit hook section present
- [ ] Installation steps clear
- [ ] Hook script provided
- [ ] Bypass instructions included

---

### TC-10: Behavioral Validation - Actual Invocation

**Objective:** Verify Skill documentation matches actual command behavior

**Procedure:**
1. Read Skill documentation for `/doc-sync`
2. Invoke `/doc-sync` in terminal
3. Observe behavior
4. Verify behavior matches Skill documentation:
   - Exit codes
   - Output format (SYNC-REPORT.md)
   - File modifications
5. Invoke `/doc-sync --check-only`
6. Verify check-only behavior matches documentation

**Pass Criteria:**
- [ ] `/doc-sync` behavior matches Skill documentation
- [ ] `--check-only` flag behavior matches documentation
- [ ] Exit codes match documentation (0 = in sync, 1 = out of sync)
- [ ] SYNC-REPORT.md format matches documentation

---

## Quality Gates

### Pre-Implementation Checklist

Before starting implementation:
- [ ] Review existing Skills (`/review`, `/qa-gate`) for pattern
- [ ] Review command spec (`.claude/commands/doc-sync.md`)
- [ ] Review agent spec (`.claude/agents/doc-sync.agent.md`)
- [ ] Understand section mapping logic

### Implementation Checklist

During implementation:
- [ ] Create `.claude/skills/doc-sync/` directory
- [ ] Create `SKILL.md` file
- [ ] Add YAML frontmatter
- [ ] Document all flags and parameters
- [ ] Document all execution phases
- [ ] Add usage examples
- [ ] Add troubleshooting section
- [ ] Add integration patterns

### Post-Implementation Validation

After implementation:
- [ ] Run all test cases (TC-1 through TC-10)
- [ ] Verify all pass criteria met
- [ ] Cross-reference command, agent, and Skill for consistency
- [ ] Manually invoke `/doc-sync` to verify documentation accuracy

---

## Regression Prevention

**Future Stories to Watch:**
- If doc-sync command is updated (new flags, behavior changes)
- If doc-sync agent is refactored (new phases, different outputs)
- If Skill pattern changes (new required sections, frontmatter fields)

**Documentation Sync:**
- When command/agent changes, update Skill documentation
- Run `/doc-sync` itself to keep workflow docs in sync
- Consider creating a "meta" sync check for Skill documentation

---

## Testing Tools

**Manual Tools:**
- Text editor for cross-referencing files
- Terminal for invoking `/doc-sync` command
- YAML validator for frontmatter syntax
- Markdown linter (optional) for formatting

**No Automated Tests Required:**
- Skills are documentation, not code
- No unit tests, integration tests, or E2E tests needed
- Manual validation is appropriate and sufficient

---

## Risk Assessment

**Likelihood of Issues:** Low
**Impact if Wrong:** Medium (documentation drift, user confusion)

**Mitigation:**
- Thorough cross-reference validation (TC-4, TC-5, TC-8)
- Behavioral validation by invoking actual command (TC-10)
- Following established pattern from existing Skills (TC-6, TC-7)

---

## Acceptance Criteria Mapping

| AC | Related Test Cases |
|----|-------------------|
| AC-1 (Frontmatter) | TC-6 |
| AC-2 (Flags) | TC-1, TC-3 |
| AC-3 (Phases) | TC-2 |
| AC-4 (Examples) | TC-3 |
| AC-5 (Integration) | TC-9 |
| AC-6 (Outputs) | TC-5, TC-10 |
| AC-7 (Troubleshooting) | TC-8 |

All acceptance criteria are covered by test cases.

---

## Estimated Test Execution Time

**Manual Validation:** 30-45 minutes
**Behavioral Testing:** 10-15 minutes
**Total:** ~1 hour

Since this is documentation-only, no automated test suite is required.
