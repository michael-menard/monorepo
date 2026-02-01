# Test Plan: KNOW-040 Agent Instruction Integration

## Scope Summary

- **Endpoints touched:** None (documentation/agent instruction changes only)
- **UI touched:** No
- **Data/storage touched:** No

This story modifies agent instruction markdown files to include KB search patterns. Testing focuses on verifying the documentation changes and validating integration behavior with a pilot story.

---

## Happy Path Tests

### Test 1: Agent Instruction Files Updated

**Setup:**
- List of target agent files identified:
  - `.claude/agents/dev-implementation-leader.agent.md`
  - `.claude/agents/dev-setup-leader.agent.md`
  - `.claude/agents/qa-verify-leader.agent.md`
  - `.claude/agents/elab-analyst.agent.md`
  - `.claude/agents/learnings-recorder.agent.md`

**Action:**
- Read each agent file
- Verify presence of "Knowledge Base Integration" section

**Expected Outcome:**
- All 5+ agent files contain KB integration instructions
- Each includes:
  - When to query KB (task triggers)
  - How to query (example patterns)
  - How to apply results
  - Fallback behavior if no results

**Evidence:**
- File diff showing new sections added
- Grep search confirming "Knowledge Base Integration" header in each file
- Section content matches template structure

### Test 2: Trigger Patterns Documented

**Setup:**
- Open any modified agent file

**Action:**
- Locate trigger patterns section
- Verify task types and query patterns are documented

**Expected Outcome:**
- At least 5 task types documented:
  - Bug fix
  - New feature
  - Refactoring
  - Testing
  - Deployment
- Each has query pattern and example

**Evidence:**
- Markdown table or list with task types, patterns, and examples
- Examples are concrete (not placeholders)

### Test 3: Example Queries Provided

**Setup:**
- Review KB integration sections in modified agents

**Action:**
- Count example kb_search queries provided
- Verify they demonstrate different use cases

**Expected Outcome:**
- Each agent has 2-3 concrete examples
- Examples use realistic query strings
- Examples show different filter parameters (role, tags, limit)

**Evidence:**
- Code blocks with kb_search({ ... }) syntax
- Examples reference actual domains (drizzle, auth, deployment, etc.)

### Test 4: Fallback Behavior Defined

**Setup:**
- Read KB integration sections

**Action:**
- Find fallback behavior documentation
- Verify it covers "no results" scenario

**Expected Outcome:**
- Clear instruction: "If no relevant results found, proceed with best judgment"
- Optional guidance: "Consider adding learnings after task completion"

**Evidence:**
- Text explicitly addressing zero-results case
- No requirement that KB must return results to proceed

### Test 5: Pilot Story Integration Test

**Setup:**
- Select a simple story (e.g., bug fix or small feature)
- Ensure KB has relevant entries for the domain

**Action:**
- Execute story workflow using modified agent
- Monitor for KB queries in agent reasoning/logs
- Verify agent cites KB sources when applying knowledge

**Expected Outcome:**
- Agent queries KB before implementation
- Agent output references KB entry IDs or titles
- Agent reasoning incorporates KB content
- Workflow completes successfully

**Evidence:**
- Agent log/trace showing kb_search calls
- Story artifact (ELAB, IMPL, etc.) citing KB sources
- No workflow failures due to KB integration

### Test 6: Documentation for Future Integration

**Setup:**
- Look for integration guide document

**Action:**
- Read documentation for adding KB to new agents
- Verify it includes template sections

**Expected Outcome:**
- Document exists (e.g., `docs/KB-AGENT-INTEGRATION.md` or in README)
- Contains:
  - Template KB integration section
  - When to add KB integration
  - How to choose trigger patterns
  - Testing checklist

**Evidence:**
- File path to integration guide
- Template content can be copy-pasted

---

## Error Cases

### Error 1: Agent File Modification Conflicts

**Setup:**
- Concurrent changes to same agent file

**Action:**
- Attempt to merge KB integration with other agent updates

**Expected:**
- Git merge handles cleanly OR
- Conflict is clearly marked and resolvable

**Evidence:**
- Git status showing clean merge or well-formed conflict markers

### Error 2: Invalid KB Query Syntax in Examples

**Setup:**
- Review example queries in agent instructions

**Action:**
- Parse example kb_search calls
- Validate against kb_search schema (from KNOW-003/KNOW-0052)

**Expected:**
- All examples use valid parameters
- No typos in parameter names (query, role, tags, limit, etc.)

**Evidence:**
- Schema validation passes
- Examples could actually be executed

### Error 3: Missing Integration in Required Agent

**Setup:**
- Acceptance criteria specifies 5+ agents

**Action:**
- Count agents with KB integration
- Check if any required agent was skipped

**Expected:**
- All agents from "Agents to Modify" list are updated
- Count >= 5

**Evidence:**
- Checklist of 5 agents, all marked complete

---

## Edge Cases

### Edge 1: Agent Instruction Length Limits

**Setup:**
- Measure total character count of modified agent files

**Action:**
- Compare to Claude context window limits
- Check for prompt length warnings

**Expected:**
- KB integration adds <2000 characters per agent
- No agent file exceeds reasonable prompt size (~100KB)

**Evidence:**
- File size comparison (before/after)
- No truncation warnings in agent execution

### Edge 2: Over-Querying Behavior

**Setup:**
- Pilot story with multiple implementation steps

**Action:**
- Count KB queries during execution
- Look for duplicate or redundant queries

**Expected:**
- Agent queries KB 1-3 times per major step
- No excessive querying (>10 queries for simple story)

**Evidence:**
- Query count log
- Query audit log (if KNOW-041 complete) showing reasonable volume

### Edge 3: Empty KB Scenario

**Setup:**
- Test with empty or nearly-empty KB

**Action:**
- Execute agent workflow with no relevant KB entries

**Expected:**
- Agent proceeds with fallback behavior
- No errors or workflow failures
- Agent logs: "No relevant KB results, proceeding with best judgment"

**Evidence:**
- Successful workflow completion
- Agent output showing fallback message

### Edge 4: KB Unavailable

**Setup:**
- Simulate KB service unavailable (MCP server down)

**Action:**
- Execute agent workflow

**Expected:**
- Agent handles KB unavailability gracefully
- Fallback: proceeds without KB knowledge
- Warning logged but workflow continues

**Evidence:**
- Workflow completes
- Warning message about KB unavailability
- No crash or blocking error

---

## Required Tooling Evidence

### Backend

**Not applicable** - this story modifies documentation only.

If KNOW-041 (Query Audit Logging) is complete, optionally verify:
- `.http` request to query audit log endpoint
- Assert entries exist for pilot story queries
- Check agent_name field is populated

### Frontend

**Not applicable** - no UI changes.

### Documentation Testing

**Required:**
1. **Markdown validation:**
   - Run markdown linter on modified agent files
   - Verify no broken links or malformed tables

2. **Content review:**
   - Human review of integration sections for clarity
   - Verify examples are copy-pasteable

3. **Pilot story evidence:**
   - Capture agent execution log showing KB queries
   - Capture story artifact citing KB sources
   - Screenshot or snippet of KB integration in action

**Artifacts to capture:**
- Git diff of modified agent files
- Pilot story execution log (first 100 lines showing KB queries)
- Excerpt from pilot story artifact showing KB citation

---

## Risks to Call Out

### Risk 1: Agent Instruction Bloat

**Risk:** Adding KB integration to many agents increases prompt length, potentially affecting performance or hitting context limits.

**Mitigation:**
- Keep integration section concise (<1500 chars)
- Use collapsible sections if supported
- Monitor agent execution times before/after

### Risk 2: Result Relevance

**Risk:** KB searches return irrelevant results, causing agents to apply wrong context or waste time parsing useless data.

**Mitigation:**
- Test with realistic queries during pilot story
- Refine example queries based on actual KB content
- Document query pattern best practices (specific vs. broad)

### Risk 3: Prompt Length Limits

**Risk:** Combined size of agent instructions + KB integration + KB results exceeds model context window.

**Mitigation:**
- Limit KB search results (default limit: 5)
- Use concise KB entry format (summary only, not full content)
- Test with longest agent instruction file

### Risk 4: Adoption Resistance

**Risk:** Future agent authors skip KB integration or copy-paste without understanding.

**Mitigation:**
- Create clear integration guide
- Add KB integration to agent template/scaffold
- Include checklist in agent review process

### Risk 5: KB Evolution Breaking Queries

**Risk:** KB schema or search syntax changes in future stories, invalidating examples in agent instructions.

**Mitigation:**
- Use stable kb_search API contract
- Version KB search schema
- Update agent examples when KB API changes (link to KNOW-041 or schema docs)

---

## Test Prerequisites

1. **KB has sample content:**
   - At least 10-20 entries across different roles (dev, qa, pm)
   - Entries cover common domains (auth, deployment, testing, etc.)

2. **MCP server running:**
   - KB tools available (kb_search, kb_get)
   - No authentication errors

3. **Agent execution environment:**
   - Agents can be spawned/tested in isolation
   - Logging or tracing available to observe KB queries

4. **Pilot story selected:**
   - Small scope (1-3 story points)
   - Domain has relevant KB entries
   - Not time-sensitive (testing may take multiple attempts)

---

## Ambiguities / Questions for PM

**None** - scope is clear from index entry.

If any blocking issues arise during test plan execution:
- Write to `_pm/BLOCKERS.md`
- Signal PM for decision
