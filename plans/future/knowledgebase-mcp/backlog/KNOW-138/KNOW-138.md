---
story_id: KNOW-138
title: Agent KB Integration Testing
status: backlog
epic: knowledgebase-mcp
created: 2026-01-31
updated: 2026-01-31
depends_on: [KNOW-043]
follow_up_from: KNOW-043
blocks: []
assignee: null
priority: P2
story_points: 2
tags: [knowledge-base, testing, agents, qa, integration]
---

# KNOW-138: Agent KB Integration Testing

## Follow-up Context

**Parent Story:** KNOW-043 (Lessons Learned Migration)

**Source:** QA Discovery Notes - Follow-up Story Suggestion #2

**Original Finding:** After migrating agents to write lessons to KB (KNOW-043), we need comprehensive testing to verify agents correctly use `kb_search` before tasks and `kb_add` to capture lessons. Without integration testing, we risk agents not adopting the KB-first workflow or misusing the KB tools.

**Category:** Enhancement Opportunity

**Impact:** High - Without testing, agent KB integration may fail silently, defeating the purpose of the migration

**Effort:** Medium - Requires test scenarios for multiple agent types and workflow patterns

## Context

KNOW-043 migrates lesson-learned content to the Knowledge Base and updates agent instructions to use KB tools (`kb_search` for reading, `kb_add` for writing). However, the parent story focuses on migration mechanics, not verifying that agents actually follow the new workflow correctly.

This story creates test scenarios to verify:
1. Agents query KB for relevant lessons before starting tasks
2. Agents write new lessons to KB (not markdown files)
3. Agents use appropriate tags, categories, and context when writing
4. Agents incorporate KB search results into decision-making

Without this testing, we have no confidence that the agent instruction changes from KNOW-043 are effective.

## Goal

Create comprehensive test scenarios to verify agents correctly integrate with the Knowledge Base for querying and writing lessons learned.

## Non-Goals

- **Not testing KB MCP server functionality** - Server tests exist in KNOW-003, KNOW-004, KNOW-0051
- **Not testing agent architecture changes** - Only testing behavior changes from instruction updates
- **Not creating automated test harness** - Manual test scenarios sufficient for MVP
- **Not testing all agent types** - Focus on leader agents (pm, dev, qa) that capture lessons

## Scope

### Packages Affected

- `.claude/agents/*.agent.md` - Agent instructions with KB integration (from KNOW-043)
- `apps/api/knowledge-base` - KB MCP server (used by test scenarios)

### Test Scenarios to Create

1. **Agent Read Tests** - Verify agents query KB before tasks
2. **Agent Write Tests** - Verify agents write lessons to KB
3. **Workflow Integration Tests** - Verify end-to-end agent workflows use KB
4. **Tag/Category Tests** - Verify appropriate metadata on KB writes

## Acceptance Criteria

### AC1: Agent Read Test Scenarios
- [ ] Test scenario: PM agent queries KB for lessons before elaborating story
- [ ] Test scenario: Dev agent queries KB for lessons before implementing feature
- [ ] Test scenario: QA agent queries KB for lessons before verification
- [ ] Each scenario includes expected query pattern (search terms, context)
- [ ] Each scenario includes validation criteria (results reviewed, applied)

### AC2: Agent Write Test Scenarios
- [ ] Test scenario: PM agent writes lesson after elaboration discovery
- [ ] Test scenario: Dev agent writes lesson after implementation challenge
- [ ] Test scenario: QA agent writes lesson after verification finding
- [ ] Each scenario validates lesson has required fields (content, tags, category)
- [ ] Each scenario validates lesson does NOT appear in LESSONS-LEARNED.md

### AC3: Tag and Category Validation
- [ ] Test scenarios verify lessons include `lesson-learned` tag
- [ ] Test scenarios verify lessons include agent-specific tag (e.g., `pm`, `dev`, `qa`)
- [ ] Test scenarios verify lessons include category tag (e.g., `debugging`, `architecture`)
- [ ] Test scenarios verify tags match KB tagging conventions

### AC4: Workflow Integration Tests
- [ ] End-to-end test: Agent queries KB → performs task → writes new lesson
- [ ] Test validates agent applies KB search results to task decisions
- [ ] Test validates new lesson is searchable via `kb_search` immediately after write
- [ ] Test validates no writes to LESSONS-LEARNED.md files

### AC5: Test Documentation
- [ ] Test scenarios documented in test plan with setup, action, expected result
- [ ] Test scenarios include example queries and expected KB responses
- [ ] Test scenarios include pass/fail criteria
- [ ] Test plan includes instructions for running tests manually

### AC6: Negative Test Cases
- [ ] Test scenario: Agent handles empty KB search results gracefully
- [ ] Test scenario: Agent handles KB service unavailable (fallback behavior)
- [ ] Test scenarios validate error handling and fallback workflows

## Architecture Notes

### Test Structure

```
Test Scenario: [Agent Type] [Action]
├── Setup: KB state, agent config, task context
├── Action: Agent performs task following instructions
├── Expected: KB queries, writes, and agent behavior
└── Validation: How to verify success/failure
```

### Example Test Scenario

```yaml
scenario: "PM Agent Queries KB Before Story Elaboration"
setup:
  - KB contains 3 lessons tagged "story-elaboration"
  - PM agent receives /elab-story command
  - Agent has KNOW-043 instruction updates
action:
  - PM agent starts elaboration task
  - Agent should query KB before analyzing story
expected:
  - kb_search called with query including "story elaboration" or "pm lessons"
  - Agent reviews top 3-5 results
  - Agent references applicable lessons in elaboration notes
validation:
  - Check agent output for KB query mention
  - Check elaboration notes reference lessons
  - Check lessons influence elaboration decisions
```

### Agent Workflows to Test

1. **PM Elaboration Workflow** - KNOW-043 parent workflow
2. **Dev Implementation Workflow** - Code implementation lessons
3. **QA Verification Workflow** - Testing and verification lessons

## Test Plan

### Happy Path Tests

#### Test 1: PM Agent Queries KB Before Elaboration
**Setup:**
- KB contains 3 lessons tagged `lesson-learned`, `pm`, `story-elaboration`
- PM agent receives `/elab-story` command
- Agent has updated instructions from KNOW-043

**Action:**
- PM agent starts story elaboration
- Monitor agent behavior for KB interaction

**Expected:**
- Agent calls `kb_search` with query related to story elaboration
- Agent reviews top 3-5 results
- Agent references applicable lessons in elaboration output

**Validation:**
- Agent output mentions KB query
- Elaboration notes reference specific lessons
- Decisions reflect lesson guidance

#### Test 2: Dev Agent Writes Lesson After Implementation
**Setup:**
- Dev agent completes feature implementation
- Agent encounters implementation challenge worth capturing
- Agent has updated instructions from KNOW-043

**Action:**
- Agent captures lesson learned
- Monitor KB writes

**Expected:**
- Agent calls `kb_add` with lesson content
- Lesson includes tags: `lesson-learned`, `dev`, `[category]`
- Lesson includes context about when lesson applies
- No write to `LESSONS-LEARNED.md`

**Validation:**
- Query KB for newly added lesson
- Verify lesson has required tags and category
- Verify `LESSONS-LEARNED.md` not modified
- Verify lesson is searchable

#### Test 3: QA Agent End-to-End Workflow
**Setup:**
- KB contains 2 QA-related lessons
- QA agent receives `/qa-verify` command
- Agent has updated instructions from KNOW-043

**Action:**
- QA agent performs verification workflow
- Agent queries KB, performs verification, writes new lesson

**Expected:**
- Agent queries KB for QA lessons before verification
- Agent performs verification informed by lessons
- Agent writes new lesson after discovering verification pattern
- New lesson is immediately searchable

**Validation:**
- Check agent queried KB (search for "qa" or "verification")
- Check verification approach reflects lesson guidance
- Check new lesson exists in KB with proper tags
- Check new lesson returns in subsequent `kb_search` calls

### Error Cases

#### Error 1: Empty KB Search Results
**Setup:** KB has no lessons matching agent query

**Expected:** Agent continues workflow without lessons, does not error

#### Error 2: KB Service Unavailable
**Setup:** KB MCP server not running

**Expected:** Agent logs warning, continues workflow with fallback behavior

## Risks / Edge Cases

1. **Agent instruction interpretation:** Agents may interpret KB integration instructions differently; tests must cover variations
2. **KB query relevance:** Agents may query with poor search terms; tests should validate query quality
3. **Tag inconsistency:** Agents may use different tag formats; tests should enforce conventions
4. **Fallback behavior:** When KB unavailable, agents should degrade gracefully, not fail

## Open Questions

1. **Should tests be automated or manual?** - Manual scenarios sufficient for MVP, automation in future story
2. **How many agent types to test?** - Focus on PM, Dev, QA leaders initially
3. **Should we test worker agents?** - Out of scope; KNOW-118 addresses worker patterns

---

## Related Stories

**Depends on:** KNOW-043 (Lessons Learned Migration) - Provides agent instruction updates to test

**Related:**
- KNOW-040 (Agent Instruction Integration) - Similar agent instruction patterns
- KNOW-118 (Worker Agent KB Integration Pattern) - Future work for worker agents

---

## Notes

- This story is **testing-focused**, not implementation
- Tests verify behavior changes from KNOW-043 instruction updates
- Manual test scenarios sufficient; automation can be future work
- Focus on leader agents (PM, Dev, QA) that capture most lessons

---

## Token Budget

| Phase | Input Tokens | Output Tokens | Total |
|-------|--------------|---------------|-------|
| Elaboration | — | — | — |
| Implementation | — | — | — |

(To be filled during execution)
