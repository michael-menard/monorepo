# Test Plan: WINT-7020 — Create Agent Migration Plan

## Scope Summary

- Endpoints touched: none
- UI touched: no
- Data/storage touched: no (planning/documentation story only)
- Files produced: MIGRATION-PLAN.md, BATCH-SCHEDULE.yaml (in story output directory)

---

## Nature of Testing

This is a documentation/planning story. No executable code is produced. Verification is entirely structural and completeness-based. ADR-005 (real services for UAT) is NOT triggered — there is no runtime behavior.

---

## Happy Path Tests

### Test 1: WINT-7010 Artifact Consumption (AC-1)

- **Setup**: WINT-7010 artifacts exist at `plans/future/platform/UAT/WINT-7010/`: AGENT-CATALOG.yaml, CROSS-REFERENCES.yaml, ORPHANED-AGENTS.yaml, AUDIT-SUMMARY.md, and any additional artifacts (total: 7)
- **Action**: Open MIGRATION-PLAN.md and locate the "Inputs" or "Source Artifacts" section
- **Expected outcome**: Document explicitly lists all 7 WINT-7010 artifacts as consumed inputs with file paths
- **Evidence**: Artifact list in MIGRATION-PLAN.md references section; counts match exactly 7

### Test 2: Risk-Scored Agent Inventory (AC-2)

- **Setup**: MIGRATION-PLAN.md has been produced
- **Action**: Locate the risk inventory section; count total agent entries
- **Expected outcome**: Each entry includes: file path, agent type, swim-lane reference count, spawn chain depth, risk tier (critical/high/medium/low), migration rationale
- **Evidence**: Random sample of 5 entries verified to have all 6 required fields; no entry has an empty risk tier

### Test 3: Already-Migrated Exclusion (AC-3)

- **Setup**: MIGRATION-PLAN.md has been produced
- **Action**: Search for story-move.md, story-status.md, story-update.md in the document
- **Expected outcome**: All three are listed in an "Excluded Files" or "Already Migrated" section with verification status noted
- **Evidence**: Each of the three files appears with annotation indicating "already DB-first" or equivalent; they do NOT appear in any migration batch file list

### Test 4: Orphaned Agent Classification (AC-4)

- **Setup**: ORPHANED-AGENTS.yaml from WINT-7010 has 41 entries; MIGRATION-PLAN.md has been produced
- **Action**: Locate orphaned agent classification section; count entries; verify each has a disposition
- **Expected outcome**: All 41 orphaned agents from ORPHANED-AGENTS.yaml appear with one of: include-in-migration, deprecate-before-migrate, archive-not-migrate
- **Evidence**: Entry count = 41; no orphaned agent entry lacks a classification; classification rationale documented for each

### Test 5: Migration Batch Definition (AC-5)

- **Setup**: MIGRATION-PLAN.md has been produced
- **Action**: Count the number of migration batches defined
- **Expected outcome**: Between 5 and 7 sequential batches; each specifies batch number, batch name (workflow domain), list of files, estimated effort, blocking dependencies
- **Evidence**: Batch count in [5, 7]; each batch section has all 5 required fields; file lists are non-empty

### Test 6: Per-Batch Verification Criteria (AC-6)

- **Setup**: MIGRATION-PLAN.md has been produced
- **Action**: For each batch, locate its verification criteria subsection
- **Expected outcome**: Each batch includes: which spawn chains to smoke-test, which commands to exercise, what DB state to check
- **Evidence**: Every batch (all 5-7) has a verification criteria section with at least 3 checklist items; no batch is missing verification criteria

### Test 7: Rollback Procedure (AC-7)

- **Setup**: MIGRATION-PLAN.md has been produced
- **Action**: Locate the rollback section
- **Expected outcome**: Rollback procedure documented: explains how to verify compatibility shim directory fallback is engaged, how to revert shim behavior, applicable to any batch
- **Evidence**: Rollback section mentions compatibility shim and directory fallback explicitly; procedure is described as batch-agnostic

### Test 8: MIGRATION-PLAN.md Structural Completeness (AC-8)

- **Setup**: MIGRATION-PLAN.md produced at story output directory
- **Action**: Verify all required sections exist
- **Expected outcome**: Document contains all required sections: scope, excluded files, risk inventory, batch table, per-batch verification, rollback
- **Evidence**: Section headings verified by reading document; no required section absent

### Test 9: BATCH-SCHEDULE.yaml Valid YAML (AC-9)

- **Setup**: BATCH-SCHEDULE.yaml produced alongside MIGRATION-PLAN.md
- **Action**: Parse BATCH-SCHEDULE.yaml with a YAML parser; inspect structure
- **Expected outcome**: File parses without errors; contains machine-readable batch definitions with: story ID per batch, file list, dependencies, estimated points
- **Evidence**: `python3 -c "import yaml; yaml.safe_load(open('BATCH-SCHEDULE.yaml'))"` exits 0; structure includes required fields

### Test 10: No Agent/Command/Skill Modification (AC-10)

- **Setup**: Git diff or pre/post file hashes for all `.agent.md`, `.md` command, and `SKILL.md` files
- **Action**: Compare agent/command/skill file state before and after story implementation
- **Expected outcome**: Zero modifications to any `.agent.md`, command `.md`, or `SKILL.md` file
- **Evidence**: `git diff --name-only HEAD` shows no changes in `.claude/agents/`, `.claude/commands/`, or `.claude/skills/`

---

## Error Cases

### Error Case 1: Missing WINT-7010 Artifacts

- **Setup**: One or more WINT-7010 artifacts are not present at expected path
- **Action**: Developer implementing WINT-7020 attempts to read artifacts
- **Expected**: Story blocked (PM BLOCKED) until WINT-7010 is confirmed complete with artifacts at documented path
- **Evidence**: If this occurs, BLOCKERS.md entry created; implementation does not proceed without all 7 artifacts

### Error Case 2: Agent Count Mismatch

- **Setup**: AGENT-CATALOG.yaml and direct grep scan yield different agent counts for swim-lane references
- **Action**: Developer reconciles discrepancy during implementation
- **Expected**: MIGRATION-PLAN.md documents the reconciliation explicitly — explains "52 agents" figure vs 41 `.agent.md` grep count (difference attributable to commands and skills)
- **Evidence**: MIGRATION-PLAN.md has a reconciliation note in scope section; final migrated scope count is documented with breakdown (agents + commands + skills)

### Error Case 3: Batch Scope Drift (Orphaned + Excluded ≠ Total)

- **Setup**: MIGRATION-PLAN.md is produced
- **Action**: Sum: (agents in batches) + (excluded/already-migrated) + (deprecate-before-migrate) + (archive-not-migrate) = total swim-lane agents
- **Expected**: Totals reconcile — no agents are unaccounted for
- **Evidence**: Arithmetic check passes; MIGRATION-PLAN.md includes a totals table

---

## Edge Cases

### Edge Case 1: Agents with Incidental Swim-Lane References

- **Setup**: An agent file contains a swim-lane path in a comment or example, not in functional logic
- **Action**: Risk inventory entry for that agent is examined
- **Expected**: Entry notes "incidental reference — no functional migration required" with rationale; agent excluded from migration batches
- **Evidence**: Classification column for that agent reads "incidental" or equivalent

### Edge Case 2: Commands that Reference Both DB and Directory

- **Setup**: A command like story-move.md already calls shimUpdateStoryStatus but also has a directory mv step
- **Action**: Verify MIGRATION-PLAN.md handles this mixed state
- **Expected**: Such commands are classified as "partially migrated" or "already DB-first" with explicit note that directory step is preserved per WINT-1060 design decision
- **Evidence**: story-move.md entry shows "excluded — already DB-first" with WINT-1060 reference

### Edge Case 3: Skill Files with Swim-Lane References

- **Setup**: 3 skill files (token-log, token-report, wt-new) contain swim-lane references per WINT-7010 audit
- **Action**: MIGRATION-PLAN.md is examined for skill file handling
- **Expected**: All 3 skill files appear in risk inventory with appropriate classification; included in a batch or explicitly excluded with rationale
- **Evidence**: Skill file entries present in inventory; batch assignment or exclusion rationale documented

### Edge Case 4: BATCH-SCHEDULE.yaml Story ID Mapping

- **Setup**: BATCH-SCHEDULE.yaml defines story IDs WINT-7030 through WINT-7090
- **Action**: Verify batch count in YAML matches MIGRATION-PLAN.md batch count
- **Expected**: YAML batch entries 1:1 match document batches; no batch present in one but not the other
- **Evidence**: Batch count matches between MIGRATION-PLAN.md and BATCH-SCHEDULE.yaml

---

## Required Tooling Evidence

### Backend

Not applicable — no backend endpoints involved.

### Documentation Verification

```bash
# Verify BATCH-SCHEDULE.yaml is valid YAML
python3 -c "import yaml; data = yaml.safe_load(open('BATCH-SCHEDULE.yaml')); print('Valid YAML, batches:', len(data.get('batches', [])))"

# Verify no agent/command/skill files were modified
git diff --name-only HEAD | grep -E '\.(agent|command|skill)\.md|\.claude/agents/|\.claude/commands/|\.claude/skills/'

# Verify MIGRATION-PLAN.md exists and has all required sections
grep -E "^## (Scope|Excluded|Risk Inventory|Batch|Verification|Rollback)" plans/future/platform/wint/backlog/WINT-7020/_implementation/MIGRATION-PLAN.md
```

---

## Risks to Call Out

- **WINT-7010 artifact availability**: If WINT-7010 is in UAT but artifacts are not at the expected path, the developer will need to locate them — risk is path mismatch, not content missing.
- **Agent count reconciliation**: The "52 agents" vs 41 grep count discrepancy must be resolved during implementation; if reconciliation produces a number outside the expected range, BLOCKERS.md should be created.
- **Orphaned agent classification**: 41 orphaned agents need disposition decisions — the developer implementing WINT-7020 must make judgment calls on each; if uncertain, BLOCKERS.md entry for PM review.
- **No automated test harness**: All verification is manual review. QA should plan for careful document inspection, not automated runs.
