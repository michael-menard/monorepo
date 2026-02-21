# Dev Feasibility Review: WINT-7020 — Create Agent Migration Plan

## Feasibility Summary

- **Feasible for MVP**: yes
- **Confidence**: high
- **Why**: This is a planning/documentation story with no code changes. All inputs are existing audit artifacts from WINT-7010 (confirmed present at `plans/future/platform/UAT/WINT-7010/`). The primary risk is analyst effort and judgment quality, not technical blockers. The batch-by-workflow-domain pattern from migrate-agents-v3.md provides a proven template. No dependencies on in-flight work (WINT-1160, WINT-4080) since no agent files are touched.

---

## Likely Change Surface (Core Only)

**Files to create (in story output directory):**
- `plans/future/platform/wint/backlog/WINT-7020/_implementation/MIGRATION-PLAN.md`
- `plans/future/platform/wint/backlog/WINT-7020/_implementation/BATCH-SCHEDULE.yaml`

**Files to read (inputs):**
- `plans/future/platform/UAT/WINT-7010/AGENT-CATALOG.yaml` — 141 agents, metadata
- `plans/future/platform/UAT/WINT-7010/CROSS-REFERENCES.yaml` — 62 spawn relationships
- `plans/future/platform/UAT/WINT-7010/ORPHANED-AGENTS.yaml` — 41 orphaned agents
- `plans/future/platform/UAT/WINT-7010/AUDIT-SUMMARY.md` — recommendations
- `plans/future/platform/UAT/WINT-7010/DIRECTORY-STRUCTURE.md` — dir layout
- `plans/future/platform/UAT/WINT-7010/SPAWN-GRAPH.md` — visual spawn hierarchy
- `plans/future/platform/UAT/WINT-7010/SHARED-DEPENDENCIES.yaml` — shared module usage
- `.claude/commands/migrate-agents-v3.md` — batch structure template
- `.claude/commands/story-update.md` — canonical already-migrated example (DB write pattern)
- `.claude/commands/story-status.md` — canonical already-migrated example (DB read pattern)

**Files not modified:**
- Zero `.agent.md`, command `.md`, or `SKILL.md` files are touched

**Critical deploy touchpoints**: None — documentation story, no deployment

---

## MVP-Critical Risks (Max 5)

### Risk 1: WINT-7010 artifact path mismatch

**Why it blocks MVP**: If the 7 WINT-7010 artifacts are not accessible at `plans/future/platform/UAT/WINT-7010/`, the developer cannot perform the required analysis for AC-1 through AC-4.

**Required mitigation**: Developer must verify all 7 artifacts exist at the path before starting implementation. The AUDIT-SUMMARY.md confirms 7 artifacts were produced — cross-check: AGENT-CATALOG.yaml, CROSS-REFERENCES.yaml, ORPHANED-AGENTS.yaml, AUDIT-SUMMARY.md, DIRECTORY-STRUCTURE.md, SPAWN-GRAPH.md, SHARED-DEPENDENCIES.yaml. All 7 confirmed present as of 2026-02-14.

---

### Risk 2: Agent count reconciliation ambiguity

**Why it blocks MVP**: The stories index entry says "52 agents." The WINT-7010 audit grep identified 41 `.agent.md` files with swim-lane references. The MIGRATION-PLAN.md must reconcile this or AC-2 (risk-scored inventory) cannot be finalized.

**Required mitigation**: During implementation, the developer must re-scan each of the 41 `.agent.md` files to classify: (a) substantive swim-lane logic needing migration, (b) incidental mentions, (c) already-migrated. The "52" likely includes command and skill files bundled with agents. Document the reconciliation explicitly in MIGRATION-PLAN.md scope section.

---

### Risk 3: Orphaned agent disposition decisions require judgment

**Why it blocks MVP**: AC-4 requires all 41 orphaned agents to receive a disposition (include-in-migration / deprecate-before-migrate / archive-not-migrate). Incorrect decisions could cause WINT-7030-7090 to attempt migrating deprecated agents or miss active ones.

**Required mitigation**: Developer should use ORPHANED-AGENTS.yaml combined with CROSS-REFERENCES.yaml to verify orphan status. Orphans confirmed by cross-reference check (not in any spawn chain, command reference, or agent-to-agent reference) are safe for deprecate-before-migrate. Those in _archive/ confirm archive-not-migrate. A judgment call table with rationale per orphan should appear in MIGRATION-PLAN.md.

---

## Missing Requirements for MVP

None. All requirements are specified in the 10 ACs. The seed provides concrete implementation guidance.

---

## MVP Evidence Expectations

- MIGRATION-PLAN.md file exists at story output directory with all required sections
- BATCH-SCHEDULE.yaml file exists at story output directory and is valid YAML
- Zero `.agent.md`, command `.md`, or `SKILL.md` file modifications (verified by `git diff --name-only HEAD`)
- All 7 WINT-7010 artifacts referenced as inputs in MIGRATION-PLAN.md
- All 41 orphaned agents classified in MIGRATION-PLAN.md
- Batch count in MIGRATION-PLAN.md = batch count in BATCH-SCHEDULE.yaml

---

## Proposed Subtask Breakdown

### ST-1: Read and catalog WINT-7010 audit artifacts

- **Goal**: Load all 7 WINT-7010 artifacts and produce a structured summary of inputs that will be referenced throughout MIGRATION-PLAN.md
- **Files to read**: `plans/future/platform/UAT/WINT-7010/AGENT-CATALOG.yaml`, `CROSS-REFERENCES.yaml`, `ORPHANED-AGENTS.yaml`, `AUDIT-SUMMARY.md`, `DIRECTORY-STRUCTURE.md`, `SPAWN-GRAPH.md`, `SHARED-DEPENDENCIES.yaml`
- **Files to create/modify**: Working notes only (no output file yet; feeds ST-2)
- **ACs covered**: AC-1
- **Depends on**: none
- **Verification**: Developer confirms all 7 files were read and their content is summarized in working notes

---

### ST-2: Build risk-scored agent inventory

- **Goal**: Produce the agent risk inventory table: for each of the 41 swim-lane agents (plus commands/skills), assign risk tier based on spawn depth from CROSS-REFERENCES.yaml and reference count from AGENT-CATALOG.yaml
- **Files to read**: ST-1 artifacts, `plans/future/platform/UAT/WINT-7010/CROSS-REFERENCES.yaml`, `AGENT-CATALOG.yaml`, `.claude/commands/migrate-agents-v3.md` (for prior batch-grouping format)
- **Files to create/modify**: `_implementation/MIGRATION-PLAN.md` (sections: Scope, Excluded Files, Risk Inventory)
- **ACs covered**: AC-2, AC-3, AC-4
- **Depends on**: ST-1
- **Verification**: MIGRATION-PLAN.md Risk Inventory section contains entries for all agents with swim-lane references; story-move.md, story-status.md, story-update.md appear in Excluded section; all 41 orphaned agents have disposition classification

---

### ST-3: Define migration batches and verification criteria

- **Goal**: Group risk-scored agents into 5-7 sequential batches by workflow domain; define per-batch verification criteria; write rollback procedure
- **Files to read**: `_implementation/MIGRATION-PLAN.md` (from ST-2), `plans/future/platform/UAT/WINT-7010/SPAWN-GRAPH.md`, `.claude/commands/migrate-agents-v3.md`
- **Files to create/modify**: `_implementation/MIGRATION-PLAN.md` (sections: Batch Table, Per-Batch Verification, Rollback), `_implementation/BATCH-SCHEDULE.yaml`
- **ACs covered**: AC-5, AC-6, AC-7, AC-8, AC-9
- **Depends on**: ST-2
- **Verification**: Batch count in [5, 7]; each batch has verification criteria; rollback section references compatibility shim directory fallback; BATCH-SCHEDULE.yaml parses as valid YAML with matching batch count

---

## Future Risks (Written to FUTURE-RISKS.md)

See `/Users/michaelmenard/Development/monorepo/plans/future/platform/wint/backlog/WINT-7020/_pm/FUTURE-RISKS.md`
