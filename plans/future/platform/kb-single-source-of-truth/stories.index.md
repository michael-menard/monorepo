# kb-single-source-of-truth Story Index

**Plan Slug**: kb-single-source-of-truth
**Feature Directory**: plans/future/platform/kb-single-source-of-truth
**Prefix**: KSOT
**Generated**: 2026-03-08T00:00:00Z

## Progress Summary

| Phase | Name | Total Stories | Completed | In Progress | Remaining | Status |
|-------|------|---------------|-----------|-------------|-----------|--------|
| 1 | Fix the Write Path | 4 | 0 | 0 | 4 | not-started |
| 2 | KB Becomes Primary Reader | 5 | 0 | 0 | 5 | not-started |
| 3 | Eliminate Filesystem State | 5 | 0 | 0 | 5 | not-started |
| 4 | Validation | 3 | 0 | 0 | 3 | not-started |
| **TOTAL** | | **17** | **0** | **0** | **17** | |

## Phase 1: Fix the Write Path (4 stories)

Every state transition writes to the KB, immediately and correctly.

| ID | Title | Dependencies | Priority | Status | Size |
|---|---|---|---|---|---|
| KSOT-1010 | Fix State Name Mapping in Shim Layer | none | critical | Ready to Work | S |
| KSOT-1020 | Map All Story Statuses to KB Writes | KSOT-1010 | critical | Blocked | S |
| KSOT-1030 | Relax Terminal State Guard | none | high | Ready to Work | S |
| KSOT-1040 | Add KB Writes to implement-stories.sh | KSOT-1010, KSOT-1020 | critical | Blocked | M |

## Phase 2: KB Becomes Primary Reader (5 stories)

All story state readers query the KB first.

| ID | Title | Dependencies | Priority | Status | Size |
|---|---|---|---|---|---|
| KSOT-2010 | Switch implement-stories.sh Discovery to KB | KSOT-1040 | high | Blocked | M |
| KSOT-2020 | Update Leader Agents to Read from KB | KSOT-1010, KSOT-1020 | high | Blocked | L |
| KSOT-2030 | Update Command Orchestrators to Read from KB | KSOT-2020 | high | Blocked | M |
| KSOT-2040 | Make stories.index.md a Read-Only Report | KSOT-2010 | medium | Blocked | M |
| KSOT-2050 | Eliminate Story Frontmatter as State | KSOT-2020, KSOT-2030 | medium | Blocked | S |

## Phase 3: Eliminate Filesystem State (5 stories)

Stories live in flat directory structure. State is purely in KB.

| ID | Title | Dependencies | Priority | Status | Size |
|---|---|---|---|---|---|
| KSOT-3010 | Flatten Story Directory Structure | KSOT-2010, KSOT-2030 | high | Blocked | L |
| KSOT-3020 | Migrate Implementation Artifacts to KB | KSOT-3010 | medium | Blocked | XL |
| KSOT-3030 | Migrate PM Artifacts to KB | KSOT-3010 | medium | Blocked | L |
| KSOT-3040 | Delete stories.index.md | KSOT-2040, KSOT-3010 | medium | Blocked | S |
| KSOT-3050 | Script Modernization and Dead Code Removal | KSOT-3010, KSOT-3020, KSOT-3030, KSOT-3040 | medium | Blocked | L |

## Phase 4: Validation (3 stories)

| ID | Title | Dependencies | Priority | Status | Size |
|---|---|---|---|---|---|
| KSOT-4010 | KB State Integrity Constraints | KSOT-3050 | medium | Blocked | M |
| KSOT-4020 | End-to-End Pipeline Validation | KSOT-3050 | medium | Blocked | M |
| KSOT-4030 | Supersede Old Plans | KSOT-4020 | low | Blocked | S |

## Metrics

| Metric | Value |
|--------|-------|
| Total Stories | 17 |
| Total Phases | 4 |
| Critical Path Length | 6 (1010 to 1020 to 1040 to 2010 to 3010 to 3050) |
| Maximum Parallelization | 3 stories (Group 7) |
| Ready to Start Now | 2 (KSOT-1010, KSOT-1030) |

## Parallelization Groups

- **Group 1:** KSOT-1010, KSOT-1030
- **Group 2:** KSOT-1020
- **Group 3:** KSOT-1040, KSOT-2020
- **Group 4:** KSOT-2010, KSOT-2030
- **Group 5:** KSOT-2040, KSOT-2050
- **Group 6:** KSOT-3010
- **Group 7:** KSOT-3020, KSOT-3030, KSOT-3040
- **Group 8:** KSOT-3050
- **Group 9:** KSOT-4010, KSOT-4020
- **Group 10:** KSOT-4030
