# Story Status Output Formats

Example output formats for /story-status command.

---

## In-Depth Epic View

```
╔═════════════════════════════════════════════════════════════════════════════════════════╗
║                              KNOW Epic - In-Depth Status                                ║
╠═════════════════════════════════════════════════════════════════════════════════════════╣
║ Total: 28 │ Done: 7 │ In QA: 1 │ Ready for QA: 2 │ In Progress: 2 │ Ready: 2 │ Pending: 14
╚═════════════════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────┐
│ 📊 PROGRESS SUMMARY                                              │
├─────────────────────────────────────────────────────────────────┤
│ completed        ████████████████░░░░░░░░░░░░░░░░  7 (25%)      │
│ in-qa            ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  1 (4%)       │
│ ready-for-qa     ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░  2 (7%)       │
│ in-progress      ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░  2 (7%)       │
│ ready-to-work    ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░  2 (7%)       │
│ pending          ████████████████████████████████  12 (43%)     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 🚀 READY TO START (no blockers)                                  │
├─────────────────────────────────────────────────────────────────┤
│ KNOW-006  │ Parsers and Seeding                                  │
│ KNOW-017  │ Data Encryption                                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 🔗 DEPENDENCY GRAPH                                              │
├─────────────────────────────────────────────────────────────────┤
│ KNOW-003 ──► KNOW-004 ──► KNOW-008 ──► KNOW-013                 │
│                               └──────► KNOW-019                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Swimlane View

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🏊 SWIMLANE VIEW                                                                                           │
├────────────┬────────────┬────────────┬────────────┬────────────┬────────────┬────────────┬────────────────┤
│  BACKLOG   │   ELAB     │   READY    │ IN-PROGRESS│  READY-QA  │   IN-QA    │    DONE    │                │
├────────────┼────────────┼────────────┼────────────┼────────────┼────────────┼────────────┼────────────────┤
│ KNOW-007   │ KNOW-006   │ KNOW-0053  │ KNOW-008   │ KNOW-0052  │ KNOW-028   │ KNOW-001   │                │
│ Admin      │ Parsers    │ Stubs      │ Workflow   │ Search     │ Env Vars   │ Infra      │                │
│ ...+10     │            │            │            │            │            │ ...+4      │                │
├────────────┼────────────┼────────────┼────────────┼────────────┼────────────┼────────────┼────────────────┤
│     12     │      1     │      1     │      1     │      2     │      1     │      7     │                │
└────────────┴────────────┴────────────┴────────────┴────────────┴────────────┴────────────┴────────────────┘
```

**Swimlane columns:**
| Column | Emoji | Source Directory | Status |
|--------|-------|------------------|--------|
| BACKLOG | ⏸️ | `backlog/` | `backlog` |
| CREATED | 🆕 | `created/` | `created` |
| ELAB | 📝 | `elaboration/` | `elaboration` |
| READY | ⏳ | `ready-to-work/` | `ready-to-work` |
| IN-PROGRESS | 🚧 | `in-progress/` | `in-progress` |
| CODE-REVIEW | 👀 | `needs-code-review/` | `needs-code-review` |
| REVIEW-FAIL | 🔴 | `failed-code-review/` | `failed-code-review` |
| READY-QA | 🔍 | `ready-for-qa/` | `ready-for-qa` |
| QA-FAIL | ⚠️ | `failed-qa/` | `failed-qa` |
| DONE | ✅ | `UAT/` or `completed/` | `uat` / `completed` |

**Rendering rules:**
- Story ID + abbreviated title (first 10 chars)
- Max 5 stories per column, then "+N more"
- Column width: 12 chars
- Footer: count per lane

---

## Status Icons

| Icon | Status | Directory |
|------|--------|-----------|
| ✅ | `uat` / `completed` | `UAT/` |
| 🔍 | `ready-for-qa` | `ready-for-qa/` |
| ⚠️ | `failed-qa` | `failed-qa/` |
| 👀 | `needs-code-review` | `needs-code-review/` |
| 🔴 | `failed-code-review` | `failed-code-review/` |
| 🚧 | `in-progress` | `in-progress/` |
| ⏳ | `ready-to-work` | `ready-to-work/` |
| 📝 | `elaboration` | `elaboration/` |
| 🆕 | `created` | `created/` |
| ⏸️ | `pending` / `backlog` | `backlog/` |

---

## Dependency-Ordered Work List (--deps-order)

```
╔═════════════════════════════════════════════════════════════════════════════════════════╗
║                        BUGF Epic - Dependency Work List                                 ║
╠═════════════════════════════════════════════════════════════════════════════════════════╣
║ Total: 28 │ Active: 26 │ Deferred: 2 │ Longest Chain: 3 │ Max Parallel: 22              ║
╚═════════════════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────┐
│ TIER 0 — No Dependencies (22 stories, start immediately)         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ Phase 1: Critical Functionality                                   │
│ ┌──────────┬────────────────────────────────────────┬──────────┐ │
│ │ Story    │ Title                                  │ Blocks   │ │
│ ├──────────┼────────────────────────────────────────┼──────────┤ │
│ │ BUGF-001 │ Implement Presigned URL API             │ 004, 025 │ │
│ │ BUGF-002 │ Implement Edit Save for Instructions    │ —        │ │
│ │ BUGF-003 │ Implement Delete API / Edit Sets        │ —        │ │
│ │ BUGF-016 │ Missing API Integrations Inspiration    │ —        │ │
│ └──────────┴────────────────────────────────────────┴──────────┘ │
│                                                                   │
│ Phase 2: Cross-App Infrastructure                                 │
│ ┌──────────┬────────────────────────────────────────┬──────────┐ │
│ │ BUGF-026 │ Auth Token Refresh Security Review      │ 005      │ │
│ │ BUGF-006 │ Replace Console Usage with logger       │ —        │ │
│ └──────────┴────────────────────────────────────────┴──────────┘ │
│                                                                   │
│ Phase 3: Test Coverage & Quality                                  │
│ ┌──────────┬────────────────────────────────────────┬──────────┐ │
│ │ BUGF-028 │ MSW Mocking Infrastructure              │ —        │ │
│ │ BUGF-027 │ Rate Limiting Implementation Guide      │ —        │ │
│ │ BUGF-009 │ Fix Skipped Test Suites                 │ —        │ │
│ │  ...     │ (+8 more)                               │          │ │
│ └──────────┴────────────────────────────────────────┴──────────┘ │
│                                                                   │
│ Phase 4: Code Quality & Cleanup                                   │
│ ┌──────────┬────────────────────────────────────────┬──────────┐ │
│ │ BUGF-017 │ Convert Interfaces to Zod Schemas       │ —        │ │
│ │  ...     │ (+3 more)                               │          │ │
│ └──────────┴────────────────────────────────────────┴──────────┘ │
│                                                                   │
│ Phase 5: E2E Testing                                              │
│ ┌──────────┬────────────────────────────────────────┬──────────┐ │
│ │ BUGF-030 │ Comprehensive E2E Test Suite            │ —        │ │
│ └──────────┴────────────────────────────────────────┴──────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ TIER 1 — Blocked by Tier 0 (3 stories)                           │
├─────────────────────────────────────────────────────────────────┤
│ ┌──────────┬────────────────────────────────────────┬──────────┐ │
│ │ Story    │ Title                                  │ Wait For │ │
│ ├──────────┼────────────────────────────────────────┼──────────┤ │
│ │ BUGF-004 │ Session Refresh API for Upload Expiry   │ 001      │ │
│ │ BUGF-025 │ Lambda IAM Policy Documentation         │ 001      │ │
│ │ BUGF-005 │ Create Shared Auth Hooks Package        │ 026      │ │
│ └──────────┴────────────────────────────────────────┴──────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ TIER 2 — Blocked by Tier 1 (1 story)                             │
├─────────────────────────────────────────────────────────────────┤
│ ┌──────────┬────────────────────────────────────────┬──────────┐ │
│ │ Story    │ Title                                  │ Chain    │ │
│ ├──────────┼────────────────────────────────────────┼──────────┤ │
│ │ BUGF-023 │ Wishlist Drag and Delete Issues         │ 026→005  │ │
│ └──────────┴────────────────────────────────────────┴──────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ DEFERRED (2 stories, not in MVP)                                 │
├─────────────────────────────────────────────────────────────────┤
│ ┌──────────┬────────────────────────────────────────┬──────────┐ │
│ │ BUGF-007 │ Dashboard Test Mismatches               │ —        │ │
│ │ BUGF-011 │ Dashboard Component Tests               │ 007      │ │
│ └──────────┴────────────────────────────────────────┴──────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ CRITICAL CHAINS                                                   │
├─────────────────────────────────────────────────────────────────┤
│ BUGF-001 → BUGF-004                                              │
│ BUGF-001 → BUGF-025                                              │
│ BUGF-026 → BUGF-005 → BUGF-023  (longest: 3)                    │
└─────────────────────────────────────────────────────────────────┘
```

**Rendering rules:**
- Group by tier (Tier 0, Tier 1, Tier 2, ...)
- Within each tier, sub-group by phase number
- Show story ID, abbreviated title (max 40 chars), and what it blocks/waits-for
- "Blocks" column: show short IDs of downstream stories this unblocks
- "Wait For" column: show short IDs of upstream blockers
- "Chain" column (Tier 2+): show full dependency chain using → arrows
- Completed stories: exclude from tiers, show count in header
- Deferred stories: show in separate section at the end
- Critical chains: show all paths of length >= 2, mark longest
- Header metrics: Total, Active, Deferred, Completed, Longest Chain depth, Max Parallel (Tier 0 count)

---

## Single Story Output

```
Feature: plans/future/wishlist
Story: WISH-001
Status: in-progress
Location: plans/future/wishlist/in-progress/WISH-001/
Depends On: none
```

---

## Feature Summary

```
┌──────────────────────────────────────────────────────────────┐
│ FEATURE: plans/future/wishlist                                │
│ Plan: WISH - Wishlist Feature                                 │
│ Active: 12 stories                                            │
├──────────────────────────────────────────────────────────────┤
│ Status          │ Count │ Progress                            │
├─────────────────┼───────┼─────────────────────────────────────┤
│ completed       │   5   │ ██████████████████░░░░  42%        │
│ in-progress     │   2   │ ████░░░░░░░░░░░░░░░░░░  17%        │
│ ready-to-work   │   1   │ ██░░░░░░░░░░░░░░░░░░░░   8%        │
│ pending         │   4   │ ████████░░░░░░░░░░░░░░  33%        │
├─────────────────┼───────┼─────────────────────────────────────┤
│ TOTAL           │  12   │                                     │
└──────────────────────────────────────────────────────────────┘
```
