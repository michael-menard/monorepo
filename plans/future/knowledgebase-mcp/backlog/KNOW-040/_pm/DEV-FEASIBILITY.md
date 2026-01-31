# Dev Feasibility: KNOW-040 Agent Instruction Integration

## Feasibility Summary

- **Feasible:** Yes
- **Confidence:** High
- **Why:** This is a documentation-only story involving modifications to existing agent markdown files. No code changes, no infrastructure changes, no deployment required. The work is straightforward file editing with clear acceptance criteria.

---

## Likely Change Surface

### Areas/Packages Impacted

- **Agent instruction files:** `.claude/agents/`
  - `dev-implementation-leader.agent.md`
  - `dev-setup-leader.agent.md`
  - `qa-verify-leader.agent.md`
  - `elab-analyst.agent.md`
  - `learnings-recorder.agent.md`
  - Potentially others for comprehensive coverage

- **Documentation:**
  - New integration guide (e.g., `docs/KB-AGENT-INTEGRATION.md` or section in existing docs)
  - Possibly README updates for agent authors

### Endpoints Impacted

**None** - documentation only.

### Migration/Deploy Touchpoints

**None** - agent instruction files are read at runtime, no deployment or migration required. Changes take effect immediately when agents are spawned.

---

## Risk Register

### Risk 1: Agent Instruction Length Growth

**Why it's risky:**
- Each agent file gains ~1000-2000 characters for KB integration section
- Combined with existing instructions, may approach model context limits
- Could impact agent performance or cause truncation

**Mitigation PM should bake into AC or testing plan:**
- Set maximum character budget for KB integration section (e.g., 1500 chars)
- Test with longest existing agent file to verify no context overflow
- Include "Agent Instruction Length Limits" edge case in test plan (already done)

### Risk 2: Over-Querying / Performance Degradation

**Why it's risky:**
- Agents may query KB excessively (multiple times per step)
- Each query adds latency (embedding + vector search)
- Could slow down workflows significantly

**Mitigation PM should bake into AC or testing plan:**
- Document recommended query frequency (1-3 times per major step)
- Add monitoring/logging for pilot story to measure actual query count
- Include fallback guidance: "If results not immediately relevant, don't re-query with minor variations"

### Risk 3: Query Relevance / Noise

**Why it's risky:**
- Broad or poorly-phrased queries may return irrelevant KB entries
- Agents may waste time parsing unhelpful results
- Could lead to applying wrong institutional knowledge

**Mitigation PM should bake into AC or testing plan:**
- Provide concrete example queries (not just patterns)
- Test examples against actual KB content to verify relevance
- Document query best practices: "Be specific. Use domain terms. Filter by role when possible."
- AC: "Example queries return relevant results when tested against KB"

### Risk 4: Adoption Inconsistency

**Why it's risky:**
- Future agent authors may skip KB integration
- Copy-paste without understanding, leading to incorrect trigger patterns
- Divergence from established patterns over time

**Mitigation PM should bake into AC or testing plan:**
- AC requires integration guide document
- Guide includes template section and checklist
- Consider adding KB integration to agent file template/scaffold
- Document when KB integration is optional vs. required

### Risk 5: KB Schema Evolution

**Why it's risky:**
- kb_search API may change in future stories (different parameters, filters)
- Examples in agent instructions become outdated
- Agents fail or behave incorrectly due to stale examples

**Mitigation PM should bake into AC or testing plan:**
- Use stable kb_search parameters (query, role, tags, limit) - already implemented in KNOW-0052
- Link to kb_search schema documentation in agent instructions
- Version examples with comment: "As of KNOW-0052 implementation"
- Add note: "If kb_search signature changes, update all agent examples"

### Risk 6: Empty KB / No Results Fallback

**Why it's risky:**
- Agents may block or fail if KB returns no results
- Early adoption when KB is sparsely populated
- Domain-specific agents may never find relevant entries

**Mitigation PM should bake into AC or testing plan:**
- AC explicitly requires fallback behavior documentation
- Test plan includes "Empty KB Scenario" edge case (already done)
- Agent instructions must state: "If no results, proceed with best judgment"
- No hard requirement that KB must return results

### Risk 7: Prompt Length Limits (KB Results + Instructions)

**Why it's risky:**
- KB search returns 5-10 entries, each with content
- Combined with agent instructions and task context, may exceed model limits
- Could cause truncation or performance degradation

**Mitigation PM should bake into AC or testing plan:**
- Set default limit: 5 results (already planned in AC)
- Use concise KB entry format (summary/title, not full content)
- Test with realistic KB search results to measure token usage
- Consider smaller limits (3 results) for agents with large instruction sets

### Risk 8: KB MCP Server Unavailability

**Why it's risky:**
- MCP server may be down or unreachable during agent execution
- Could block entire workflow if agents require KB
- No graceful degradation

**Mitigation PM should bake into AC or testing plan:**
- Test plan includes "KB Unavailable" edge case (already done)
- Agent instructions must handle MCP errors gracefully
- Fallback: log warning and proceed without KB
- AC: "Workflow completes successfully even if KB unavailable"

---

## Scope Tightening Suggestions (Non-breaking)

### Clarification 1: Define "5+ agents"

**Current AC:** "5+ agent files include KB integration instructions"

**Suggestion:** List the exact 5 agents to modify as minimum requirement. Additional agents are stretch goals.

**Concrete text for PM:**
```
Required agents (minimum 5):
1. dev-implementation-leader.agent.md
2. dev-setup-leader.agent.md
3. qa-verify-leader.agent.md
4. elab-analyst.agent.md
5. learnings-recorder.agent.md

Optional/future agents:
- pm-story-generation-leader.agent.md
- code-review-leader.agent.md
- Any new agents created in future stories
```

### Clarification 2: Integration Guide Scope

**Current AC:** "Documentation for adding KB integration to new agents"

**Suggestion:** Define minimum content for integration guide to avoid over-documentation.

**Concrete text for PM:**
```
Integration guide must include:
- Template KB integration section (copy-pasteable markdown)
- When to add KB integration (which agent types benefit)
- How to choose trigger patterns for agent domain
- Testing checklist (3-5 items)

Out of scope:
- Detailed KB architecture documentation (belongs in KB README)
- Advanced query optimization techniques
- Multi-KB or federated search patterns
```

### Clarification 3: Pilot Story Selection

**Current AC:** "Integration tested with pilot story"

**Suggestion:** Define criteria for pilot story to ensure meaningful test.

**Concrete text for PM:**
```
Pilot story criteria:
- 1-3 story points (small scope)
- Uses dev-implementation-leader or similar agent
- Domain has at least 3 relevant KB entries
- Not time-critical (may require iteration)
- Workflow produces artifact where KB citations can be verified

Example candidates: bug fix, small feature, documentation update
```

### Constraint 1: Limit KB Integration Section Length

**Why:** Prevent prompt bloat, maintain readability

**Concrete text for PM:**
```
KB integration section in each agent file:
- Maximum 1500 characters
- Use concise language
- Include 2-3 examples (not 10)
- Link to integration guide for details
```

### Constraint 2: Standardize Section Placement

**Why:** Consistency across agents, easier to find/maintain

**Concrete text for PM:**
```
KB integration section placement:
- After "Mission" section
- Before "Inputs" or "Execution Flow" section
- Use heading: "## Knowledge Base Integration"
- Use consistent subheadings across all agents
```

---

## Missing Requirements / Ambiguities

### Ambiguity 1: KB Citations Format

**What's unclear:** How should agents cite KB sources when using knowledge?

**Recommended decision text:**
```
When agents apply KB knowledge, they must cite sources using:
- Format: "Per KB entry {ENTRY_ID}: {summary}"
- Or: "Based on KB entry '{title}' ({ENTRY_ID})"
- Include entry ID for traceability
- Cite at point of use (not just in summary)

Example:
"Per KB entry kb_123 'Drizzle Migration Best Practices': Use transaction
wrappers for multi-table migrations to ensure atomicity."
```

### Ambiguity 2: Error Handling for MCP Failures

**What's unclear:** What should agents do if kb_search throws an error?

**Recommended decision text:**
```
If kb_search fails (MCP error, network timeout, etc.):
1. Log warning with error details
2. Proceed with workflow using fallback behavior
3. Do NOT block or fail the entire task
4. Include note in output: "KB unavailable, proceeded without institutional knowledge"

No retry logic required at agent level (MCP client handles retries).
```

### Ambiguity 3: Query Timing - When Exactly to Query

**What's unclear:** At what point in agent workflow should KB queries happen?

**Recommended decision text:**
```
Query KB at these workflow points:
- After receiving task, before reasoning/planning
- Before making architectural decisions
- When encountering ambiguity or multiple options
- NOT continuously during execution (avoid over-querying)

For leader agents: Query once at start, use results throughout
For worker agents: Query before each major subtask (if applicable)
```

### Ambiguity 4: Trigger Pattern Coverage

**What's unclear:** Must all 5 task types (bug fix, feature, refactoring, testing, deployment) be documented in every agent?

**Recommended decision text:**
```
Trigger patterns per agent:
- Include patterns relevant to agent's domain
- Dev agents: feature, refactoring, bug fix, testing (4 types)
- QA agents: testing, deployment (2 types minimum)
- PM agents: feature, refactoring (2 types minimum)
- All agents: at least 3 trigger patterns with examples

Not required: all 5 types in every agent file
```

---

## Evidence Expectations

### What proof/dev should capture:

1. **Git diff showing agent file modifications:**
   - All 5+ agents updated with KB integration section
   - Consistent section structure across agents
   - No malformed markdown

2. **Integration guide document:**
   - File path (e.g., `docs/KB-AGENT-INTEGRATION.md`)
   - Contains template section
   - Contains testing checklist

3. **Pilot story execution log:**
   - First 100 lines showing KB queries
   - Agent reasoning referencing KB results
   - KB citation format in use

4. **Pilot story artifact (ELAB, IMPL, etc.) excerpt:**
   - Shows KB citations in context
   - Entry IDs present and valid
   - Knowledge applied correctly

5. **Validation checks:**
   - Markdown lint passes on all modified files
   - No broken links in agent instructions
   - Example kb_search queries are syntactically valid

6. **Metrics (optional but recommended):**
   - Character count of KB integration sections (confirm <1500 each)
   - Pilot story query count (confirm reasonable volume)
   - Pilot story execution time comparison (before/after KB integration, if baseline exists)

### What might fail in CI/deploy:

**CI failures unlikely** - this is documentation only. Possible issues:

1. **Markdown linting:**
   - Broken links to integration guide
   - Malformed tables in trigger patterns
   - Inconsistent heading levels

2. **Git conflicts:**
   - Concurrent changes to same agent files
   - Merge conflicts if agents were recently modified

3. **Documentation build (if applicable):**
   - Integration guide not properly linked from docs index
   - Missing cross-references

**Deploy failures N/A** - no deployment required. Changes take effect immediately when agents spawn.

---

## Reuse Verification

**Not applicable** - this story does not create or modify code packages. It modifies documentation only.

No packages under `packages/**` are touched. No new utilities created.

---

## Complexity Assessment

**Overall complexity: LOW**

This is straightforward documentation work with clear deliverables:
- Modify 5 markdown files with consistent section additions
- Write 1 integration guide document
- Test with 1 pilot story

**No technical complexity:**
- No code implementation
- No database changes
- No API design
- No infrastructure setup
- No cross-package dependencies

**Risk is behavioral, not technical:**
- Will agents adopt KB querying behavior?
- Will query patterns be effective?
- Will this slow down workflows?

These risks are mitigated by pilot story testing and fallback behavior.

---

## Implementation Estimate

**Effort: 3-5 hours**

Breakdown:
1. Draft KB integration template section: 30 min
2. Modify 5 agent files with template: 1 hour (12 min per file)
3. Write integration guide: 1 hour
4. Select and run pilot story: 1-2 hours
5. Iterate based on pilot results: 30 min - 1 hour
6. Final validation and evidence capture: 30 min

**Story points: 5 (as specified in index) - seems generous for documentation work, but accounts for pilot testing and iteration.**

---

## Recommendations for PM

1. **Explicitly list the 5 required agents** in story file (not just AC)
2. **Define KB citation format** to ensure consistency
3. **Set character limit (1500 chars)** for KB integration sections
4. **Specify pilot story selection criteria** to ensure meaningful test
5. **Document error handling** for MCP failures
6. **Consider making this a prerequisite** for KNOW-041 (Query Audit Logging) - audit logs will show if agents are actually using KB

---

## No Blockers

All requirements are clear enough to proceed. No PM decision required to unblock.

If ambiguities arise during implementation, they can be resolved with reasonable defaults:
- Citation format: Use entry ID
- Error handling: Log and continue
- Query timing: Once at start
- Trigger patterns: Minimum 3 per agent, relevant to domain
