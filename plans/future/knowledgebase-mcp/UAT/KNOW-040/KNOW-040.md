---
story_id: KNOW-040
title: "Agent Instruction Integration"
status: uat
priority: P0
story_points: 5
created_at: "2026-01-25"
updated_at: "2026-01-31"
version: 2
depends_on: []
blocks: [KNOW-042]
epic: "Knowledge Base MCP Server"
---

# KNOW-040: Agent Instruction Integration

## Context

The Knowledge Base (KB) MCP server is now operational with search tools (KNOW-0052) and CRUD operations (KNOW-003). However, agents are not yet aware of the KB or instructed to use it. This story establishes the integration pattern by modifying agent instruction files to include KB search as a standard workflow step.

Currently, agents reason from their training data and task context alone. With KB integration, agents will query institutional knowledge before implementation, incorporating lessons learned, architectural decisions, and best practices from previous work.

This "KB-first" behavior ensures agents build on team knowledge rather than starting from scratch, reducing repeated mistakes and improving consistency.

## Goal

Ensure agents automatically query the KB for relevant context before performing tasks, establishing sustainable usage patterns that scale to new agents.

## Non-Goals

- Building automated KB query hooks (deferred to KNOW-042)
- Implementing query audit logging (separate story: KNOW-041)
- Modifying KB search API or adding new tools
- Creating advanced query optimization features
- Bulk-updating all agents in the system (focus on 5 core agents)

## Scope

### Packages Affected

None - this story modifies documentation only.

### Agent Files Modified

Minimum 5 agents (additional agents are stretch goals):

1. `.claude/agents/dev-implement-implementation-leader.agent.md`
2. `.claude/agents/dev-setup-leader.agent.md`
3. `.claude/agents/qa-verify-verification-leader.agent.md`
4. `.claude/agents/elab-analyst.agent.md`
5. `.claude/agents/dev-implement-learnings.agent.md`

### Documentation Created

- KB integration guide at `.claude/KB-AGENT-INTEGRATION.md` (co-located with agent files)
- Template KB integration section for future agents

### Infrastructure

None - agent instruction files are read at runtime, no deployment required.

## Acceptance Criteria

### AC1: Agent Files Include KB Integration

**Given** 5+ agent instruction files are identified for modification
**When** files are reviewed
**Then** each file contains a "Knowledge Base Integration" section with:
- When to query KB (task triggers based on agent workflow analysis)
- How to query (example patterns with concrete queries)
- How to apply results
- Fallback behavior if no results or KB unavailable

**Workflow analysis requirement:** Analyze each agent's execution flow to identify natural KB query injection points (e.g., after task receipt, before planning, when encountering ambiguity).

**Evidence:**
- Git diff showing new sections in all 5+ agent files
- Grep search confirming "Knowledge Base Integration" header in each file
- Consistent section structure across agents
- Trigger patterns align with agent workflow phases

### AC2: Trigger Patterns Documented

**Given** agent instruction files include KB integration
**When** trigger patterns section is reviewed
**Then** at least 3 task types per agent are documented with:
- Task type (e.g., bug fix, new feature, refactoring, testing, deployment)
- Query pattern template
- Concrete example query

**Minimum requirement:** 3 task type patterns per agent (regardless of agent type)

**Evidence:**
- Markdown table or list with task types, patterns, and examples
- Examples are concrete (not placeholders)
- Examples use realistic domain terms (drizzle, auth, deployment, etc.)

### AC3: Example Queries Provided

**Given** KB integration sections exist
**When** example queries are reviewed
**Then** each agent has 2-3 concrete kb_search examples demonstrating:
- Different query strings (specific, not generic)
- Different filter parameters (role, tags, limit)
- Valid syntax against kb_search schema

**Note:** Examples use pseudo-code format for readability (not literal MCP JSON syntax). Parameters must match kb_search schema.

**Evidence:**
- Code blocks with `kb_search({ ... })` pseudo-code syntax
- Examples reference actual domains (drizzle, auth, deployment, etc.)
- Examples use valid parameter names from kb_search schema

### AC4: Fallback Behavior Defined

**Given** KB integration sections exist
**When** fallback behavior documentation is reviewed
**Then** each agent instruction includes:
- Explicit guidance: "If no relevant results found, proceed with best judgment"
- Optional guidance: "Consider adding learnings to KB after task completion"
- Error handling: "If KB unavailable, log warning and continue"

**No hard requirement** that KB must return results for workflow to proceed.

**Evidence:**
- Text explicitly addressing zero-results case
- Text addressing KB unavailability scenario
- No blocking requirements on KB availability

### AC5: Pilot Story Integration Test

**Given** KB integration is complete
**When** pilot story workflow is executed using a modified agent
**Then:**
- Agent queries KB before implementation (logged)
- Agent reasoning references KB results
- Agent output cites KB sources using format: "Per KB entry {ID}: {summary}"
- Workflow completes successfully (no failures due to KB integration)

**Pilot story criteria:**
- 1-3 story points (small scope)
- Uses dev-implement-implementation-leader or similar agent
- Domain has at least 3 relevant KB entries (verified via kb_search before pilot execution)
- Workflow produces artifact where KB citations can be verified

**KB content verification (before pilot execution):**
- Query KB for entries matching pilot story domain
- Confirm ≥3 results exist with relevant content
- If <3 results, seed KB with sample entries or choose different pilot story

**KB citation validation (after pilot execution):**
- Extract all cited entry IDs from pilot artifact
- Verify each entry ID exists in KB via kb_get
- Confirm citations are contextually appropriate

**Evidence:**
- Agent execution log showing kb_search calls
- Story artifact (ELAB, IMPL, etc.) citing KB sources with entry IDs
- No workflow failures or blocking errors
- Query count is reasonable (1-3 per major step, not >10 total)
- All cited entry IDs validated

### AC6: KB Sources Cited in Agent Output

**Given** agent uses KB knowledge during task execution
**When** agent output is reviewed
**Then** KB sources are cited using consistent format:
- Format: "Per KB entry {ENTRY_ID}: {summary}"
- Or: "Based on KB entry '{title}' ({ENTRY_ID})"
- Entry ID included for traceability
- Citation at point of use (not just in summary)

**Evidence:**
- Pilot story artifact shows KB citations
- Citations include valid entry IDs
- Citations are contextually appropriate

### AC7: Integration Guide Created

**Given** KB integration pattern is established
**When** integration guide document is reviewed
**Then** document includes:
- Template KB integration section (copy-pasteable markdown)
- When to add KB integration (which agent types benefit)
- How to choose trigger patterns for agent domain (includes workflow analysis step)
- Testing checklist (3-5 items)
- KB citation format guidance
- Error handling patterns

**Evidence:**
- File exists at `.claude/KB-AGENT-INTEGRATION.md` (co-located with agent files)
- Template content can be copy-pasted
- Guide is comprehensive enough for future agent authors
- Workflow analysis guidance helps identify natural KB query injection points

### AC8: Section Placement Standardized

**Given** multiple agents have KB integration sections
**When** files are reviewed
**Then** all sections follow consistent placement:
- Placement rule determined by inspecting target agent structures first
- Recommended placement: After "Mission" or "Role" section, before "Inputs" or "Execution Flow"
- If agent structure differs, document placement as relative instruction (e.g., "after top-level context, before workflow details")
- Heading: "## Knowledge Base Integration"
- Consistent subheadings across all agents

**Evidence:**
- File structure review confirms consistent placement across all 5 agents
- Placement rule documented in integration guide
- No outliers or inconsistent formatting

### AC9: Character Limit Enforced

**Given** KB integration sections are added to agents
**When** character count is measured
**Then** entire "## Knowledge Base Integration" block (including all subsections) is ≤1500 characters per agent

**Rationale:** Prevent prompt bloat and maintain readability.

**Evidence:**
- Character count for entire KB integration block per agent file
- All sections meet limit

### AC10: Examples Validated Against KB Schema

**Given** example queries are included in agent instructions
**When** examples are parsed
**Then** all examples use valid parameters from kb_search schema:
- `query` (string, required)
- `role` (string, optional: "dev", "qa", "pm", etc.)
- `tags` (array, optional)
- `limit` (number, optional, default: 5)

**Note:** Examples use pseudo-code format but parameter names must be valid (no typos).

**Evidence:**
- Parameter names match kb_search schema from KNOW-003/KNOW-0052
- No typos in parameter names
- All required parameters present in examples

## Reuse Plan

**Not applicable** - this story modifies documentation only. No packages are created or modified.

## Architecture Notes

### KB-First Workflow Pattern

**Current workflow:**
```
Agent receives task → Reasons from training → Executes
```

**KB-integrated workflow:**
```
Agent receives task → Queries KB for relevant knowledge →
  Incorporates results → Reasons with context → Executes
```

### Query Timing Guidelines

Agents should query KB at these workflow points:
- **After receiving task, before reasoning/planning** - primary query point
- **Before making architectural decisions** - when multiple options exist
- **When encountering ambiguity** - domain-specific questions

Agents should **NOT** query KB:
- Continuously during execution (over-querying)
- Multiple times with minor query variations
- For every trivial decision

**Recommended frequency:**
- Leader agents: Query once at start, use results throughout
- Worker agents: Query before each major subtask (if applicable)

### KB Citation Pattern

When agents apply KB knowledge:
```markdown
Per KB entry kb_123 'Drizzle Migration Best Practices': Use transaction
wrappers for multi-table migrations to ensure atomicity.
```

Format: `Per KB entry {ENTRY_ID} '{title}': {how knowledge is applied}`

### Error Handling Pattern

If `kb_search` fails (MCP error, network timeout, etc.):
1. Log warning with error details
2. Proceed with workflow using fallback behavior
3. Do NOT block or fail the entire task
4. Include note in output: "KB unavailable, proceeded without institutional knowledge"

No retry logic required at agent level (MCP client handles retries).

### Fallback Behavior

If KB returns no results:
- Proceed with agent's best judgment from training data
- Log: "No relevant KB results found, proceeding with best judgment"
- Optionally note: "Consider adding learnings to KB after task completion"

## Infrastructure Notes

**Not applicable** - no infrastructure changes required.

Agent instruction files are read at runtime. Changes take effect immediately when agents are spawned. No deployment, migration, or service restart needed.

## HTTP Contract Plan

**Not applicable** - no API changes.

## Seed Requirements

**Not applicable** - no database changes.

## Test Plan

### Scope Summary

- **Endpoints touched:** None (documentation/agent instruction changes only)
- **UI touched:** No
- **Data/storage touched:** No

Testing focuses on verifying documentation changes and validating integration behavior with a pilot story.

### Happy Path Tests

#### Test 1: Agent Instruction Files Updated

**Setup:**
- List of target agent files identified (5 minimum)

**Action:**
- Read each agent file
- Verify presence of "Knowledge Base Integration" section

**Expected:**
- All 5+ agent files contain KB integration instructions
- Each includes: when to query, how to query, how to apply results, fallback behavior

**Evidence:**
- File diff showing new sections
- Grep search confirming "Knowledge Base Integration" header
- Section content matches template structure

#### Test 2: Trigger Patterns Documented

**Setup:**
- Open any modified agent file

**Action:**
- Locate trigger patterns section
- Verify task types and query patterns are documented

**Expected:**
- At least 3 task types per agent documented
- Each has query pattern and concrete example

**Evidence:**
- Markdown table or list with task types, patterns, examples
- Examples are concrete (not placeholders)

#### Test 3: Example Queries Provided

**Setup:**
- Review KB integration sections

**Action:**
- Count example kb_search queries
- Verify they demonstrate different use cases

**Expected:**
- Each agent has 2-3 concrete examples
- Examples use realistic query strings
- Examples show different filter parameters

**Evidence:**
- Code blocks with kb_search syntax
- Examples reference actual domains

#### Test 4: Fallback Behavior Defined

**Setup:**
- Read KB integration sections

**Action:**
- Find fallback behavior documentation

**Expected:**
- Clear instruction: "If no relevant results found, proceed with best judgment"
- Optional guidance: "Consider adding learnings after completion"

**Evidence:**
- Text explicitly addressing zero-results case
- No requirement that KB must return results

#### Test 5: Pilot Story Integration Test

**Setup:**
- Select simple story (1-3 points, domain has KB entries)

**Action:**
- Execute story workflow using modified agent
- Monitor for KB queries in logs
- Verify agent cites KB sources

**Expected:**
- Agent queries KB before implementation
- Agent output references KB entry IDs or titles
- Agent reasoning incorporates KB content
- Workflow completes successfully

**Evidence:**
- Agent log showing kb_search calls
- Story artifact citing KB sources
- No workflow failures

#### Test 6: Integration Guide Exists

**Setup:**
- Look for integration guide document

**Action:**
- Read documentation for adding KB to new agents

**Expected:**
- Document exists (e.g., `docs/KB-AGENT-INTEGRATION.md`)
- Contains: template section, when to add, how to choose patterns, testing checklist

**Evidence:**
- File path to integration guide
- Template content is copy-pasteable

### Error Cases

#### Error 1: Agent File Modification Conflicts

**Setup:** Concurrent changes to same agent file
**Action:** Attempt to merge KB integration
**Expected:** Git merge handles cleanly OR conflict is clearly marked
**Evidence:** Git status showing clean merge or well-formed conflict markers

#### Error 2: Invalid KB Query Syntax in Examples

**Setup:** Review example queries
**Action:** Parse example kb_search calls, validate against schema
**Expected:** All examples use valid parameters, no typos
**Evidence:** Schema validation passes, examples are executable

#### Error 3: Missing Integration in Required Agent

**Setup:** AC specifies 5+ agents
**Action:** Count agents with KB integration
**Expected:** All agents from "Agents to Modify" list are updated, count ≥ 5
**Evidence:** Checklist of 5 agents, all marked complete

### Edge Cases

#### Edge 1: Agent Instruction Length Limits

**Setup:** Measure total character count of modified files
**Action:** Compare to Claude context window limits
**Expected:** KB integration adds <2000 chars per agent, no file exceeds ~100KB
**Evidence:** File size comparison, no truncation warnings

#### Edge 2: Over-Querying Behavior

**Setup:** Pilot story with multiple implementation steps
**Action:** Count KB queries during execution
**Expected:** Agent queries KB 1-3 times per major step, not >10 queries total
**Evidence:** Query count log, reasonable volume

#### Edge 3: Empty KB Scenario

**Setup:** Test with empty or nearly-empty KB
**Action:** Execute agent workflow with no relevant KB entries
**Expected:** Agent proceeds with fallback, no errors, logs "No relevant KB results"
**Evidence:** Successful workflow completion, fallback message

#### Edge 4: KB Unavailable

**Setup:** Simulate KB service unavailable (MCP server down)
**Action:** Execute agent workflow
**Expected:** Agent handles unavailability gracefully, logs warning, workflow continues
**Evidence:** Workflow completes, warning message, no crash

### Required Tooling Evidence

#### Documentation Testing

**Required:**
1. Markdown validation: lint modified agent files, verify no broken links or malformed tables
2. Content review: human review for clarity, verify examples are copy-pasteable
3. Pilot story evidence: capture agent execution log showing KB queries, capture story artifact with KB citations

**Artifacts to capture:**
- Git diff of modified agent files
- Pilot story execution log (first 100 lines showing KB queries)
- Excerpt from pilot story artifact showing KB citation

### Risks to Call Out

**Risk 1: Agent Instruction Bloat**
Mitigation: Keep section concise (<1500 chars), monitor execution times

**Risk 2: Result Relevance**
Mitigation: Test with realistic queries, refine examples based on actual KB content

**Risk 3: Prompt Length Limits**
Mitigation: Limit KB search results (default: 5), use concise entry format

**Risk 4: Adoption Resistance**
Mitigation: Create clear integration guide, add to agent template/scaffold

**Risk 5: KB Evolution Breaking Queries**
Mitigation: Use stable kb_search API, version examples, link to schema docs

### Test Prerequisites

1. KB has sample content (10-20 entries across different roles)
2. MCP server running (KB tools available)
3. Agent execution environment with logging/tracing
4. Pilot story selected (small scope, domain has KB entries)

## UI/UX Notes

**Not applicable** - no UI changes. This story modifies agent instruction documentation only.

## Risk Register

### Risk 1: Agent Instruction Length Growth (P1, HIGH LIKELIHOOD)

**Impact:** Prompt length approaches context limits, affects performance

**Mitigation:**
- Enforce 1500 character limit per KB integration section
- Test with longest existing agent file
- Monitor agent execution times before/after

### Risk 2: Over-Querying / Performance Degradation (P1, MEDIUM LIKELIHOOD)

**Impact:** Excessive queries slow down workflows

**Mitigation:**
- Document recommended query frequency (1-3 per major step)
- Monitor pilot story query count
- Include guidance: don't re-query with minor variations

### Risk 3: Query Relevance / Noise (P2, MEDIUM LIKELIHOOD)

**Impact:** Irrelevant results waste agent time, wrong context applied

**Mitigation:**
- Test examples against actual KB content
- Document query best practices: be specific, use domain terms, filter by role
- Refine examples based on pilot story results

### Risk 4: KB Unavailability (P2, LOW LIKELIHOOD)

**Impact:** MCP server down blocks agent workflows

**Mitigation:**
- Implement graceful fallback: log warning and continue
- Test "KB Unavailable" edge case
- No hard requirement on KB availability

### Risk 5: Adoption Inconsistency (P3, MEDIUM LIKELIHOOD)

**Impact:** Future agents skip KB integration or copy-paste incorrectly

**Mitigation:**
- Create comprehensive integration guide
- Add KB integration to agent template
- Include checklist in agent review process

## Implementation Notes

### Required Agents (Minimum 5)

1. **dev-implement-implementation-leader.agent.md**
   - Trigger patterns: new feature, bug fix, refactoring, testing
   - Example: "drizzle migration patterns", "authentication architecture decision"

2. **dev-setup-leader.agent.md**
   - Trigger patterns: new feature, deployment, infrastructure
   - Example: "database setup best practices", "migration script patterns"

3. **qa-verify-verification-leader.agent.md**
   - Trigger patterns: testing, verification, edge cases
   - Example: "API test strategy", "E2E test patterns"

4. **elab-analyst.agent.md**
   - Trigger patterns: feature elaboration, requirements analysis
   - Example: "story elaboration patterns", "acceptance criteria templates"

5. **dev-implement-learnings.agent.md**
   - Trigger patterns: lessons learned, retrospective
   - Example: "retrospective patterns", "learning taxonomy"

### KB Integration Section Template

```markdown
## Knowledge Base Integration

Before starting tasks, query the knowledge base for relevant context:

### When to Query

Query KB when:
- Starting implementation (before planning)
- Making architectural decisions
- Encountering domain-specific questions

Do NOT query continuously or for trivial decisions.

### How to Query

Use kb_search with specific, domain-relevant queries:

**Example 1: Architecture Decision**
```javascript
kb_search({
  query: "authentication architecture decision",
  role: "dev",
  limit: 3
})
```

**Example 2: Implementation Pattern**
```javascript
kb_search({
  query: "drizzle migration patterns",
  tags: ["database", "migration"],
  limit: 5
})
```

**Example 3: Testing Strategy**
```javascript
kb_search({
  query: "API test strategy",
  role: "qa",
  limit: 3
})
```

### How to Apply Results

- Review top 3-5 results for relevance
- Cite KB sources in output: "Per KB entry {ID} '{title}': {application}"
- Incorporate learnings into approach

### Fallback Behavior

- If no relevant results: proceed with best judgment
- If KB unavailable: log warning, proceed with fallback
- Consider adding new learnings to KB after task completion
```

### Integration Guide Contents

**.claude/KB-AGENT-INTEGRATION.md**

1. Overview: Why integrate KB into agents
2. Template section (copy-pasteable)
3. When to add KB integration (agent types that benefit)
4. How to choose trigger patterns for agent domain (includes workflow analysis guidance)
5. Testing checklist:
   - Verify entire KB integration block is ≤1500 characters
   - Validate example queries use valid kb_search parameter names
   - Test with pilot task to confirm queries work
   - Verify fallback behavior handles empty results
   - Confirm citations are formatted correctly
6. KB citation format guidance
7. Error handling patterns
8. Maintenance: updating examples when KB API changes

## Completion Criteria

All acceptance criteria met (AC1-AC10), test plan executed with pilot story, integration guide created, no blockers identified.

## Related Stories

- **Depends on:** None (KB search tools already implemented in KNOW-0052)
- **Blocks:** KNOW-042 (KB-First Workflow Hooks - automates KB queries)
- **Related:** KNOW-041 (Query Audit Logging - tracks KB usage), KNOW-008 (Workflow Integration - partially superseded)

## Token Budget

TBD - will be tracked during implementation phase.

## Agent Log

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-01-25T10:00 | pm-story-generation-leader | Story generation initiated | KNOW-040.md |

---

---

## Revision History

### v2 - 2026-01-25

**PM Story Fix - Critical Issues Resolved**

Fixed all 10 QA elaboration issues to unblock implementation:

**Critical fixes:**
- Fixed agent file names: `dev-implementation-leader` → `dev-implement-implementation-leader`
- Fixed agent file names: `qa-verify-leader` → `qa-verify-verification-leader`
- Fixed agent file names: `learnings-recorder` → `dev-implement-learnings`
- Standardized integration guide location: `.claude/KB-AGENT-INTEGRATION.md`

**Clarity improvements:**
- Clarified AC3/AC10: examples use pseudo-code format, not literal MCP JSON
- Clarified AC9: character limit applies to entire KB integration block
- Simplified AC2: universal "3 patterns per agent" rule
- Updated AC8: flexible section placement based on actual agent structure

**Enhanced validation:**
- AC5: Added KB content verification step (≥3 entries before pilot)
- AC5: Added KB citation validation (verify cited entry IDs exist)
- AC1: Added workflow analysis requirement for trigger patterns
- AC7: Added workflow analysis guidance to integration guide

**Scope decisions:**
- Deferred gaps/enhancements to follow-up stories (KNOW-042, KNOW-040-WORKER)
- Maintained 5-point estimate for core scope
- Documented high-ROI enhancements for future consideration

All critical blockers resolved. Story ready for implementation phase.

---

## QA Discovery Notes (for PM Review)

_Added by QA Elaboration on 2026-01-31_

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | No template for new agent creation | Not Reviewed | Recommend adding to integration guide as future enhancement. Scope: deferred to follow-up stories. |
| 2 | No measurement of KB integration adoption | Not Reviewed | Covered by KNOW-041 (Query Audit Logging). Accept out-of-scope for this story. |
| 3 | No guidance for updating KB integration when KB evolves | Not Reviewed | Document as maintenance note in integration guide. Scope: deferred to KNOW-042 enhancements. |
| 4 | Query patterns don't cover all agent workflow phases | Not Reviewed | Current scope covers primary query point (after task receipt). Additional phases deferred. Accept for MVP. |
| 5 | No guidance for multi-step query refinement | Not Reviewed | Useful enhancement for future KB query best practices guide. Scope: deferred. |
| 6 | No examples of role-specific query filtering | Not Reviewed | Include in integration guide as best practice section. Part of scope for AC7. |
| 7 | Empty KB scenario not addressed | Not Reviewed | Covered by fallback behavior in AC4. Explicit coverage not needed. |
| 8 | Over-querying budget not defined | Not Reviewed | Covered by AC4 fallback guidance and Architecture Notes (1-3 queries per major step). Accept. |

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | KB query result caching in agent context | Not Reviewed | Defer to KNOW-042 enhancements (KB-First Workflow Hooks). High value, separate scope. |
| 2 | KB-driven decision trees | Not Reviewed | Defer to KNOW-043 or future. Requires structured KB content. Out of scope. |
| 3 | Automatic KB result relevance scoring | Not Reviewed | Defer to future. Adds agent reasoning step. Out of scope. |
| 4 | KB query templates per agent type | Not Reviewed | Recommend including in AC7 (integration guide). Low effort, high ROI. Evaluation: add to guide. |
| 5 | Integration test automation | Not Reviewed | Recommend for Phase 2 (after pilot story validation). Out of scope for KNOW-040. |
| 6 | KB result excerpting in citations | Not Reviewed | Minor UX enhancement. Defer to future. Out of scope. |
| 7 | KB query suggestions in agent prompts | Not Reviewed | Low priority. Defer. Out of scope. |
| 8 | KB integration verification script | Not Reviewed | Recommend for Phase 2 (after story deployment). High value for CI/CD. Defer. |
| 9 | KB-first workflow metrics dashboard | Not Reviewed | Defer to post-KNOW-041 implementation. Out of scope. |
| 10 | Contextual KB query expansion | Not Reviewed | Research feature. Defer. Out of scope. |

### Follow-up Stories Suggested

- [ ] **KNOW-042**: KB-First Workflow Hooks (automated KB query injection, query templates, test automation)
- [x] **KNOW-118**: Define KB integration pattern for worker agents (Gap #6)
- [ ] **KNOW-041**: Query Audit Logging (track KB usage for adoption metrics)
- [ ] **KNOW-043**: Advanced KB features (decision trees, embedding-based expansion)

### Items Marked Out-of-Scope

- **Enhancement #2-3, #6-7, #9-10**: Deferred to future stories or research phase. Accept.
- **Gap #2 (Adoption Measurement)**: Deferred to KNOW-041. Tracking separate from integration.
- **Gap #7 (Empty KB)**: Covered by existing fallback behavior. No special handling needed.
