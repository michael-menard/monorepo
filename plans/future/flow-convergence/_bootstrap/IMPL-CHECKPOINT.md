---
schema: 1
last_updated: "2026-01-31T14:30:00Z"
current_phase: 2
active_story: null
status: in_progress
---

# FLOW Implementation Checkpoint

Implementation progress tracker for flow-convergence feature.

---

## Progress Summary

| Status | Count |
|--------|-------|
| Completed | 4 |
| In Progress | 0 |
| Blocked | 0 |
| Pending | 37 |

---

## Completed Stories

- [x] FLOW-001 — Reality Intake Sub-Graph Infrastructure (3 files created)
- [x] FLOW-021 — LangGraph Reality Intake Node - Baseline Loader (4 files created, 21 tests)
- [x] FLOW-002 — Reality Baseline Collection Agent (1 file created)
- [x] FLOW-022 — LangGraph Context Retrieval Node (2 files created, 22 tests)

---

## In Progress

_None yet_

---

## Ready to Start

Stories with all dependencies satisfied:

- [ ] FLOW-003 — Story Seed Phase Integration (depends: FLOW-002 ✓)
- [ ] FLOW-023 — LangGraph Story Node - Seed (depends: FLOW-022 ✓)

---

## Blocked

Stories waiting on dependencies:

| Story | Blocked By |
|-------|------------|
| ~~FLOW-002~~ | ~~FLOW-001~~ (now ready) |
| FLOW-003 | FLOW-002 |
| FLOW-004 | FLOW-003 |
| FLOW-005 | FLOW-004 |
| FLOW-006 | FLOW-005 |
| FLOW-007 | FLOW-006 |
| FLOW-008 | FLOW-007 |
| FLOW-009 | FLOW-008 |
| FLOW-010 | FLOW-009 |
| FLOW-011 | FLOW-010 |
| FLOW-012 | FLOW-011 |
| FLOW-013 | FLOW-011 |
| FLOW-014 | FLOW-013 |
| FLOW-015 | FLOW-012 |
| FLOW-016 | FLOW-013 |
| FLOW-017 | FLOW-006 |
| ~~FLOW-022~~ | ~~FLOW-021~~ (now ready) |
| FLOW-023 | FLOW-022 |
| FLOW-024 | FLOW-023 |
| FLOW-025 | FLOW-023 |
| FLOW-026 | FLOW-023 |
| FLOW-027 | FLOW-024, FLOW-025, FLOW-026 |
| FLOW-028 | FLOW-027 |
| FLOW-029 | FLOW-028 |
| FLOW-030 | FLOW-029 |
| FLOW-031 | FLOW-030 |
| FLOW-032 | FLOW-031 |
| FLOW-033 | FLOW-032 |
| FLOW-034 | FLOW-029 |
| FLOW-035 | FLOW-034 |
| FLOW-036 | FLOW-035 |
| FLOW-037 | FLOW-035 |
| FLOW-038 | FLOW-035 |
| FLOW-039 | FLOW-035 |
| FLOW-040 | FLOW-035 |
| FLOW-041 | FLOW-028 |
| FLOW-042 | FLOW-030 |
| FLOW-043 | FLOW-033 |
| FLOW-044 | FLOW-041 |

---

## Cached Context

### Agent Patterns

**Naming:** `{agent-name}.agent.md`
**Location:** `.claude/agents/`

**Frontmatter (required):**
```yaml
created: YYYY-MM-DD
updated: YYYY-MM-DD
version: X.Y.Z
type: orchestrator | leader | worker | reference
permission_level: orchestrator | read-only | docs-only
```

**Optional frontmatter:** `model`, `triggers`, `skills_used`, `spawns`, `read_by`, `description`

**Structure:**
1. YAML Frontmatter
2. Title/Heading
3. Role section
4. Mission/Purpose
5. Inputs (data sources & paths)
6. Core content (execution flow, checks, logic)
7. Output Format (structured, usually YAML for workers)
8. Completion Signal (exact end phrase)
9. Non-Negotiables (rules section)
10. Token Tracking

**Completion Signals:**
- Orchestrators: `{DOMAIN} COMPLETE` or `{DOMAIN} BLOCKED: reason` or `{DOMAIN} FAILED: reason`
- Workers: `{DOMAIN} PASS` or `{DOMAIN} FAIL: details`

**Worker output:** YAML only, no prose. Include `tokens: {in: N, out: M}` at end.

### Command Patterns

**Naming:** `{action}-{subject}.md` or `{workflow}-{phase}.md`
**Location:** `.claude/commands/`

**Frontmatter:**
```yaml
created: YYYY-MM-DD
updated: YYYY-MM-DD
version: X.Y.Z
type: orchestrator | utility-skill
agents: ["{agent}.agent.md"]  # if orchestrator
skills_chained: ["/skill-1"]  # if applicable
```

**Structure:**
1. Frontmatter
2. `# /command-name {ARGS}` heading with description
3. Usage section with example
4. Phases table: `| # | Agent | Model | Signal |`
5. Execution section with Task tool templates
6. Error Handling table: `| Signal | Action |`
7. Done section with completion criteria
8. Ref link to `.claude/docs/`

**Task tool template:**
```
Task tool:
  subagent_type: "general-purpose"
  model: {model}
  description: "{description}"
  prompt: |
    Read instructions: .claude/agents/{agent-file}
    Context...
```

---

## Session Log

| Timestamp | Action | Result |
|-----------|--------|--------|
| — | Checkpoint initialized | Ready to start |
| 2026-01-31T14:30 | Phase 1: Explored agent patterns | Cached to checkpoint |
| 2026-01-31T14:30 | Phase 1: Explored command patterns | Cached to checkpoint |
| 2026-01-31T14:31 | Phase 2: Starting FLOW-001 & FLOW-021 | Workers spawned |
| 2026-01-31T14:35 | FLOW-001 completed | 3 files created |
| 2026-01-31T14:35 | FLOW-021 completed | 4 files created, 21 tests |
| 2026-01-31T14:35 | Unblocked FLOW-002, FLOW-022 | Ready to start |
| 2026-01-31T14:40 | FLOW-002 completed | 1 file created |
| 2026-01-31T14:40 | FLOW-022 completed | 2 files created, 22 tests |
| 2026-01-31T14:40 | Unblocked FLOW-003, FLOW-023 | Ready to start |

---

## Resume Instructions

1. Read this checkpoint
2. Check `active_story` — if set, resume that story
3. Check "Ready to Start" — pick next available
4. Use cached context if Phase 1 exploration complete
5. Continue with orchestrator pattern

---
