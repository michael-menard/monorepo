# KB-First Migration — Stories Index

**Plan Slug:** `kb-first-migration`
**Prefix:** `KFMB`
**Total Stories:** 20
**Generated:** 2026-02-26T00:00:00Z

---

## Progress Summary

| Phase | Ready | In Progress | Review | QA | Complete | Total |
|-------|-------|-------------|--------|-----|----------|-------|
| 1: Schema & API | 3 | 0 | 0 | 0 | 0 | 4 |
| 2: Bootstrap | 4 | 0 | 0 | 0 | 0 | 4 |
| 3: Index & Stage | 5 | 0 | 0 | 0 | 0 | 5 |
| 4: Artifact Migration | 5 | 0 | 0 | 0 | 0 | 5 |
| 5: Script Modernization | 2 | 0 | 0 | 0 | 0 | 2 |
| **TOTAL** | **19** | **0** | **0** | **0** | **0** | **20** |

---

## Phase 1: Schema & API Foundation

Extend the stories table, add PM artifact types, update CRUD operations, and register missing MCP tools.

### Stories

| ID | Title | Dependencies | Priority | Status |
|----|-------|--------------|----------|--------|
| KFMB-1010 | Stories Table Content Columns Migration | — | Medium | Ready to Work |
| KFMB-1020 | kb_create_story MCP Tool and CRUD Update | KFMB-1010 | Medium | Ready to Work |
| KFMB-1030 | PM Artifact Types and Detail Tables | KFMB-1010 | Medium | In Elaboration |
| KFMB-1040 | Register kb_delete_artifact MCP Tool | — | Medium | Ready to Work |

---

## Phase 2: Bootstrap Migration

Migrate story bootstrap to write directly to the KB with no filesystem output.

### Stories

| ID | Title | Dependencies | Priority | Status |
|----|-------|--------------|----------|--------|
| KFMB-2010 | KB-Native Bootstrap Generation Leader | KFMB-1020 | Medium | Created |
| KFMB-2020 | KB-Native Bootstrap Setup Leader | KFMB-1020 | Medium | Ready to Work |
| KFMB-2030 | Update /pm-bootstrap-workflow Command | KFMB-2010, KFMB-2020 | Medium | Ready to Work |
| KFMB-2040 | KB-Native Story Generation Pipeline | KFMB-1020, KFMB-1030 | Medium | Ready to Work |

---

## Phase 3: Index & Stage Elimination

Remove stories.index.md references and replace stage directories with DB state transitions.

### Stories

| ID | Title | Dependencies | Priority | Status |
|----|-------|--------------|----------|--------|
| KFMB-3010 | Eliminate stories.index.md — Agent Updates | KFMB-1020, KFMB-2010, KFMB-2020 | Medium | Ready to Work |
| KFMB-3020 | Eliminate stories.index.md — Command Updates | KFMB-3010 | Medium | Ready to Work |
| KFMB-3030 | Eliminate stories.index.md — Script Updates | KFMB-3010 | Medium | Ready to Work |
| KFMB-4010 | Stage Directory Elimination — story-move and story-update Commands | KFMB-3010 | Medium | Ready to Work |
| KFMB-4020 | Stage Directory Elimination — precondition-check, context-init, and Script State Detection | KFMB-4010 | Medium | Ready to Work |

---

## Phase 4: Artifact Migration

Migrate _implementation/ and _pm/ artifact read/write to KB tool calls across all agents and commands.

### Stories

| ID | Title | Dependencies | Priority | Status |
|----|-------|--------------|----------|--------|
| KFMB-5010 | Migrate _implementation/ Writer Agents to kb_write_artifact | KFMB-1030, KFMB-2040 | Medium | Created |
| KFMB-5020 | Migrate _implementation/ Reader Agents to kb_read_artifact | KFMB-5010 | Medium | Ready to Work |
| KFMB-5030 | Migrate _implementation/ Command Orchestrators | KFMB-5020 | Medium | Ready to Work |
| KFMB-5040 | Migrate _pm/ Writer Agents to kb_write_artifact | KFMB-1030, KFMB-2040 | Medium | Ready to Work |
| KFMB-5050 | Migrate _pm/ Reader Agents and Remove pm_artifacts Embedding | KFMB-5040 | Medium | Ready to Work |

---

## Phase 5: Script Modernization & Cleanup

Update shell/Python scripts to use KB queries and remove dead filesystem code.

### Stories

| ID | Title | Dependencies | Priority | Status |
|----|-------|--------------|----------|--------|
| KFMB-6010 | Script Modernization | KFMB-3030, KFMB-4020, KFMB-5030 | Medium | Ready to Work |
| KFMB-6020 | Dead Code Removal and Documentation Updates | KFMB-6010 | Medium | Ready to Work |

---

## Metrics

| Metric | Value |
|--------|-------|
| Total Stories | 20 |
| Total Phases | 5 |
| Critical Path Length | 8 |
| Maximum Parallelization | 4 stories |
| Stories with Sizing Warnings | 4 |
| Ready to Start | 4 (KFMB-1010, KFMB-1040, and dependent stories) |

---

## Critical Path

The longest dependency chain (8 stories):

1. KFMB-1010 — Stories Table Content Columns Migration
2. KFMB-1030 — PM Artifact Types and Detail Tables
3. KFMB-2040 — KB-Native Story Generation Pipeline
4. KFMB-5010 — Migrate _implementation/ Writer Agents
5. KFMB-5020 — Migrate _implementation/ Reader Agents
6. KFMB-5030 — Migrate _implementation/ Command Orchestrators
7. KFMB-6010 — Script Modernization
8. KFMB-6020 — Dead Code Removal and Documentation Updates

---

## Parallelization Groups

Stories can be worked on in parallel within each group:

- **Group 1:** KFMB-1010, KFMB-1040
- **Group 2:** KFMB-1020, KFMB-1030
- **Group 3:** KFMB-2010, KFMB-2020, KFMB-2040
- **Group 4:** KFMB-2030, KFMB-3010
- **Group 5:** KFMB-3020, KFMB-3030, KFMB-4010, KFMB-5010, KFMB-5040
- **Group 6:** KFMB-4020, KFMB-5020, KFMB-5050
- **Group 7:** KFMB-5030
- **Group 8:** KFMB-6010
- **Group 9:** KFMB-6020

---

## Next Steps

Begin work on Phase 1 stories:
- **KFMB-1010:** Extend stories table with content columns
- **KFMB-1040:** Register kb_delete_artifact MCP tool

These have no dependencies and unblock Phase 1 completion.
